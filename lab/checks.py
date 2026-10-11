"""Finite integration batch; save full synthetic receipts per case for teaching."""

import asyncio
import json
import ssl
import time
from uuid import uuid4

import httpx2 as httpx

from lab.settings import API_PORT, CONTROL_PORT, RUNTIME


async def main():
    receipts = RUNTIME / "checks" / str(int(time.time()))
    receipts.mkdir(parents=True, exist_ok=True)
    report = []
    async with httpx.AsyncClient(base_url=f"http://127.0.0.1:{CONTROL_PORT}", trust_env=False) as controller:
        async def run(name, config, assertion, after_start=None):
            began = time.monotonic()
            try:
                response = await controller.post("/start", json=config)
                response.raise_for_status()
                if after_start:
                    await after_start()
                for _ in range(360):  # <=90 seconds; no unbounded test wait.
                    response = await controller.get("/state")
                    response.raise_for_status()
                    state = response.json()
                    if state["status"] == "finished":
                        break
                    await asyncio.sleep(0.25)
                else:
                    raise AssertionError("Run did not settle in 90 seconds")
                (receipts / f"{name}.json").write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
                assert all(info["state"] != "runtime_error" for info in state["lanes"].values()), state["lanes"]
                assertion(state)
                report.append({"case": name, "status": "PASS", "seconds": round(time.monotonic() - began, 2),
                               "run_id": state["run_id"], "receipt": f"{name}.json"})
            except Exception as error:
                report.append({"case": name, "status": "FAIL", "error": str(error)})
                await controller.post("/action/stop")
                raise

        def rows(state, lane):
            return [row for row in state["rows"] if row["lane"] == lane]

        def normal(state):
            for lane in ("baseline", "reliable"):
                assert [row["seq"] for row in rows(state, lane)] == [1, 2, 3]
                assert all(result["state"] == "confirmed" for result in state["lanes"][lane]["results"])
                assert state["lanes"][lane]["protocol"] == "2026-07-28"

        def lost_response(state):
            naive = rows(state, "baseline")
            reliable = rows(state, "reliable")
            assert len(naive) >= 2, "Baseline must expose repeated effects after losing a committed result"
            assert len(reliable) == 1, "Reliable retry must have exactly one effect"
            for lane in ("baseline", "reliable"):
                result = state["lanes"][lane]["results"][0]
                assert result["state"] == "confirmed" and result["attempts"] >= 2
                assert any(event.get("state") == "unknown" for event in state["traces"][lane])

        def request_block(state):
            for lane in ("baseline", "reliable"):
                assert len(rows(state, lane)) == 1
                assert state["lanes"][lane]["results"][0]["attempts"] >= 2

        def parent(state):
            for lane in ("baseline", "reliable"):
                records = rows(state, lane)
                assert [row["seq"] for row in records] == [1, 2, 3]
                assert all(row["parent_id"] == records[0]["id"] for row in records[1:])

        async def restore_after_outage():
            await asyncio.sleep(4)
            state = (await controller.get("/state")).json()
            assert not state["rows"], "No write should pass a full disconnect"
            await controller.post("/config", json={"probability": 0, "count": 3, "force": "normal", "persistent": True})

        def restored(state):
            assert [row["seq"] for row in rows(state, "reliable")] == [1, 2, 3]
            assert all(result["state"] == "confirmed" for result in state["lanes"]["reliable"]["results"])

        try:
            await run("normal", {"probability": 0, "count": 3, "force": "normal", "pace": 0}, normal)
            await run("lost-response", {"probability": 0, "count": 1, "force": "response", "duration": 4,
                                         "attempts": 5, "pace": 0}, lost_response)
            await run("blocked-request", {"probability": 0, "count": 1, "force": "request", "duration": 4,
                                           "attempts": 5, "pace": 0}, request_block)
            await run("parent-before-checklist", {"probability": 0, "count": 3, "force": "normal",
                                                  "parent_case": True, "pace": 0}, parent)
            await run("disconnect-and-restore", {"probability": 100, "count": 3, "force": "normal",
                                                  "persistent": True, "pace": 0}, restored, restore_after_outage)

            ssl_context = ssl.create_default_context(cafile=RUNTIME / "server.pem")
            async with httpx.AsyncClient(base_url=f"https://127.0.0.1:{API_PORT}", verify=ssl_context,
                                         trust_env=False) as api:
                run_id, intent_id, missing_parent = str(uuid4()), str(uuid4()), str(uuid4())
                payload = {"run_id": run_id, "intent_id": intent_id, "seq": 1, "title": "Task A", "lane": "reliable"}
                first = await api.post("/reliable/tasks", json=payload)
                second = await api.post("/reliable/tasks", json=payload)
                conflict = await api.post("/reliable/tasks", json={**payload, "title": "Different task"})
                orphan = await api.post("/reliable/tasks", json={**payload, "intent_id": str(uuid4()),
                                                                  "seq": 2, "parent_id": missing_parent})
                assert (first.status_code, second.status_code, conflict.status_code, orphan.status_code) == (201, 200, 409, 409)
                assert first.json()["id"] == second.json()["id"] == intent_id
                (receipts / "api-contract.json").write_text(json.dumps({
                    "first": first.json(), "replay": second.json(), "conflict": conflict.json(), "orphan": orphan.json(),
                }, indent=2), encoding="utf-8")
                report.append({"case": "api-replay-conflict-orphan", "status": "PASS", "receipt": "api-contract.json"})
        finally:
            (receipts / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
            print(json.dumps({"receipts": str(receipts), "cases": report}, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
