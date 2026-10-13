# Batch: payload walkthrough and demo clarity

Owner approved 2026-10-12. Canonical decisions: [project ledger](../decisions/project-ledger.md).

## Authority and order

Owner: "còn lại mình duyệt batch, ghi bền batch xuống ... B04 trước ... trong thời gian mình nghiệm thu B04 ... làm các thành phần batch khác".
Identity choice: **A**, overriding T1's recommendation B. Owner: "dưới code thì nó có, nó được dùng cho Lab ... với MCP thì nó không có ý nghĩa gì".

Technical interpretation: OFF still carries `intent_id` in the current wire for lab correlation; it has **no deduplication semantics** at the OFF API. Never claim the field is absent. ON uses the same field as a stable recovery key. Do not change the tool signature, key generation, DB schema or create API to alternative B.

Implement directly as T1; no delegation proposed or granted in this batch. Preserve existing dirty work and archived receipts. Local implementation is authorized; this is not a new publication/merge request.

**Execution order:** persist grant/decisions → B04 standalone prototype → give Owner its working URL → B01/B02/B03/B05 while review is pending. Owner approved B04's design on2026-10-12 ("duyệt B04"); integration into Journey is now authorized under D77. Prototype completion and Owner acceptance are separate states.

## Approved work

| Item | Scope | Acceptance |
|---|---|---|
| B01 | Presentation alternative A: distinguish lab correlation from the ON recovery key; keep raw evidence honest. | OFF never suggests API deduplication; metadata is optional in the main presentation. |
| B02 | Remove trace-click history navigation; add ±10 recorded events to Compare/Explain; label Agent, Bridge and API; explain configuration. | Selecting/clicking text leaves live/history cursor alone; step controls clamp per lane; full trace stays open. |
| B03 | Correct automatic latency removal; show actual applied schedule; distinguish immediate manual restore. | Do not shorten the declared latency window on automatic removal; verify with real proxy timing and a late-response run. |
| B04 | One self-contained HTML with outward/return and sequence alternatives, both policies, payloads and deterministic normal/request-blocked/lost-response/late-response stories. | Fits primary1920x1080 target; no live calls/benchmark claims; Owner can review independently. |
| B05 | Update concise contracts, learning notes and verification; retain decision and receipt locators. | Explanation matches code, including host-side dependencies and conditional completion. |

## Decisions carried into the implementation

- miAssura means the entire reliability mechanism: bridge policy, API contract and API enforcement. `recovery.py` is only its small retry loop.
- Two independent Agents/queues/MCP processes/HTTP clients/results. Shared controls broadcast actions; they do not synchronize progress. Both lanes may share the same retry source code without sharing its execution state.
- Baseline retains honest UNKNOWN/receipt validation/bounded retry. Its API creates a new row per POST; ON enforces stable ID/payload and replay after commit. The comparison includes server participation.
- Main presentation: commit with lost response; late response; persistent disconnect as a completion boundary. Normal/blocked-request cases may show equivalence. Do not manufacture a weak baseline.
- Assume local MCP/STDIO remains healthy during these network experiments. No LLM/reasoning error, production identity/auth or process crash research in this batch.
- Queue is RAM list/Event/serial worker in `lab/controller.py`, not an offline outbox. Parent/checklist dependency is explicitly orchestrated by the host; the bridge does not infer a DAG. Both lanes retain the parent barrier.
- Intent ID != JSON-RPC call ID != HTTP attempt != resource ID. Current host supplies IDs; do not depict the bridge as generating them under A.
- Receipt validity requires a matching post-commit API response. DB observation is for UI/measurement only; it never feeds recovery. `committed_at` is a row timestamp, not independent commit proof.
- Full trace remains vertically open and selectable. Compare/Explain retain1..100 tasks, retries, pace, separate lane histories and a fixed network frame.
- No offline outbox, durable crash recovery, update/delete semantics, global ordering or real Codex/microSched integration. No production reliability guarantee from local checks.

## Latency contract

`duration` is the episode's traffic window. For latency only, reserve an additional `delay_ms/1000` before automatic removal: **effective duration = duration + latency**, bounded by existing30s+10s limits. This protects data entering during the declared initial window; it does not promise full latency to all later traffic forever. Show window, latency and effective duration separately. Manual Restore/Stop may interrupt the episode and must be labelled accordingly.

Toxiproxy removal flushes held chunks. `max(duration, latency)` from setup alone is insufficient for chunks arriving late. Keep this limit explicit; do not claim byte-level observation or that every retry gets an exact fixed delay. Benchmark manifests and receipts use the new schedule, preserving old evidence as historical.

## Verification and handoff

Reuse unaffected core evidence; run core/Journey regressions, targeted schedule tests, real latency receipt/timing checks, trace/±10/UI-source smoke and1920x1080 prototype/live checks. Save synthetic raw receipts under ignored `.runtime/batch-20261012/`. No deletion/reseeding of old rows or logs. Freeze changed-source manifest once per batch, not per event.

Resume by reading this file, `docs/decisions/project-ledger.md`, `docs/lab-contract.md`, then current `git status`. Check live `/state` before any workload/restart. Do not infer approval from prototype viewing or compaction.

## Current status

- Grant and decision persistence: Owner approved; installed with the ledger before prototype/code work. Runtime acceptance is separate.
- B04: delivered at `/ui/prototypes/payload.html`; Full-HD smoke passed. Owner design accepted on2026-10-12 and integrated under D77.
- B01(A)/B02/B03/B05: installed after B04 handover. Core/schedule checks8/8, Journey model19/19, real integration6/6 and real latency checks2/2 passed. Browser checks cover trace neutrality, ±10, source/identity labels and both live views. See verification.md; Owner acceptance remains separate.
- Prototype integration into Journey: **COMPLETE UNDER D77**. Both layouts follow Journey's selected step/policy and share playback controls;23/23 model/payload checks passed.
- Owner presentation/device acceptance: pending separately from maintainer checks.
