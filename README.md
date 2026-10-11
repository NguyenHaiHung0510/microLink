# microLink

A local MCP/STDIO-to-HTTPS bridge. **miTrust** is its write-recovery mechanism.

The current implementation is a synthetic research lab. It is not yet connected
to a real microSched account or Codex session.

    Scripted Agent → MCP/STDIO → microLink → HTTPS proxy → API → PostgreSQL

## How miTrust works

1. Keep one intent ID and payload across retries.
2. Treat a missing or invalid receipt as **unknown**, not as a failed write.
3. Retry under an API contract that prevents repeated effects for the same ID.
4. Confirm a write before sending its dependent write.

The API must enforce a unique ID and return the matching record after commit.
A client-generated ID alone cannot make an arbitrary create API safe.

Read [the core](src/microlink/recovery.py) or [the explanation](docs/core-first.md).

## Run the lab on Windows

```powershell
powershell -File scripts/setup.ps1
powershell -File scripts/start.ps1
```

Open [the demo](http://127.0.0.1:19030). It shows one scripted Agent and two
microLink lanes: **miTrust off** and **miTrust on**. Adjust the Agent rate and
network faults live. Use **Compare** for the streams or **Explain** for the trace.

The comparison includes server support: the off lane creates a new record on each
POST; the on lane creates or replays the same ID. The proxy injects faults.
The database observer displays outcomes but never supplies answers to the bridge.

Setup downloads pinned local tools. The lab uses a separate PostgreSQL 18.6 cluster
on port 55432 and an explicit TLS certificate. It needs no Docker or OS trust change.

```powershell
powershell -File scripts/check.ps1
powershell -File scripts/stop.ps1
```

## Status and limits

Local policy, MCP/HTTPS integration and Agent-cadence checks pass.
See [verification](docs/verification.md) and the [pilot comparison](docs/benchmark-pilot.md).

Fault rates are synthetic. Retry budgets are finite. Permanent disconnection can
leave a write unknown; miTrust does not promise completion without connectivity.
Crash recovery, multi-client ordering and production integration are not verified.

[Contract](docs/lab-contract.md) · [Project decisions](docs/decisions/project-ledger.md)
