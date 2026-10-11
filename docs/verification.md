# Verification — 2026-10-11

This is lab evidence, not production readiness or independent acceptance.

| Layer | Attempted | Passed | Result |
|---|---:|---:|---|
| Focused policy assertions | 5 | 5 | PASS100% |
| Real MCP/HTTPS/PostgreSQL cases | 6 | 6 | PASS100% |
| Paired pilot benchmark | 4 pairs | 4 pairs completed | 48 intents/lane,3 baseline extra effects,0 reliable extra effects |
| Owned lab stop/start | 1 cycle | 1 | Existing PostgreSQL service retained |
| Agent cadence / pause / live speed | 2 | 2 | PASS100% after scheduler change |
| UI Compare / Explain smoke | 2 modes | 2 | Maintainer smoke PASS100%; both fit1366×768 |
| Real Codex / real microSched | 0 | 0 | NOT_RUN |
| Independent review / device matrix | 0 | 0 | NOT_RUN |

Real cases: normal3 writes, response lost after commit, request-direction blocking,
parent-before-checklist, full disconnect then restore, API replay/payload conflict/orphan rejection.

Observed versions: Python3.14.8, MCP2.3.0, protocol2026-07-28, PostgreSQL18.6,
Toxiproxy2.12.0. Verified TLS remains enabled; local CA is passed explicitly.

Receipts are synthetic local files in ignored .runtime/checks and .runtime/runs:
full MCP wire, HTTP attempt results, DB observer snapshots and configuration events.
Earlier failed startup/transport runs are retained locally. Normal smoke initially
failed at a STDIO tap context manager and output-schema mismatch; both repaired,
then normal and the complete real batch passed.

The pass counts prove the specified cases, not frequency of failures in real Wi-Fi
or unlimited exactly-once semantics. [Pilot numbers](benchmark-pilot.md) are exploratory;
no broad benchmark conclusions yet. Five unit checks, six integration cases and
the pilot are maintainer verification, not independent review.

## miTrust and three-panel update

The selected name is **miTrust**; both UI modes are retained. The scripted
Agent now releases the same intent ID to both lanes at a configurable interval.
Each lane consumes its own queue; retry does not speed up or slow down the Agent.

After the change,5/5 policy checks and6/6 real integration cases passed again.
Two Agent checks passed:1-second cadence measured1.007/1.020 seconds; pausing held
the issued count at1, and changing the interval to0.2s produced0.230/0.243s gaps.
Receipts: `.runtime/checks/1791727770` and `.runtime/agent-checks/1791727998`.

The desktop UI smoke used1366×768. Both modes displayed all three panels in the
viewport, including their footers, with no horizontal overflow. A live3-intent
response-loss run displayed6 baseline rows (3 extra) against3 reliable rows
(0 extra); both clients confirmed3 intents. A narrow sidebar stacks the panels.
Use a wide browser window or the fullscreen control for side-by-side presentation.

These are maintainer checks. Broad device/accessibility QA and final demo acceptance
remain outstanding. The earlier pilot numbers describe the earlier scheduler,
not a new benchmark of the paced Agent.
