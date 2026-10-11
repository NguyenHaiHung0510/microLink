"""Normal HTTPS API: no knowledge of fault scenarios or recovery-policy settings."""

import json
import time
from contextlib import asynccontextmanager
from uuid import UUID, uuid4

import asyncpg
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field

from lab.settings import DB, RUNTIME

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
  ordinal BIGINT GENERATED ALWAYS AS IDENTITY,
  run_id UUID NOT NULL, lane TEXT NOT NULL, id UUID NOT NULL,
  intent_id UUID NOT NULL, seq INTEGER NOT NULL, title TEXT NOT NULL,
  parent_id UUID, committed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (run_id, lane, id),
  FOREIGN KEY (run_id, lane, parent_id) REFERENCES tasks (run_id, lane, id)
);
"""


@asynccontextmanager
async def lifespan(app):
    app.state.pool = await asyncpg.create_pool(DB, min_size=1, max_size=4)
    async with app.state.pool.acquire() as connection:
        await connection.execute(SCHEMA)
    yield
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan)


class Task(BaseModel):
    run_id: UUID
    intent_id: UUID
    seq: int = Field(ge=1, le=100)
    title: str = Field(min_length=1, max_length=200)
    parent_id: UUID | None = None
    lane: str


@app.get("/health")
async def health():
    return {"ready": True}


@app.post("/{lane}/tasks")
async def create(lane: str, task: Task, response: Response):
    if lane not in ("baseline", "reliable") or lane != task.lane:
        raise HTTPException(400, "Invalid lane")
    entity_id = task.intent_id if lane == "reliable" else uuid4()
    try:
        async with app.state.pool.acquire() as connection:
            async with connection.transaction():
                row = await connection.fetchrow(
                    """INSERT INTO tasks(run_id,lane,id,intent_id,seq,title,parent_id)
                    VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING *""",
                    task.run_id, lane, entity_id, task.intent_id, task.seq, task.title, task.parent_id,
                )
                created = row is not None
                if row is None:
                    row = await connection.fetchrow(
                        "SELECT * FROM tasks WHERE run_id=$1 AND lane=$2 AND id=$3",
                        task.run_id, lane, entity_id,
                    )
                    if (row["seq"], row["title"], row["parent_id"]) != (task.seq, task.title, task.parent_id):
                        raise HTTPException(409, "Same ID with different payload")
        # Transaction exited successfully: only now can this API confirm the write.
    except asyncpg.ForeignKeyViolationError:
        raise HTTPException(409, "Parent is not present; create/confirm the parent first") from None
    result = {key: str(value) if isinstance(value, UUID) else value for key, value in dict(row).items()}
    result["committed_at"] = result["committed_at"].isoformat()
    result["created"] = created
    response.status_code = 201 if created else 200
    with (RUNTIME / "api-events.jsonl").open("a", encoding="utf-8") as events:
        events.write(json.dumps({"time": time.time(), "event": "commit" if created else "replay", **result}) + "\n")
    return result
