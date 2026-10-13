"""The declared latency window must survive automatic early flushing."""
import asyncio

from lab import faults as module


class Reply:
    def __init__(self, data=None):
        self.data = data or []

    def raise_for_status(self):
        pass

    def json(self):
        return self.data


class Proxy:
    def __init__(self):
        self.present = False
        self.removals = 0

    async def get(self, path):
        return Reply([{"name": "tc01-fault"}] if self.present else [])

    async def post(self, path, json):
        self.present = True
        return Reply()

    async def delete(self, path):
        self.present = False
        self.removals += 1
        return Reply()


def test_latency_timer_reserves_drain_then_clears_only_own_episode(monkeypatch):
    async def check():
        controller = module.Faults()
        await controller.client.aclose()
        proxy = Proxy()
        controller.client = proxy
        release = asyncio.Event()
        waits = []
        records = []
        original_sleep = asyncio.sleep

        async def controlled_sleep(seconds):
            waits.append(seconds)
            await release.wait()

        monkeypatch.setattr(module.asyncio, "sleep", controlled_sleep)
        monkeypatch.setattr(module, "record_fault", lambda *a, **k: records.append((a, k)))
        await controller.apply("baseline", "latency", duration=4, delay_ms=4500)
        task = controller.timers["baseline"]
        await original_sleep(0)
        assert waits == [8.5], "Would fail with the old4s expiry or max(4,4.5)"
        assert proxy.present and proxy.removals == 0
        assert controller.active["baseline"]["window_seconds"] == 4
        assert controller.active["baseline"]["applied_seconds"] == 8.5
        release.set()
        await task
        assert proxy.removals == 1 and not controller.active
        assert records[-1][1]["reason"] == "automatic_expiry"

    asyncio.run(check())


def test_manual_restore_can_interrupt_latency_and_records_reason(monkeypatch):
    async def check():
        controller = module.Faults()
        await controller.client.aclose()
        controller.client = Proxy()
        records = []
        monkeypatch.setattr(module, "record_fault", lambda *a, **k: records.append((a, k)))
        await controller.apply("reliable", "latency", duration=4, delay_ms=4500)
        task = controller.timers["reliable"]
        await controller.clear("reliable", reason="manual_restore")
        await asyncio.gather(task, return_exceptions=True)
        assert not controller.active and controller.client.removals == 1
        assert records[-1][1]["reason"] == "manual_restore"

    asyncio.run(check())


def test_non_latency_episode_keeps_its_declared_duration(monkeypatch):
    async def check():
        controller = module.Faults()
        await controller.client.aclose()
        controller.client = Proxy()
        monkeypatch.setattr(module, "record_fault", lambda *a, **k: None)
        await controller.apply("baseline", "response", duration=4, delay_ms=4500)
        assert controller.active["baseline"]["applied_seconds"] == 4
        await controller.clear("baseline")

    asyncio.run(check())
