"""Small repeated paired lab runs, with explicit exposures and bounded budgets."""

import asyncio
import json
import statistics
import time
from collections import Counter

import httpx2 as httpx

from lab.settings import CONTROL_PORT, RUNTIME


async def main():
    destination = RUNTIME / "benchmarks" / str(int(time.time()))
    destination.mkdir(parents=True, exist_ok=True)
    summaries = []
    async with httpx.AsyncClient(base_url=f"http://127.0.0.1:{CONTROL_PORT}", trust_env=False) as client:
        for probability, seed in [(0, 42), (30, 42), (30, 71), (50, 42)]:
            config = {"probability": probability, "seed": seed, "count": 12, "attempts": 5,
                      "force": "mixed", "duration": 4, "pace": 0}
            response = await client.post("/start", json=config)
            response.raise_for_status()
            began = time.monotonic()
            while time.monotonic() - began < 180:
                state = (await client.get("/state")).json()
                if state["status"] == "finished":
                    break
                await asyncio.sleep(0.5)
            else:
                await client.post("/action/stop")
                raise RuntimeError("Finite benchmark budget expired")
            path = destination / f"p{probability}-seed{seed}.json"
            path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
            for lane in ["baseline", "reliable"]:
                info = state["lanes"][lane]
                if info["state"] == "runtime_error":
                    raise RuntimeError(info["error"])
                rows = [row for row in state["rows"] if row["lane"] == lane]
                result = info["results"]
                effects = Counter(row["seq"] for row in rows)
                summaries.append({
                    "profile_probability": probability, "seed": seed, "lane": lane,
                    "planned_intents": 12, "completed_calls": len(result), "effects": len(rows),
                    "distinct_intents_with_effect": len(effects),
                    "extra_effects": sum(count - 1 for count in effects.values()),
                    "confirmed": sum(item["state"] == "confirmed" for item in result),
                    "unknown": sum(item["state"] == "unknown" for item in result),
                    "write_attempts": sum(item["attempts"] for item in result),
                    "mean_call_seconds": round(statistics.mean(item["elapsed_seconds"] for item in result), 3) if result else None,
                    "first_effect_sequence": list(effects), "run_id": state["run_id"], "receipt": path.name,
                })
            print(f"Completed probability={probability}, seed={seed}, run={state['run_id']}", flush=True)
    (destination / "summary.json").write_text(json.dumps(summaries, indent=2), encoding="utf-8")
    print(json.dumps({"destination": str(destination), "summaries": summaries}))


if __name__ == "__main__":
    asyncio.run(main())
