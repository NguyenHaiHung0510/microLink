"""Scripted MCP host + separate DB observer. The observer never feeds the bridge."""

import asyncio
import json
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import NAMESPACE_URL, UUID, uuid4, uuid5

import asyncpg
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from mcp import Client
from mcp.client.stdio import StdioServerParameters, stdio_client
from pydantic import BaseModel, Field, model_validator

from lab.faults import DEFAULT_WEIGHTS, Faults, pick_scenario
from lab.settings import DB, LANES, ROOT, RUNTIME


def append(path, event):
    with Path(path).open("a", encoding="utf-8") as output:
        output.write(json.dumps({"time": time.time(), **event}, ensure_ascii=False) + "\n")


class Tap:
    def __init__(self, stream, path, direction):
        self.stream, self.path, self.direction = stream, path, direction

    def __getattr__(self, name):
        return getattr(self.stream, name)

    def __aiter__(self):
        return self

    async def __aenter__(self):
        await self.stream.__aenter__()
        return self

    async def __aexit__(self, *exc):
        return await self.stream.__aexit__(*exc)

    async def __anext__(self):
        try:
            return await self.receive()
        except Exception as error:
            import anyio
            if isinstance(error, anyio.EndOfStream):
                raise StopAsyncIteration from error
            raise

    def record(self, message):
        body = message.message.model_dump(mode="json", by_alias=True, exclude_none=True)
        append(self.path, {"direction": self.direction, "message": body})

    async def receive(self):
        message = await self.stream.receive()
        if not isinstance(message, Exception):
            self.record(message)
        return message

    async def send(self, message):
        self.record(message)
        await self.stream.send(message)


@asynccontextmanager
async def logged_stdio(params, path, errlog):
    async with stdio_client(params, errlog=errlog) as (read, write):
        yield Tap(read, path, "server→client"), Tap(write, path, "client→server")


class Config(BaseModel):
    probability: float = Field(default=30, ge=0, le=100)
    weights: dict[str, float] = Field(default_factory=lambda: dict(DEFAULT_WEIGHTS))
    force: str = "mixed"
    count: int = Field(default=10, ge=1, le=100)
    attempts: int = Field(default=5, ge=1, le=250)
    persistent: bool = False
    seed: int = Field(default=42, ge=0, le=1000000)
    delay_ms: int = Field(default=1500, ge=0, le=10000)
    bandwidth_kb: int = Field(default=8, ge=1, le=10000)
    duration: float = Field(default=4, ge=0.1, le=30)
    pace: float = Field(default=1, ge=0, le=10)
    parent_case: bool = False

    @model_validator(mode="after")
    def valid_mix(self):
        if set(self.weights) != set(DEFAULT_WEIGHTS) or min(self.weights.values()) < 0 or sum(self.weights.values()) <= 0:
            raise ValueError("Weights must be nonnegative for all six fault groups, with positive total")
        if self.force not in ("mixed", "normal", *DEFAULT_WEIGHTS):
            raise ValueError("Unknown scenario")
        return self


state = {"status": "idle", "config": Config().model_dump(), "run_id": None,
         "agent": {"intents": [], "target": 0, "finished": True}, "lanes": {}, "rows": []}
# Restore only an observer snapshot. No MCP calls or retries resume at startup.
completed = list(RUNTIME.glob("run-*.json"))
if completed:
    try:
        saved = json.loads(max(completed, key=lambda path: path.stat().st_mtime).read_text(encoding="utf-8"))
        if saved["status"] == "finished":
            state.update({key: saved[key] for key in state})
            state["run_id"] = UUID(saved["run_id"])
    except (OSError, ValueError, KeyError):
        pass  # Incomplete diagnostic snapshots never start application work.
control_path = RUNTIME / "control.json"
faults = Faults()
run_task = None
plans = {}


def set_control(action):
    temporary = control_path.with_suffix(".tmp")
    temporary.write_text(json.dumps({"action": action}), encoding="utf-8")
    os.replace(temporary, control_path)


def control():
    return json.loads(control_path.read_text(encoding="utf-8"))["action"]


@asynccontextmanager
async def lifespan(app):
    set_control("stop")
    for attempt in range(20):
        try:
            await faults.setup()
            break
        except Exception:
            if attempt == 19:
                raise
            await asyncio.sleep(0.25)
    app.state.pool = await asyncpg.create_pool(DB, min_size=1, max_size=2)
    await faults.set_offline(state["config"]["probability"] == 100)
    yield
    set_control("stop")
    if run_task and not run_task.done():
        run_task.cancel()
    await faults.set_offline(False)
    await faults.client.aclose()
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan)
app.mount("/ui", StaticFiles(directory=ROOT / "lab/ui", html=True), name="ui")
TRACE_FILES = {"agent": "agent-events.jsonl", **{
    source: f"{source}-events.jsonl" for source in (*LANES, "server-baseline", "server-reliable")
}}


def recent_events(source, limit=25):
    path = RUNTIME / "runs" / str(state["run_id"]) / TRACE_FILES[source]
    if not path.exists():
        return []
    with path.open("rb") as stream:
        start = max(0, path.stat().st_size - 65536)
        stream.seek(start)
        lines = stream.read().decode("utf-8", errors="replace").splitlines()
    if start:
        lines = lines[1:]
    events = []
    for line in lines[-limit:]:
        try:
            events.append(json.loads(line))
        except ValueError:
            pass  # An append in progress is not a complete event.
    return events


@app.get("/")
async def index():
    return FileResponse(ROOT / "lab/ui/index.html")


@app.get("/state")
async def snapshot():
    if state["run_id"]:
        try:
            rows = await app.state.pool.fetch(
                "SELECT * FROM tasks WHERE run_id=$1 ORDER BY ordinal", state["run_id"],
            )
            state["rows"] = [{key: str(value) if key in ("run_id", "id", "intent_id", "parent_id", "committed_at")
                              and value is not None else value for key, value in dict(row).items()} for row in rows]
        except asyncpg.UndefinedTableError:
            state["rows"] = []
    counts = {name: 0 for name in ("normal", *DEFAULT_WEIGHTS, "outage")}
    for intent in state["agent"]["intents"]:
        if intent.get("scenario") in counts:
            counts[intent["scenario"]] += 1
    return {**state, "run_id": str(state["run_id"]) if state["run_id"] else None,
            "traces": {lane: recent_events(lane) for lane in LANES},
            "server_traces": {lane: recent_events(f"server-{lane}") for lane in LANES},
            "network": {"offline": faults.offline, "active": dict(faults.active), "assigned": counts,
                        "assigned_available": any("scenario" in item for item in state["agent"]["intents"])}}


@app.get("/trace/{lane}")
async def trace_page(lane: str, run_id: UUID | None = None,
                     offset: int = Query(default=0, ge=0), limit: int = Query(default=250, ge=1, le=500)):
    """Read the WHOLE history incrementally, including completed archived runs."""
    if lane not in TRACE_FILES:
        raise HTTPException(404, "Unknown trace source")
    selected_run = run_id or state["run_id"]
    path = RUNTIME / "runs" / str(selected_run) / TRACE_FILES[lane]
    if not path.exists():
        return {"run_id": str(selected_run), "events": [], "next_offset": 0, "more": False}
    events = []
    with path.open("rb") as stream:
        stream.seek(min(offset, path.stat().st_size))
        for _ in range(limit):
            position = stream.tell()
            line = stream.readline()
            if not line or not line.endswith(b"\n"):
                stream.seek(position)  # Retry a writer's incomplete last line later.
                break
            try:
                events.append({**json.loads(line), "trace_offset": position})
            except ValueError:
                events.append({"event": "trace_error", "reason": "Unreadable trace record",
                               "trace_offset": position})
        next_offset = stream.tell()
    return {"run_id": str(selected_run), "events": events, "next_offset": next_offset,
            "more": next_offset < path.stat().st_size}


@app.post("/config")
async def configure(config: Config):
    state["config"] = config.model_dump()
    # Explicit demo convention: slider 100 means full disconnect, not only slow requests.
    offline = config.probability == 100
    if offline != faults.offline or (config.probability == 0 and config.force in ("mixed", "normal")):
        await faults.set_offline(offline)
    if state["run_id"]:
        append(RUNTIME / "config-events.jsonl", {"run_id": str(state["run_id"]), "config": state["config"]})
    return state["config"]


def plan(seq):
    if seq not in plans:
        config = Config(**state["config"])
        scenario = config.force if config.force != "mixed" else pick_scenario(
            config.seed, seq, config.probability, config.weights,
        )
        plans[seq] = {"scenario": scenario, "duration": config.duration,
                      "delay_ms": config.delay_ms, "bandwidth_kb": config.bandwidth_kb}
    return plans[seq]


async def emit_intents(run_id, config, released, started):
    """One scripted Agent releases the same intent to both independent lanes."""
    try:
        for seq in range(1, config.count + 1):
            elapsed = 0.0
            previous = time.monotonic()
            while True:
                now = time.monotonic()
                action = control()
                if action == "stop" or now - started >= 1200:
                    return
                if action == "run":
                    elapsed += now - previous
                    if seq == 1 or elapsed >= state["config"]["pace"]:
                        break
                previous = now
                await asyncio.sleep(0.05)
            intent = {"event": "issued", "seq": seq, "intent_id": str(uuid5(NAMESPACE_URL, f"{run_id}:{seq}")),
                      "time": time.time()}
            intent["scenario"] = "outage" if faults.offline else plan(seq)["scenario"]
            plan(seq)  # Retain the actual frozen episode even during a full outage.
            state["agent"]["intents"].append(intent)
            append(RUNTIME / "runs" / str(run_id) / "agent-events.jsonl", intent)
            released[seq].set()
    finally:
        state["agent"]["finished"] = True
        for event in released.values():
            event.set()  # Wake consumers on Stop, including unreleased intents.


async def lane_run(lane, run_id, config, released, started):
    run_dir = RUNTIME / "runs" / str(run_id)
    run_dir.mkdir(parents=True, exist_ok=True)
    events = run_dir / f"{lane}-events.jsonl"
    events.write_text("", encoding="utf-8")
    wire = run_dir / f"{lane}-wire.jsonl"
    wire.write_text("", encoding="utf-8")
    stderr = (run_dir / f"{lane}-stderr.log").open("w", encoding="utf-8")
    params = StdioServerParameters(
        command=sys.executable, cwd=str(ROOT), args=["-m", "microlink.bridge",
            "--url", f"https://127.0.0.1:{LANES[lane]}", "--ca", str(RUNTIME / "server.pem"),
            "--lane", lane, "--events", str(events), "--control", str(control_path)],
        env={**os.environ, "PYTHONPATH": str(ROOT / "src") + os.pathsep + str(ROOT), "PYTHONUTF8": "1"},
    )
    info = state["lanes"][lane]
    parent_id = None
    try:
        async with Client(logged_stdio(params, wire, stderr), read_timeout_seconds=1205) as client:
            info["protocol"] = client.protocol_version
            if client.protocol_version != "2026-07-28":
                raise RuntimeError("Actual MCP protocol differs from approved primary")
            for seq in range(1, config.count + 1):
                info["state"] = "queued"
                await released[seq].wait()
                while control() == "pause" and time.monotonic() - started < 1200:
                    await asyncio.sleep(0.1)
                if control() == "stop" or seq > len(state["agent"]["intents"]):
                    break
                if time.monotonic() - started >= 1200:
                    info["state"] = "session_limit"
                    break
                # Clear only the owned lane for TLS warm-up. No write uses this setup path.
                if not faults.offline:
                    await faults.clear(lane)
                    result = await client.call_tool("warmup")
                    info["warmup"] = result.structured_content
                episode = plan(seq)
                healthy_now = state["config"]["probability"] == 0 and state["config"]["force"] in ("mixed", "normal")
                # A live restore overrides active/queued faults, not write results.
                await faults.apply(lane, **{**episode, "scenario": "normal" if healthy_now else episode["scenario"]})
                intent_id = state["agent"]["intents"][seq - 1]["intent_id"]
                operation = {"run_id": str(run_id), "intent_id": intent_id, "seq": seq,
                             "title": "Task A" if config.parent_case and seq == 1 else f"Task {seq}",
                             "parent_id": parent_id if config.parent_case and seq > 1 else None}
                info.update({"seq": seq, "state": "sending", "scenario": episode["scenario"]})
                limit = 250 if config.persistent else config.attempts
                answer = await client.call_tool("create_task", {
                    "operation": operation, "attempt_limit": limit,
                    "budget_seconds": max(0.1, 1200 - (time.monotonic() - started)),
                }, read_timeout_seconds=1205)
                result = answer.structured_content
                if not isinstance(result, dict) or "state" not in result:
                    raise RuntimeError(f"Invalid MCP tool result: {answer.content}")
                info["results"].append({"seq": seq, "intent_id": intent_id, **result})
                info["state"] = result["state"]
                if config.parent_case and seq == 1 and result["state"] == "confirmed":
                    parent_id = result["receipt"]["id"]
                if lane == "reliable" and result["state"] != "confirmed":
                    # The ordering barrier: no later write after an unresolved one.
                    break
                if config.parent_case and seq == 1 and parent_id is None:
                    break  # Do not create orphan children even in the baseline.
            if info["state"] == "queued":
                info["state"] = info["results"][-1]["state"] if info["results"] else "not_sent"
    except asyncio.CancelledError:
        info["state"] = "unknown"
        raise
    except Exception as error:
        import traceback
        with (run_dir / f"{lane}-runtime-error.log").open("a", encoding="utf-8") as log:
            traceback.print_exception(error, file=log)
        info["state"] = "runtime_error"
        info["error"] = f"{type(error).__name__}: {error}"
    finally:
        stderr.close()
        await faults.clear(lane)


async def run(config):
    run_id = uuid4()
    run_dir = RUNTIME / "runs" / str(run_id)
    run_dir.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    released = {seq: asyncio.Event() for seq in range(1, config.count + 1)}
    state.update({"status": "running", "run_id": run_id, "rows": [],
                  "agent": {"intents": [], "target": config.count, "finished": False}, "lanes": {
        lane: {"seq": 0, "state": "ready", "results": []} for lane in LANES
    }})
    plans.clear()
    set_control("run")
    append(RUNTIME / "config-events.jsonl", {"run_id": str(run_id), "initial_config": config.model_dump()})
    await asyncio.gather(emit_intents(run_id, config, released, started),
                         *(lane_run(lane, run_id, config, released, started) for lane in LANES))
    state["status"] = "finished"
    snapshot_result = await snapshot()
    (RUNTIME / f"run-{run_id}.json").write_text(json.dumps(snapshot_result, ensure_ascii=False, indent=2), encoding="utf-8")


@app.post("/start")
async def start(config: Config):
    global run_task
    if run_task and not run_task.done():
        raise HTTPException(409, "A run is already active; stop it first")
    await configure(config)
    run_task = asyncio.create_task(run(config))
    return {"started": True}


@app.post("/action/{action}")
async def action(action: str):
    if action not in ("pause", "run", "stop"):
        raise HTTPException(400, "Unknown action")
    if not run_task or run_task.done():
        raise HTTPException(409, "No active run; start a new run")
    set_control(action)
    state["status"] = {"pause": "paused", "run": "running", "stop": "stopping"}[action]
    return {"action": action}
