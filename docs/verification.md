# Verification — 2026-10-11

This is lab evidence, not production readiness or independent acceptance.

| Layer | Attempted | Passed | Result |
|---|---:|---:|---|
| Focused policy assertions | 5 | 5 | PASS100% |
| Real MCP/HTTPS/PostgreSQL cases | 6 | 6 | PASS100% |
| Paired pilot benchmark | 4 pairs | 4 pairs completed | 48 intents/lane,3 baseline extra effects,0 reliable extra effects |
| Owned lab stop/start | 1 cycle | 1 | Existing PostgreSQL service retained |
| Agent cadence / pause / live speed | 2 | 2 | PASS100% after scheduler change |
| Restore active and queued faults | 1 | 1 | PASS100%; cleared a30-second fault and settled in2.51s |
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

## miAssura and three-panel update

The selected name is **miAssura**; both UI modes are retained. The scripted
Agent now releases the same intent ID to both lanes at a configurable interval.
Each lane consumes its own queue; retry does not speed up or slow down the Agent.

After the change,5/5 policy checks and6/6 real integration cases passed again.
Two Agent checks passed:1-second cadence measured1.007/1.020 seconds; pausing held
the issued count at1, and changing the interval to0.2s produced0.230/0.243s gaps.
Final regression receipts: `.runtime/checks/1791728996` and
`.runtime/agent-checks/1791729016`. Restore receipt:
`.runtime/ui/restore-check.json`. All checks passed after the restore fix.

The desktop UI smoke used1366×768. Both modes displayed all three panels in the
viewport, including their footers, with no horizontal overflow. A live3-intent
response-loss run displayed6 baseline rows (3 extra) against3 reliable rows
(0 extra); both clients confirmed3 intents. A narrow sidebar stacks the panels.
Use a wide browser window or the fullscreen control for side-by-side presentation.

These are maintainer checks. Broad device/accessibility QA and final demo acceptance
remain outstanding. The earlier pilot numbers describe the earlier scheduler,
not a new benchmark of the paced Agent.
## Revised B preview — 2026-10-11

The selected Compare direction uses one common network-profile box, separate
bridge/server observations, three-line event windows and an openly displayed
vertical trace. Explain uses full chronological logs. These are synthetic fixtures;
the redesigned live UI and final Owner acceptance remain pending.

Maintainer smoke checked both 1280x720 and 1366x768: all main panels fit, without
horizontal overflow. In the response-loss walkthrough, both bridges were UNKNOWN
while each server had one row. Retry produced two rows with miAssura off and one
with it on; the latter server log showed replay. Previous-step and pause/resume
controls worked; all five compact windows had three rows. Sample configuration
applied 30 tasks and 7 total attempts. The bottom trace was visible without folding.
JavaScript syntax check passed.

An initial input/blur check did not update the fixture. An explicit Apply sample
button replaced that behavior and the 30-task/7-attempt check passed. Source and
receipt: lab/ui/prototypes/flow.js and ignored .runtime/miassura-review/prototype-b.json.
This smoke does not verify live faults, production behavior or a broad device matrix.

## B layout connected to the real lab — 2026-10-11

Owner authorized the live redesign. No teaching-core change was required.
Ruff and JavaScript syntax checks passed. Maintainer rerun: 5/5 policy checks,
6/6 MCP/HTTPS/DB cases and 2/2 Agent cadence/pause checks passed (100% in each batch).
Receipts: `.runtime/checks/1791734788` and `.runtime/agent-checks/1791734944`.

The real Explain response-loss run displayed UNKNOWN at the bridge while each
server had one row. After recovery: baseline 2 rows / 1 extra; reliable 1 row /
0 extra, with a server replay and matching bridge confirmation. Historical next/
previous used the recorded events; full trace stayed openly visible.

One real 100-intent stream used seed42, 30% mixed exposure, 4-second faults,
0.1-second Agent cadence and the finite long-retry mode. Both lanes confirmed100
intents. Baseline110 rows/10 extras; reliable100 rows/0 extras, in sequence1..100.
All1,352 paged trace events matched the five raw source files. See ignored
`.runtime/live-ui-smoke/mixed100-report.json` and the matching state/samples.
This is one measured stream, not a broad benchmark or real-world failure estimate.

The main100-task view fit1280x720 and1366x768 without horizontal overflow. Narrow
windows stack panels. The configured-percentage panel displayed70/10/5/6/6/2/1
for normal/latency/bandwidth/request/response/reset/partial at30% mixed exposure.
Assigned counts remained a separate column. Final Owner acceptance, independent
review and broader device/accessibility acceptance are not claimed.
