import asyncio

from microlink.recovery import ordered_writes, recover_write


def test_lost_response_retries_same_closed_over_intent():
    effects = {}
    calls = []
    intent_id = "stable-id"

    async def send():
        calls.append(intent_id)
        effects.setdefault(intent_id, "row")
        if len(calls) == 1:
            return {"state": "unknown", "reason": "response lost after commit"}
        return {"state": "confirmed", "receipt": effects[intent_id]}

    result = asyncio.run(recover_write(send, limit=3))
    assert result["state"] == "confirmed" and result["attempts"] == 2
    assert len(effects) == 1 and calls == [intent_id, intent_id]


def test_outage_preserves_unknown_and_is_bounded():
    async def send():
        return {"state": "unknown", "reason": "timeout"}

    result = asyncio.run(recover_write(send, limit=2))
    assert result["state"] == "unknown" and result["attempts"] == 2


def test_child_never_sent_when_parent_is_unknown():
    sent = []

    async def write(operation):
        sent.append(operation["id"])
        return {"state": "unknown"}

    asyncio.run(ordered_writes([{"id": "parent"}, {"id": "child"}], write))
    assert sent == ["parent"]


def test_rejection_is_not_retried():
    calls = []

    async def send():
        calls.append(1)
        return {"state": "rejected", "reason": "same ID/different payload"}

    result = asyncio.run(recover_write(send, limit=5))
    assert result["state"] == "rejected" and len(calls) == 1


def test_stop_before_send_does_not_claim_a_failed_write():
    async def send():
        raise AssertionError("must not be sent")

    result = asyncio.run(recover_write(send, control=lambda: "stop"))
    assert result["state"] == "not_sent" and result["attempts"] == 0
