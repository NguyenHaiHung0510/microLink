"""Independent TCP fault controller. It does not tell bridge/server the outcomes."""

import asyncio
import hashlib
import json
import random
import time

import httpx2 as httpx

from lab.settings import API_PORT, LANES, PROXY_CONTROL_PORT, RUNTIME

DEFAULT_WEIGHTS = {"latency": 10, "bandwidth": 5, "request": 6, "response": 6, "reset": 2, "partial": 1}


def applied_duration(scenario, duration, delay_ms):
    """Allow latency to drain beyond the declared initial traffic window.

    Toxiproxy removal flushes held chunks. This protects chunks entering in the
    initial window, not every chunk that enters during the extra drain period.
    """
    return duration + delay_ms / 1000 if scenario == "latency" else duration


def record_fault(lane, event, **details):
    with (RUNTIME / "fault-events.jsonl").open("a", encoding="utf-8") as output:
        output.write(json.dumps({"time": time.time(), "lane": lane, "event": event, **details}) + "\n")


def pick_scenario(seed: int, seq: int, probability: float, weights: dict) -> str:
    """Per logical-intent exposure, not Toxiproxy's per-connection toxicity."""
    digest = hashlib.sha256(f"{seed}:{seq}".encode()).digest()
    rng = random.Random(int.from_bytes(digest[:8]))
    if rng.random() * 100 >= probability:
        return "normal"
    names = list(weights)
    return rng.choices(names, weights=[weights[name] for name in names], k=1)[0]


class Faults:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=f"http://127.0.0.1:{PROXY_CONTROL_PORT}", trust_env=False)
        self.timers = {}
        self.offline = False
        self.active = {}

    async def setup(self):
        for lane, port in LANES.items():
            response = await self.client.post("/proxies", json={
                "name": f"tc01-{lane}", "listen": f"127.0.0.1:{port}",
                "upstream": f"127.0.0.1:{API_PORT}", "enabled": True,
            })
            if response.status_code not in (201, 409):
                response.raise_for_status()

    async def clear(self, lane, reason="manual_or_next_case"):
        timer = self.timers.pop(lane, None)
        if timer and timer is not asyncio.current_task():
            timer.cancel()
        path = f"/proxies/tc01-{lane}/toxics"
        response = await self.client.get(path)
        response.raise_for_status()
        for toxic in response.json():
            response = await self.client.delete(f"{path}/{toxic['name']}")
            response.raise_for_status()
        previous = self.active.pop(lane, None)
        if previous:
            record_fault(lane, "removed", reason=reason, fault=previous)

    async def set_offline(self, offline):
        self.offline = offline
        for lane in LANES:
            await self.clear(lane, reason='network_disconnect' if offline else 'network_restore')
            response = await self.client.post(f"/proxies/tc01-{lane}", json={"enabled": not offline})
            response.raise_for_status()

    async def apply(self, lane, scenario, duration=4.0, delay_ms=1500, bandwidth_kb=8):
        await self.clear(lane, reason='replace_episode')
        if self.offline or scenario == "normal":
            return
        settings = {
            "latency": ("latency", "downstream", {"latency": delay_ms, "jitter": 0}),
            "bandwidth": ("bandwidth", "downstream", {"rate": bandwidth_kb}),
            "request": ("timeout", "upstream", {"timeout": 0}),
            "response": ("timeout", "downstream", {"timeout": 0}),
            "reset": ("reset_peer", "downstream", {"timeout": 0}),
            "partial": ("limit_data", "downstream", {"bytes": 1}),
        }
        toxic_type, direction, attributes = settings[scenario]
        response = await self.client.post(f"/proxies/tc01-{lane}/toxics", json={
            "name": "tc01-fault", "type": toxic_type, "stream": direction,
            "toxicity": 1.0, "attributes": attributes,
        })
        response.raise_for_status()
        effective = applied_duration(scenario, duration, delay_ms)
        episode = {"scenario": scenario, "direction": direction, "started_at": time.time(),
                   "window_seconds": duration, "applied_seconds": effective,
                   "until": time.time() + effective, "attributes": attributes}
        self.active[lane] = episode
        record_fault(lane, "applied", fault=episode)

        async def expire():
            await asyncio.sleep(effective)
            if self.active.get(lane) is episode:
                await self.clear(lane, reason="automatic_expiry")

        self.timers[lane] = asyncio.create_task(expire())
