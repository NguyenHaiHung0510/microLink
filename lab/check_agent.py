"""Finite live checks: two Agent clocks, broadcast controls and isolated results."""

import asyncio
import json
import time

import httpx2 as httpx

from lab.faults import DEFAULT_WEIGHTS, pick_scenario
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
            gaps = {}
            for lane in ("baseline", "reliable"):
                intents = state["agents"][lane]["intents"]
                assert len(intents) == count
                results = state["lanes"][lane]["results"]
                assert [r["intent_id"] for r in results] == [i["intent_id"] for i in intents]
                assert all(r["state"] == "confirmed" for r in results)
                gaps[lane] = [b["time"] - a["time"] for a, b in zip(intents, intents[1:], strict=False)]
            assert not set(i["intent_id"] for i in state["agents"]["baseline"]["intents"]) & set(
                i["intent_id"] for i in state["agents"]["reliable"]["intents"]
            ), "Agent IDs must not be shared"
            (receipts / f"{name}.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
            return gaps, round(time.monotonic() - began, 2)

        async def pause_and_change_rate():
            for _ in range(30):
                state = await snapshot()
                if all(agent["intents"] for agent in state["agents"].values()):
                    break
                await asyncio.sleep(0.1)
            response = await client.post("/action/pause")
            response.raise_for_status()
            before = {lane: len(agent["intents"]) for lane, agent in (await snapshot())["agents"].items()}
            await asyncio.sleep(0.7)
            assert {lane: len(agent["intents"]) for lane, agent in (await snapshot())["agents"].items()} == before
            assert set(before.values()) == {1}
            config = (await snapshot())["config"]
            response = await client.post("/config", json={**config, "pace": 0.2})
            response.raise_for_status()
            response = await client.post("/action/run")
            response.raise_for_status()

        try:
            gaps, seconds = await run("one-second-cadence", 3, 1)
            assert all(0.95 <= gap <= 1.5 for values in gaps.values() for gap in values), gaps
            report.append({"case": "one-second-cadence", "status": "PASS", "gaps": gaps, "seconds": seconds})
            gaps, seconds = await run("pause-live-rate", 4, 5, pause_and_change_rate)
            assert all(values[0] >= 0.7 and all(0.18 <= gap <= 0.6 for gap in values[1:]) for values in gaps.values()), gaps
            report.append({"case": "pause-live-rate", "status": "PASS", "gaps": gaps, "seconds": seconds})

            # One branch loses its first response while the other branch completes.
            seed = next(seed for seed in range(1000)
                        if all(pick_scenario(seed * 2, seq, 30, DEFAULT_WEIGHTS) == "normal" for seq in (1, 2, 3))
                        and pick_scenario(seed * 2 + 1, 1, 30, DEFAULT_WEIGHTS) == "response")
            response = await client.post("/start", json={"count": 3, "pace": 0, "probability": 30,
                                                        "seed": seed, "duration": 6, "persistent": True})
            response.raise_for_status()
            observed = False
            for _ in range(450):
                state = await snapshot()
                if len(state["lanes"]["baseline"]["results"]) == 3 and not state["lanes"]["reliable"]["results"]:
                    observed = True
                    (receipts / "isolated-midrun.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
                if state["status"] == "finished":
                    break
                await asyncio.sleep(0.1)
            else:
                raise AssertionError("Isolation run did not settle within 45 seconds")
            assert observed, "A waiting reliable lane must not hold or borrow baseline results"
            for lane in ("baseline", "reliable"):
                own = {i["intent_id"] for i in state["agents"][lane]["intents"]}
                results = state["lanes"][lane]["results"]
                assert len(results) == 3 and all(r["state"] == "confirmed" and r["intent_id"] in own for r in results)
                assert all(row["intent_id"] in own for row in state["rows"] if row["lane"] == lane)
            assert state["lanes"]["reliable"]["results"][0]["attempts"] >= 2
            assert state["lanes"]["baseline"]["results"][0]["attempts"] == 1
            (receipts / "isolated-final.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
            report.append({"case": "independent-progress-and-receipts", "status": "PASS", "seed": seed,
                           "run_id": state["run_id"], "receipt": "isolated-final.json"})
        except Exception:
            await client.post("/action/stop")
            raise
        finally:
            (receipts / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
            print(json.dumps({"receipts": str(receipts), "cases": report}))


if __name__ == "__main__":
    asyncio.run(main())
