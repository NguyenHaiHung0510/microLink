# microLink decisions

Updated 2026-10-11. This record keeps accepted technical choices and open work.
Decision IDs remain stable. A selected design is not proof of runtime correctness.

## Scope

Build a small write-recovery core, a real MCP/STDIO-to-HTTPS adapter and an
independent synthetic lab. Real microSched integration is a later stage.
Keep transport, fault injection, observation and UI outside the recovery algorithm.

## Accepted decisions

| ID | Decision |
|---|---|
| D01 | TC01 studies and evaluates recovery of writes in an MCP/STDIO-to-HTTPS bridge. |
| D02 | Prioritize understanding, then reuse in microLink, then the course rubric. |
| D03 | Demonstrate a communication failure before presenting a solution. |
| D04 | Use real experiments and comparison, not animated outcomes. |
| D05 | Cover the outward command and returning result. Reads can support recovery. |
| D06 | Use a scripted Agent with real MCP calls and controllable demonstrations. |
| D07 | Keep the lab independent of real microSched business data. |
| D08 | Start with proxy/network faults. Defer local process faults. |
| D09 | Select relevant risks. Injected frequency is not a production statistic. |
| D10 | Preserve uncertainty when evidence is missing. |
| D11 | Compare recovery alternatives and state their preconditions. |
| D12 | Include receiving API support when the mechanism requires it. |
| D13 | Make the demo's states and outcomes explainable. |
| D14 | Explain need, communication, failures, alternatives, demo and implications. |
| D15 | Choose final measurements after learning, tooling and a pilot. |
| D16 | Start with scope and strategy before implementation detail. |
| D17 | Follow the agreed learning and experiment sequence. |
| D18 | Keep lessons understandable without the conversation history. |
| D19 | Choose the MCP version explicitly; an earlier course document is not binding. |
| D20 | Record protocol and dependency changes before adopting them. |
| D21 | Pin MCP2026-07-28, SDK2.3.0, Python3.14.8 and the lab dependencies. |
| D22 | Use a separate PostgreSQL18.6 lab cluster; preserve existing services/data. |
| D23 | Follow one write end to end, map failures, then build the baseline. |
| D24 | Retain the earlier three learning views A/B/C. |
| D25 | Separate completion of learning prototypes from implementation verification. |
| D26 | Select cases, establish a baseline, then compare mechanisms. |
| D27 | Numbered tasks are a selected demo workload under D32. |
| D28 | Include slow transfers and incomplete responses where useful; avoid exhaustive combinations. |
| D29 | Expect variable laptop networks. Product fault rates are unknown. |
| D30 | Recover the same intent. Independent incorrect Agent intentions are outside scope. |
| D31 | Correct client conclusions are assertions, not injected network faults. |
| D32 | Explain one operation first; use dual numbered streams for comparison. |
| D33 | Separate a frozen benchmark from a live adjustable demonstration. |
| D34 | Compare the complete bridge/API contract. Do not misrepresent existing microSched support. |
| D35 | Implement the standalone core and lab before production integration. |
| D36 | Default to5 total attempts. Long demo mode caps250/intent,100 intents and20 minutes, with Pause/Stop. |
| D37 | Confirm the parent before sending children. Reject orphan children; never invent a parent. |
| D38 | Keep reusable core, lab and technical docs in one public microLink repository. |
| D39 | Keep course lessons outside this repo; keep project decisions here. |
| D40 | Keep recovery.py small. Use normal engineering quality for transport and infrastructure. |
| D41 | Earlier UI selection was deferred; D42 supersedes that state. |
| D42 | Keep BOTH Compare and Explain. Show Agent and both servers in one desktop view; details below. Agent interval defaults to1s, adjustable0..10s live. |
| D43 | Both lanes use microLink. Only one applies the full recovery contract, including server support. |
| D44 | Name the recovery mechanism **miTrust**. Keep recovery.py as its code entry point. |
| D45 | Write short, clear reader documentation. Keep AI coordination details out of README. |

## Open work

| IDs | Status and next action |
|---|---|
| R01,R08,R10,R12,R14,R15,R26,R31 | Core explanation exists. Complete the walkthrough using actual receipts. |
| R02,R19,R21,R24 | Synthetic faults are implemented; production frequency is unknown. Select final benchmark profiles. |
| R03 | Stable-ID/replay candidate implemented. Compare alternatives and explain limits. |
| R04,R22,R27,R28 | Identity, evidence, retry and dependency contracts are implemented and tested. Server uniqueness remains a precondition. |
| R05,R17 | Synthetic task and parent/checklist cases implemented; production business integration deferred. |
| R06,R20,R23,R25,R33 | Both three-panel modes implemented and smoke-checked. Final presentation acceptance and broader benchmark remain open. |
| R07 | Process crash/restart durability deferred. |
| R09,R11,R13 | Pinned protocol observed on the wire; real Codex compatibility not verified. |
| R16 | Earlier learning prototypes retained separately from the live lab. |
| R18 | Standalone implementation complete; broader production work remains separate. |
| R29 | One core/lab/docs repo; runtime and course artifacts are excluded from publication. |
| R30 | Portable PostgreSQL runs directly on Windows; no Docker or global service upgrade. |
| R32 | Closed: miTrust selected under D44. |
| R34 | Short README prepared; detailed contracts and evidence are linked. |

## Current evidence

Five policy checks, six MCP/HTTPS/PostgreSQL cases and two Agent cadence/pause
checks passed. Both UI modes fit1366×768 in a desktop smoke. A three-intent
response-loss run produced6 rows without the full contract and3 rows with it.
Restoring the network clears active and queued faults; its focused live check passed.

The earlier four-pair pilot completed48 intents per lane:3 extra baseline effects,
0 reliable extra effects. It predates the independent Agent scheduler.

These checks do not prove production readiness. Crash durability, multi-client
ordering, broad device acceptance and real Codex/microSched integration remain open.
See [verification](../verification.md) and [the contract](../lab-contract.md).

The public repository is [NguyenHaiHung0510/microLink](https://github.com/NguyenHaiHung0510/microLink).
Local runtime, private history, certificates and course artifacts are excluded.
