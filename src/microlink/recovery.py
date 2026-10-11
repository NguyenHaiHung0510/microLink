"""The teaching core: retry one unchanged intent; never infer failure from timeout.

The API adapter supplies evidence, not database observer truth. Idempotency is an
API precondition: keeping an ID cannot help if the receiving API ignores that ID.
"""

import asyncio
import time
from collections.abc import Awaitable, Callable


async def recover_write(
    send_once: Callable[[], Awaitable[dict]],
    *,
    limit: int = 5,
    budget_seconds: float = 1200,
    control: Callable[[], str] = lambda: "run",
    emit: Callable[[dict], None] = lambda event: None,
) -> dict:
    """Return confirmed/rejected/unknown; repeat only the SAME logical operation.

    limit counts total attempts, not retries after the first attempt. Demo mode
    uses a larger explicit limit, plus Stop and a finite wall-clock budget.
    Pause waits between attempts; it cannot undo an already dispatched write.
    """
    if not 1 <= limit <= 250 or not 0 < budget_seconds <= 1200:
        raise ValueError("Attempt limit must be 1..250; budget must be 0..1200 seconds")
    started = time.monotonic()
    result = {"state": "not_sent", "reason": "No request dispatched"}
    attempts = 0
    for attempt in range(1, limit + 1):
        while control() == "pause" and time.monotonic() - started < budget_seconds:
            await asyncio.sleep(0.2)
        if control() == "stop" or time.monotonic() - started >= budget_seconds:
            break
        attempts = attempt
        emit({"event": "attempt", "attempt": attempt})
        # The adapter owns the bounded network timeout and validates the receipt.
        # It closes over one immutable ID/payload; the loop never regenerates it.
        result = await send_once()
        emit({"event": "result", "attempt": attempt, **result})
        if result["state"] in ("confirmed", "rejected"):
            break
        # UNKNOWN may mean not received, pending, or committed without a reply.
        # Retrying is safe ONLY because the adapter/server contract is idempotent.
        if attempt < limit:
            await asyncio.sleep(min(0.2 * attempt, 1.0))
    return {**result, "attempts": attempts, "elapsed_seconds": round(time.monotonic() - started, 3)}


async def ordered_writes(operations: list[dict], write: Callable[[dict], Awaitable[dict]]) -> list[dict]:
    """A tiny dependency barrier: do not submit n+1 until n is confirmed.

    This preserves this one stream, not unrelated concurrent streams. A parent
    task followed by its checklist is one real use case. UNKNOWN stops the stream.
    """
    results = []
    for operation in operations:
        result = await write(operation)
        results.append(result)
        if result["state"] != "confirmed":
            break
    return results
