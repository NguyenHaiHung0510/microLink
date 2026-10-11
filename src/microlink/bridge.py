"""MCP/STDIO adapter. HTTPS receipts are the only source of write confirmation."""

import argparse
import json
import ssl
import time
from pathlib import Path
from uuid import UUID

import httpx2 as httpx
from mcp.server import MCPServer
from pydantic import BaseModel

from microlink.recovery import recover_write

parser = argparse.ArgumentParser()
parser.add_argument("--url", required=True)
parser.add_argument("--ca", required=True)
parser.add_argument("--lane", choices=["baseline", "reliable"], required=True)
parser.add_argument("--events", required=True)
parser.add_argument("--control", required=True)
args = parser.parse_args()
context = ssl.create_default_context(cafile=args.ca)
client = httpx.AsyncClient(
    base_url=args.url,
    verify=context,
    trust_env=False,
    timeout=httpx.Timeout(3.0),
    limits=httpx.Limits(max_connections=1, max_keepalive_connections=1, keepalive_expiry=60),
)
server = MCPServer("microLink TC01", version="0.1.0", log_level="WARNING")


class Ready(BaseModel):
    ready: bool
    http_version: str | None = None
    error: str | None = None


class WriteResult(BaseModel):
    state: str
    attempts: int
    elapsed_seconds: float
    receipt: dict | None = None
    http_status: int | None = None
    reason: str | None = None


def log(event: dict) -> None:
    with Path(args.events).open("a", encoding="utf-8") as stream:
        stream.write(json.dumps({"time": time.time(), "lane": args.lane, **event}, ensure_ascii=False) + "\n")


def control() -> str:
    try:
        return json.loads(Path(args.control).read_text(encoding="utf-8"))["action"]
    except (OSError, ValueError, KeyError):
        return "stop"  # Missing lab control never starts uncontrolled retries.


@server.tool()
async def warmup() -> Ready:
    """Establish verified TLS before a directional application-stream experiment."""
    try:
        response = await client.get("/health")
        response.raise_for_status()
        return Ready(ready=True, http_version=response.http_version)
    except httpx.HTTPError as error:
        return Ready(ready=False, error=type(error).__name__)


@server.tool()
async def create_task(operation: dict, attempt_limit: int = 5, budget_seconds: float = 1200) -> WriteResult:
    """Create one task/checklist intent, preserving its ID across retries."""
    payload = json.loads(json.dumps(operation))  # Snapshot: no mutation between attempts.
    UUID(payload["intent_id"])
    UUID(payload["run_id"])
    payload["lane"] = args.lane

    async def send_once() -> dict:
        try:
            response = await client.post(f"/{args.lane}/tasks", json=payload)
            if response.status_code in (400, 409, 422):
                return {"state": "rejected", "reason": response.text[:500], "http_status": response.status_code}
            if not 200 <= response.status_code < 300:
                return {"state": "unknown", "reason": f"HTTP {response.status_code}"}
            row = response.json()
            expected = (payload["run_id"], payload["seq"], payload["title"], payload.get("parent_id"))
            actual = (row["run_id"], row["seq"], row["title"], row.get("parent_id"))
            if expected != actual or (args.lane == "reliable" and row["id"] != payload["intent_id"]):
                return {"state": "unknown", "reason": "Receipt does not match this intent"}
            return {"state": "confirmed", "receipt": row, "http_status": response.status_code}
        except (httpx.HTTPError, ValueError, KeyError) as error:
            return {"state": "unknown", "reason": type(error).__name__}

    result = await recover_write(
        send_once,
        limit=attempt_limit,
        budget_seconds=budget_seconds,
        control=control,
        emit=lambda event: log({"intent_id": payload["intent_id"], "seq": payload["seq"], **event}),
    )
    return WriteResult(**result)


if __name__ == "__main__":
    server.run(transport="stdio")
