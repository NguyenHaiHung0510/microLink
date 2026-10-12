# Verification — updated 2026-10-12

This is lab evidence, not production readiness or independent acceptance.

| Layer | Attempted | Passed | Result |
|---|---:|---:|---|
| Focused policy assertions | 5 | 5 | PASS100% |
| Real MCP/HTTPS/PostgreSQL cases | 6 | 6 | PASS100% |
| Paired pilot benchmark | 4 pairs | 4 pairs completed | 48 intents/lane,3 baseline extra effects,0 reliable extra effects |
| Owned lab stop/start | 1 cycle | 1 | Existing PostgreSQL service retained |
| Independent Agents / cadence / pause / live speed | 3 | 3 | PASS100%; includes isolated progress and scoped receipts |
| Restore active and queued faults | 1 | 1 | PASS100%; cleared a30-second fault and settled in2.51s |
| UI Compare / Explain smoke | 2 modes | 2 | Maintainer smoke; Compare100 fits1280×720 and1366×768; Explain shows full logs |
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

## Independent Agent/MCP lanes — 2026-10-12

Each lane now has its own emitter, intent IDs, queue, MCP session and result
collection. Common controls broadcast actions. Default fault draws are independent
under one profile; optional paired scenarios preserve benchmark comparability.
Earlier sections describe prior revisions, including the shared Agent.

Maintainer checks passed:5/5 policy,6/6 real integration and3/3 Agent cases (100%
in each batch). Receipts: `.runtime/checks/1791737261` and
`.runtime/agent-checks/1791737282`. In the isolation case, the off lane completed
three calls while the on lane had no confirmed result yet. Both later confirmed
their own IDs. Cadence and broadcast pause/live speed checks passed for both Agents.

Run8308772e-832e-444b-81bf-1410e15318a7 used100 intents per Agent,30% independent
mixed exposure, seed42,4-second faults and0.1-second cadence. Both confirmed100.
Off:110 rows/10 extras; on:100 rows/0 extras in1..100 order. Each used144 attempts;
equal totals did not imply equal fault selections or pooled replies. All1,433
events matched the six raw trace sources. Canonical receipt:
`.runtime/independent-lanes/mixed100-report.json` with its state and samples.

A second run checked the final100-node layout with shorter0.2-second faults and
500ms latency. It produced110/100 rows and112/117 attempts, with1,315 complete
trace events. Receipt: `.runtime/independent-lanes/layout100-report.json`.
The final Compare panels end at717px in1280×720 and761.1px in1366×768, with no
horizontal overflow or node cap. These are two distinct synthetic profiles;
do not combine them into one benchmark.

Explain's one-intent response-loss case showed2 off-lane rows versus1 on-lane row;
the latter returned the prior record. Both clients' full logs retained UNKNOWN
attempts and transport error reasons. Compact MCP logs now identify replay too.
History first/previous/next moved each lane's own event cursor. Current conditions
appeared inside the shared black box; equal conditions were grouped once.
JavaScript syntax, Ruff and diff-whitespace checks passed. Demo settings were
restored to1s/intent,30% exposure and4-second episodes after the checks.

The first final-layout check found a1px panel overflow at1280×720. Reducing the
row gap fixed it; the same completed dataset then passed without new writes.
An attempted0.05s UI interval was correctly rejected by the0.1s input step;
the layout run used0.1s. Synthetic failed attempts remain in local receipts.

The source manifest and first batch receipt are in
`.runtime/independent-lanes/ui-smoke-source.json` and `batch-receipt.json`.
Later client-log/layout-only changes were rechecked in the browser; they do not
change the recovery policy or invalidate the backend batch. This is maintainer
evidence. Independent review, production acceptance and a broad benchmark remain open.

## Shared live views and stable network frame — 2026-10-12

Four UI maintainer groups passed4/4 (100%): switching live views preserves the
task count/network profile; keyboard percentage input and validation; stable
healthy/disconnected network geometry; task contrast and desktop layout.
No recovery-policy or backend source changed in this update.

Run f9b5df62-e0a6-442d-8731-f82c406c8db2 started from Explain with100 tasks,
no faults and0.1s Agent cadence. Both independent lanes issued/confirmed100/100
and each server recorded100 rows. This control checks the count/start path; it
does not measure fault recovery. The four Compare panels each showed100 nodes,
ended at694px in a720px-high viewport and had no horizontal overflow.

Healthy and full-disconnect states kept the network box at190×266px, with both
76px lane slots present. The actual proxy offline flag was checked. Keyboard43%
reached the controller;101% displayed form validation. Task text/background
contrast ratios were8.22,7.25,6.48 and5.16 for issued/written/duplicate/waiting.
JavaScript syntax and diff-whitespace checks passed.

Private raw receipts are under `.runtime/shared-views-20261012/`, including the
source freeze, control state, batch receipt and screenshots. An initial in-app
automation fill did not dispatch change; normal typing/blur then passed. An
interrupted check stopped the owned lab; startup and state were checked before
continuing. The completed control and earlier interrupted run remain archived.

These are maintainer checks. Independent QA, projection/device acceptance and a
new fault benchmark were not run for this UI-only update. The separate Journey
previews are deterministic fixtures, not part of these network measurements.

The Journey layout smoke showed UNKNOWN with one row on each server; after
recovery, off had two rows and on retained one. Playback stopped at the final
frame; previous stepped back. Normal and blocked-request stories each confirmed
one row per lane. The flow and sequence panels ended at706px and712.6px in the
checked720px viewport, without horizontal overflow or console errors. This is
preview verification of three fixtures, not the proposed full case catalog.

After the live batch, active-condition labels were formatted as two short lines
inside their reserved slots. Syntax was rechecked; the count, probability and
healthy/disconnected geometry evidence above remains applicable. Long-label
projection acceptance remains open. The final source manifest preserves this
display-only difference from the initial freeze.
