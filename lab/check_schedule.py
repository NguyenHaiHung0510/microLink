"""Two finite real-proxy checks: full delay and post-commit retry/replay."""
import asyncio
import json
import math
import ssl
import time

import httpx2 as httpx

from lab.faults import Faults
from lab.settings import CONTROL_PORT, LANES, RUNTIME


async def main():
    folder = RUNTIME / "batch-20261012"
    folder.mkdir(parents=True, exist_ok=True)
    report = []
    context = ssl.create_default_context(cafile=RUNTIME / "server.pem")
    async with httpx.AsyncClient(base_url=f"http://127.0.0.1:{CONTROL_PORT}", trust_env=False) as host:
        state = (await host.get("/state")).json()
        assert state["status"] not in ("running", "paused", "stopping"), "Do not disturb an active run"
        await host.post("/config", json={"force": "normal", "probability": 0, "count": 1})
        faults = Faults()
        try:
            async with httpx.AsyncClient(base_url=f"https://127.0.0.1:{LANES['baseline']}",
                                         verify=context, timeout=10, trust_env=False) as api:
                (await api.get("/health")).raise_for_status()
                await faults.apply("baseline", "latency", duration=0.6, delay_ms=1200)
                episode = dict(faults.active["baseline"])
                began = time.monotonic()
                (await api.get("/health")).raise_for_status()
                elapsed = time.monotonic() - began
                assert elapsed >= 1.1, f"Latency was flushed early: {elapsed}"
                assert math.isclose(episode["applied_seconds"], 1.8)
                report.append({"case": "real-proxy-does-not-flush-at-window-end", "status": "PASS",
                               "seconds": elapsed, "episode": episode})
        finally:
            await faults.clear("baseline", reason="test_finished")
            await faults.client.aclose()

        response = await host.post("/start", json={"count": 1, "force": "latency", "probability": 0,
            "duration": 4, "delay_ms": 4500, "attempts": 12, "pace": 0, "paired_faults": True})
        response.raise_for_status()
        final = None
        observed = []
        for _ in range(240):
            state = (await host.get("/state")).json()
            if state["network"]["active"]:
                observed.append(state["network"]["active"])
            if state["status"] == "finished":
                final = state
                break
            await asyncio.sleep(0.25)
        (folder / "latency-run.json").write_text(json.dumps(final or state, indent=2), encoding="utf-8")
        if final is None:
            await host.post("/action/stop")
            raise AssertionError("Latency case did not settle within60s")
        assert observed and all(f["applied_seconds"] == 8.5 for o in observed for f in o.values())
        for lane in LANES:
            rows = [row for row in final["rows"] if row["lane"] == lane]
            result = final["lanes"][lane]["results"][0]
            assert result["state"] == "confirmed" and result["attempts"] >= 2
            assert any(e.get("state") == "unknown" for e in final["traces"][lane])
            assert len(rows) == 1 if lane == "reliable" else len(rows) >= 2
        report.append({"case": "late-response-real-mcp-https", "status": "PASS",
            "run_id": final["run_id"], "effects": {lane: len([r for r in final["rows"] if r["lane"] == lane]) for lane in LANES},
            "attempts": {lane: final["lanes"][lane]["results"][0]["attempts"] for lane in LANES}})
        (folder / "schedule-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        (RUNTIME / "batch-20261012" / f"schedule-failed-{time.time_ns()}.json").write_text(
            json.dumps({"status": "FAIL", "error": repr(error)}, indent=2), encoding="utf-8"
        )
        raise
