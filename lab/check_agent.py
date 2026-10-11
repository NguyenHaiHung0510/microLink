"""Two finite live checks: shared Agent cadence, and pause/live rate changes."""

import asyncio
import json
import time

import httpx2 as httpx

from lab.settings import CONTROL_PORT, RUNTIME


async def main():
    receipts = RUNTIME / "agent-checks" / str(int(time.time()))
    receipts.mkdir(parents=True, exist_ok=True)
    report = []
    async with httpx.AsyncClient(base_url=f"http://127.0.0.1:{CONTROL_PORT}", trust_env=False) as client:
        async def snapshot():
            response = await client.get("/state")
            response.raise_for_status()
            return response.json()

        async def run(name, count, pace, intervention=None):
            began = time.monotonic()
            response = await client.post("/start", json={"count": count, "pace": pace,
                                                        "probability": 0, "force": "normal"})
            response.raise_for_status()
            if intervention:
                await intervention()
            for _ in range(150):
                state = await snapshot()
                if state["status"] == "finished":
                    break
                await asyncio.sleep(0.1)
            else:
                raise AssertionError("Agent run did not settle within 15 seconds")
            intents = state["agent"]["intents"]
            assert len(intents) == count
            for lane in ("baseline", "reliable"):
                results = state["lanes"][lane]["results"]
                assert [r["intent_id"] for r in results] == [i["intent_id"] for i in intents]
                assert all(r["state"] == "confirmed" for r in results)
            gaps = [b["time"] - a["time"] for a, b in zip(intents, intents[1:], strict=False)]
            (receipts / f"{name}.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
            return gaps, round(time.monotonic() - began, 2)

        async def pause_and_change_rate():
            for _ in range(30):
                state = await snapshot()
                if state["agent"]["intents"]:
                    break
                await asyncio.sleep(0.1)
            response = await client.post("/action/pause")
            response.raise_for_status()
            before = len((await snapshot())["agent"]["intents"])
            await asyncio.sleep(0.7)
            assert len((await snapshot())["agent"]["intents"]) == before == 1
            config = (await snapshot())["config"]
            response = await client.post("/config", json={**config, "pace": 0.2})
            response.raise_for_status()
            response = await client.post("/action/run")
            response.raise_for_status()

        try:
            gaps, seconds = await run("one-second-cadence", 3, 1)
            assert all(0.95 <= gap <= 1.5 for gap in gaps), gaps
            report.append({"case": "one-second-cadence", "status": "PASS", "gaps": gaps, "seconds": seconds})
            gaps, seconds = await run("pause-live-rate", 4, 5, pause_and_change_rate)
            assert gaps[0] >= 0.7 and all(0.18 <= gap <= 0.6 for gap in gaps[1:]), gaps
            report.append({"case": "pause-live-rate", "status": "PASS", "gaps": gaps, "seconds": seconds})
        except Exception:
            await client.post("/action/stop")
            raise
        finally:
            (receipts / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
            print(json.dumps({"receipts": str(receipts), "cases": report}))


if __name__ == "__main__":
    asyncio.run(main())
