# microLink decisions

Updated 2026-10-12. This record keeps accepted technical choices and open work.
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
| D44 | Earlier name miTrust; superseded by D46. Keep recovery.py as the code entry point. |
| D45 | Write short, clear reader documentation. Keep AI coordination details out of README. |
| D46 | Rename the mechanism **miAssura**, with the motto **Reliability Through Uncertainty**. |
| D47 | Give the main UI to task nodes and communication; move detailed metrics/settings below. |
| D48 | Represent the network as an uncertainty black box with outward commands and returning results. Do not claim visibility into individual encrypted packets. |
| D49 | Keep full current-run trace, with compact text/symbols for distinct states. Build HTML alternatives before the visual redesign is selected. |
| D50 | Earlier Explain design used1–3 intents. The count restriction is superseded by D62. Controlled cases and policy on/off comparison remain useful; network injection stays at the proxy. |
| D51 | Select the B black-box direction for Compare. This selection does not settle the Explain layout or authorize replacing the live UI before the revised preview is reviewed. |
| D52 | Put bridge evidence and decisions on the Agent side. Server panels show received requests, writes/replays and response sending; they do not know whether a response reached the bridge. |
| D53 | Compare uses three-line event windows: prior event, highlighted current event and muted next planned action. Explain prints complete chronological logs. Keep full history below. |
| D54 | Use the live labels Compare and Explain without a fixed task count. Preserve configurable task count, total attempts, Agent pace and network settings. |
| D55 | One compact black box represents the common network profile for two independent lanes. Label endpoint counters as observations at the endpoints, not inside encrypted traffic. |
| D56 | Show full evidence/trace openly in vertical source columns; no folding, last-N cap or narrow internal scrollbar. |
| D57 | Owner explicitly authorized the B-based live redesign on 2026-10-11. This supersedes the D51 implementation hold. Add a live panel of configured fault-type percentages and assigned-intent counts. |
| D58 | Previous/next inspect chronological evidence from a real run; they never undo commits or claim to step encrypted packets. Pause/resume control future sends; in-flight work may still finish. |
| D59 | Owner explicitly requested and authorized two independent Agent/MCP streams. Each owns IDs, queues and results. Common controls broadcast actions without synchronizing progress. This replaces the shared Agent topology in D42. |
| D60 | Default live faults are drawn independently under the same profile. Retain optional paired per-task scenarios for controlled benchmark comparison; paired mode never pools responses or enforces lockstep. |
| D61 | Keep one network black box. Show actual active conditions inside, grouped only when equal. Remove repeated no-toxic text and the TCP/TLS subtitle. History controls advance each lane independently. |
| D62 | Compare and Explain are views of the same real run and configuration. Both accept1..100 tasks; changing views never changes the network profile. Larger task tiles apply only to small runs. |
| D63 | Task nodes need clear projection contrast: solid purple for issued, solid green for recorded, red with a repeat symbol for duplicates, and pale dashed placeholders. |
| D64 | The network box retains two lane slots and fixed geometry in normal/fault states. Change text and green/red state without adding/removing panels. This supersedes D61's grouping of equal active conditions. |
| D65 | Keep both the probability slider and a keyboard number input, synchronized within0..100. Preserve the lab's special100% full-disconnect control. |

| D66 | Owner approved the presentation Journey batch on 2026-10-12 and asked to continue. Use the recommended outward/return layout, eight case groups, independent ON/OFF model state, true model steps and visible evidence. Keep real streams separate; no backend/core/version changes. |

| D67 | Owner clarified that 1920x1080 is the primary UI design target, not an additional check. Use the screen for larger task nodes, current states and communication; secondary settings/full trace stay below. Retain the selected layouts and responsive fallback. |

## Open work

| IDs | Status and next action |
|---|---|
| R01,R08,R10,R12,R14,R15,R26,R31 | Core explanation exists. Complete the walkthrough using actual receipts. |
| R02,R19,R21,R24 | Synthetic faults are implemented; production frequency is unknown. Select final benchmark profiles. |
| R03 | Stable-ID/replay candidate implemented. Compare alternatives and explain limits. |
| R04,R22,R27,R28 | Identity, evidence, retry and dependency contracts are implemented and tested. Server uniqueness remains a precondition. |
| R05,R17 | Synthetic task and parent/checklist cases implemented; production business integration deferred. |
| R06,R20,R23,R25,R33 | Both views now show two independent client/server pairs. Maintainer smoke passed; final presentation acceptance and broader benchmark remain open. |
| R07 | Process crash/restart durability deferred. |
| R09,R11,R13 | Pinned protocol observed on the wire; real Codex compatibility not verified. |
| R16 | Earlier learning prototypes retained separately from the live lab. |
| R18 | Standalone implementation complete; broader production work remains separate. |
| R29 | One core/lab/docs repo; runtime and course artifacts are excluded from publication. |
| R30 | Portable PostgreSQL runs directly on Windows; no Docker or global service upgrade. |
| R32 | Name updated to miAssura under D46. |
| R34 | Short README prepared; detailed contracts and evidence are linked. |
| R35 | Rename/motto applied: miAssura — Reliability Through Uncertainty. |
| R36 | Detailed recovery/settings/metrics lesson prepared in the course workspace; learning acceptance remains separate. |
| R37 | Whole-trace reader and compact state display verified:280 baseline events and46 reliable events, matching the complete archived logs. |
| R38 | Network black-box representation accepted; animated UI must identify observation vs inference. |
| R39 | Controlled Explain presets are live. Request suppression, lost response and disconnect have runtime evidence; the late-response preset is implemented but not separately GUI-verified. Duplication is an observed outcome, not an injected server error. |
| R41 | Live UI now displays real three-line event windows and full Explain logs, with historical steps. A 100-intent mixed run confirmed both streams: 110 baseline rows / 100 reliable rows, 10 / 0 extra effects. |
| R40 | Owner approved live implementation under D57. B layout is live with endpoint logs, common network box and open full trace. Maintainer runtime smoke passed; final Owner demo acceptance remains pending. |
| R42 | Audit found separate MCP clients/processes and scoped replies already existed; shared emission and paired fault plans could explain identical counters/logs. D59–D61 implemented. New isolation, broadcast pause/rate changes and both UI views passed maintainer checks. Owner acceptance remains pending. |
| R43 | Owner reported the inconsistent three-task cap and accepted shared data across live views. D62 implemented and checked:100 tasks started from Explain and confirmed in each lane. Owner acceptance pending. |
| R44 | The approved Journey tab is implemented with eight story groups (ten timing branches), both policy paths, true model steps and full logs. Model checks passed 19/19; five maintainer browser groups passed 5/5. Owner presentation acceptance remains separate. See [the guide](../presentation-journey.md). |
| R45 | Owner requested stronger task-node contrast. D63 implemented; all four text/background pairs exceed4.5:1. Desktop maintainer smoke passed; projection acceptance is still Owner review. |
| R46 | Owner requested a fixed network frame with persistent lane states. D64 implemented; healthy/disconnected states kept identical190×266px geometry in the checked viewport. |
| R47 | Owner requested a numeric probability field beside the slider. D65 implemented; keyboard43% reached the backend,101% was rejected by the form. Restore and tab navigation checked. |

| R48 | Owner: "không phải kiểm tra thêm mà là UI phải tối ưu cho màn hình của mình". Full-HD styling implemented for Compare, Explain and Journey. Four desktop observations passed; main views fit with larger type. That update moved large-run logs below; D78 later supersedes the hiding and restores inline logs for every count. Owner visual acceptance remains pending. |

| R49 | Owner requested restoring the live lab and advice on core learning → presentation content → slides → Done. Live services restored; verified HTTPS API, controller, proxy and private PostgreSQL respond. No new workload run. T1 recommends learning the bridge/API contract with recovery.py, final evaluation evidence and rehearsal. This proposed sequence is not yet Owner-approved. |

## Current evidence

The 2026-10-12 UI-only update passed four maintainer groups: shared live-view
configuration, numeric probability controls, stable network layout, and task-node
contrast/layout. A no-fault100-task control started from Explain confirmed100
operations per lane with100 server rows each. This control verifies the UI count
path; it is not a fault-recovery benchmark. See [verification](../verification.md).

The Journey tab remains separate from those live receipts. Its model checks
passed 19/19 and five browser groups passed 5/5. Journey outcomes and the
earlier two previews are teaching fixtures, not measured network execution.

Five policy checks, six MCP/HTTPS/PostgreSQL cases and three Agent checks passed
after the independent-lane change. One lane completed three writes while the
other still waited on its first response; result IDs remained scoped to their Agent.
The 100-task Compare view fits1280×720 and1366×768. Explain displays full client
and server logs, including replay evidence. Restoring the network clears faults.

One independent 100-task run produced110 baseline rows/10 extras and100 reliable
rows/0 extras, with100 confirmations in each lane. A shorter fault profile used
for the final layout check produced112 baseline attempts and117 reliable attempts.
The earlier shared-emitter receipts remain historical evidence, not this topology.

The earlier four-pair pilot completed48 intents per lane:3 extra baseline effects,
0 reliable extra effects. It predates the independent Agent scheduler.

These checks do not prove production readiness. Crash durability, multi-client
ordering, broad device acceptance and real Codex/microSched integration remain open.
See [verification](../verification.md) and [the contract](../lab-contract.md).

The public repository is [NguyenHaiHung0510/microLink](https://github.com/NguyenHaiHung0510/microLink).
Local runtime, private history, certificates and course artifacts are excluded.

## Owner approval: payload and demo batch — 2026-10-12

Canonical batch: [payload and demo](../batches/2026-10-12-payload-and-demo.md).

Authority: Owner explicitly approved the remaining batch, selected A instead of B,
and requested durable decisions before implementation. This supersedes the earlier
implementation hold for B01–B05 only. No new delegation or publication is requested.

| ID | Accepted decision |
|---|---|
| D68 | miAssura means the complete reliability mechanism, including bridge policy, API contract and server enforcement. recovery.py is its small retry loop. |
| D69 | Select identity alternative **A**. OFF still carries the current ID for lab correlation; it has no API deduplication meaning. Keep code/wire honest; presentation may omit lab metadata. Do not implement B's tool/API/ID-generation redesign. Owner: "dưới code thì nó có, nó được dùng cho Lab ... với MCP thì nó không có ý nghĩa gì". |
| D70 | Approve B01(A), B02, B03, B04 and B05 exactly as scoped in the linked batch. Direct T1 implementation, no delegated implementation. Preserve dirty work, current service/data boundaries and historical evidence. |
| D71 | Persist this approval first, then build and hand over B04 before other batch implementation. While Owner reviews B04, continue B01/B02/B03/B05. Do not integrate the payload diagram into live Journey until Owner explicitly accepts the design. Viewing a prototype is not acceptance. |
| D72 | Main examples: commit with lost response, response arriving after the wait limit, and disconnect as a completion boundary. Equivalent normal/blocked-request cases remain useful; do not claim every adverse case proves superiority. |
| D73 | Assume local MCP/STDIO healthy for the Topic. Show sources clearly: Agent emits, Bridge sends/retries/validates, API receives/commits/replays. Two lanes use separate runtime state even when retry source code is the same. |
| D74 | Latency automatic removal must not truncate the declared initial traffic window. Use window plus latency before automatic removal, show the actual schedule and label manual restoration as an interruption. Limits and later-traffic caveat are in the batch; max(window, latency) alone is insufficient. |
| D75 | Clicking/selecting full trace must not change the history cursor. Add ±10 recorded-event controls in Compare/Explain; retain independent lane cursors, full open logs, configurable counts/retries and1920x1080 as the design target. |
| D76 | Explain current host-side queue/dependency orchestration accurately. Keep offline outbox/crash durability, new-call recovery identity, update/delete/global ordering, production auth and actual Codex/microSched integration outside this Topic batch. |

| Request | Current status and next action |
|---|---|
| R50 | Owner: "ghi bền các quyết định và batch xuống trước nhé rồi làm tiếp". Approval and decisions persisted here and in the linked batch before prototype implementation. |
| R51 | B04 approved preparation: one standalone payload HTML with outward/return and sequence alternatives. Delivered first at `/ui/prototypes/payload.html`, with outward/return and sequence alternatives. Full-HD maintainer smoke passed; Owner accepted B04 design under D77. |
| R52 | B01(A) approved: distinguish OFF lab correlation from ON recovery key in UI/docs; preserve existing wire/API/core. Implemented and checked after B04 handover; no alternative B identity redesign. |
| R53 | B02 approved: non-navigating trace selection, ±10 controls, explicit log sources and clearer settings. Implemented; live browser checked ±10, cursor clamping and trace-click neutrality. |
| R54 | B03 approved: correct latency schedule with actual-state display, manual interruption labels and real timing verification. Implemented; two real-proxy cases passed. Removal reasons distinguish automatic expiry, network restore and case replacement. |
| R55 | B05 approved: contract/lesson/verification updates installed with canonical evidence. Maintainer verification complete; Owner acceptance remains distinct. |

Next executor reads the batch, this ledger and lab-contract before editing.
The earlier integration hold was closed by D77 below; B04 is now integrated. No approvals
are inferred from silence, conversation compaction or passing maintainer checks.



## B04 design acceptance — 2026-10-12

Owner: "duyệt B04" after delivery of `/ui/prototypes/payload.html`.

| ID | Accepted decision |
|---|---|
| D77 | Owner accepted B04's payload design. Integrate its outward/return and sequence views into Journey below the main board and above full logs; follow Journey's selected scenario, policy and step. This closes D71's design hold for B04 only. |
| R56 | B04 design accepted and integrated into Journey. All eight groups use one model snapshot for main board, path, payload and logs. Model/payload checks23/23 and selected Full-HD browser smoke passed; final presentation/device acceptance remains separate. Keep the standalone preview available. This does not approve production integration, new dependencies, publication or unrelated UI redesign. |

## Explain restoration — 2026-10-13

Owner: "duyệt" the proposal to restore detailed Explain logs for all1..100 tasks.
The corrected target is Giải thích, not Đối chứng. Scope: [batch](../batches/2026-10-13-restore-explain.md).

| ID | Decision / state |
|---|---|
| D78 | Restore complete inline Agent/Bridge and API logs in Explain for every task count, including100. Allow vertical page growth; never hide logs solely to fit one Full-HD screen. This supersedes the2026-10-12 large-run inline-log hiding. Preserve shared data, independent lanes, black box and newer controls. |
| R57 | Explain restored for1..100 tasks.100-task maintainer control passed: four visible300-entry inline logs, no internal scroll cap, Compare remains compact, and10-event/trace-click checks passed. Existing Compare and Journey remain separate views. Owner visual acceptance remains pending. |


## Presentation preparation inquiry — 2026-10-13

Source: Owner chat2026-10-13, after Explain restoration; original wording:

> giả sử 12:30 mình sẽ rời nhà và đi, tiếp tới sẽ là gì nhỉ? Mình hôm qua đã học khá kỹ và về cơ bảm demo hiện tại có thể giải thích khá tự tin rồi. Nhưng slide chưa có. Tư vấn mình nào

| ID | Request / authority / state |
|---|---|
| R58 | Owner reports learning and confidence explaining the demo; slides are absent, tentative departure12:30 Asia/Saigon. Requests advice on remaining preparation. Advice and document capture authorized; no slide-production, code changes, benchmark or publication batch approved by this message. Status ANSWERED with T1 proposal below; not OWNER_SATISFIED or slide-production approved. Unresolved: final deck content/format and creation approval. |


T1 advice for R58 (2026-10-13, around09:08 Asia/Saigon): prioritize presentation
production and rehearsal in the remaining~3h22 before tentative12:30 departure.
Recommend9 main slides plus2 Q&A appendix slides, PPTX/PDF, speaker notes and one
demo script. Story: need→MCP/HTTPS path→TCP vs application outcome→lost response
and naive retry→alternative mechanisms→miAssura bridge/API contract→confirmation
and dependencies→current controlled evidence→limits and microLink implications.
Show one detailed lost-response journey, then real ON/OFF comparison; late
response or disconnect is a reserve case. Use receipts for the current mechanism,
not the older pre-independent-lane pilot as current benchmark evidence.

Suggested preparation milestones, not Owner decisions: content/draft by10:15,
deck exports by11:00, rehearsal/Q&A by11:45, artifact/runtime backup by12:00,
departure buffer12:00–12:30. Owner retains presentation-time allocation. Gist raw
requires technical slides and demo script; keep research comparison/evaluation
visible. No new code/network benchmark/slide creation authorized by this advice.
Proposed next grant: direct T1 prepares the stated deck/script using existing
synthetic evidence, Owner reviews content/visuals. No delegation or publication.


## Slide and submission corrections — 2026-10-13

Source: Owner response annotations on `msg_0d4d278c4c53ad59016acd92e814b487d0af7f2036c75a5d4d`, followed by submission-packaging request. Original selections/comments below are preserved verbatim; numbered by this message.

### R59 — annotation 1

Selected: Agent muốn dùng công cụ để ghi dữ liệu từ xa; microLink kết nối hai phía.

Owner comment:

Đúng hơn là mình có nhu cầu muốn Agent có thể kết nối tới website của mình -> microLink ra đời -> microLink là MCP, và nó là BTL -> microLink đi qua đường mạng bất định -> làm sao để đảm bảo tin cậy -> miAssura, chủ đề của chúng ta

Type: correction/requirement/question. Authority: record and advise; not slide-production or packaging implementation approval. State: CAPTURED.

### R60 — annotation 2

Selected: bridge

Owner comment:

và MCP server

Type: correction/requirement/question. Authority: record and advise; not slide-production or packaging implementation approval. State: CAPTURED.

### R61 — annotation 3

Selected: Agent → MCP client → STDIO → bridge → HTTPS → API → DB, rồi kết quả quay về.

Owner comment:

phải chỉ ra được chỗ nào là "chỗ bất định" đề tài này đang giải quyết. Chỉ ra những chỗ nào ngoài đề tài (giả định bình thường ví dụ MCP server không sập, STDIO local v.v)

Type: correction/requirement/question. Authority: record and advise; not slide-production or packaging implementation approval. State: CAPTURED.

### R62 — annotation 4

Selected: 3. TCP tin cậy, tại sao vẫn bất định?	Truyền byte tin cậy không đồng nghĩa client biết thao tác đã commit.

Owner comment:

[No comment; selection is context, not new approval.]

Type: correction/requirement/question. Authority: record and advise; not slide-production or packaging implementation approval. State: CAPTURED.

### R63 — annotation 5

Selected: 4. Tình huống cốt lõi	Server ghi xong, phản hồi không về; retry tạo thêm bản ghi. Chuyển sang Hành trình để minh họa.

Owner comment:

không chỉ tình huống này, mình còn muốn thể hiện đủ các trường hợp bất định, bao gồm cả những trường hợp miAssura thể hiện tác dụng tuyệt đối hoặc không. mình đang nghĩ trình bày đủ theo bảng này (

| Tình huống thực sự xảy ra                          | Retry cơ bản                       | miAssura                                       | Vai trò trong bài                             |
| -------------------------------------------------- | ---------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| Request không tới API; mạng sau đó phục hồi        | Có thể thành công, không ghi trùng | Tương tự                                       | Cho thấy retry cơ bản đã giải được một số lỗi |
| Kết nối ngắt trước khi API nhận đủ request         | Có thể thành công khi thử lại      | Tương tự                                       | Giải thích ảnh hưởng của **thời điểm ngắt**   |
| API đã commit nhưng phản hồi không về              | Retry có thể tạo bản ghi thứ hai   | Gửi lại cùng khóa; API trả bản ghi cũ          | **Ca chứng minh lợi ích chính**               |
| Phản hồi chậm nhưng vẫn nhận hợp lệ trong thời hạn | Thành công                         | Thành công                                     | Cho thấy mạng bất lợi chưa chắc gây lỗi       |
| Phản hồi quá hạn, API đã commit, bridge phải retry | Có nguy cơ ghi trùng               | Phục hồi bằng replay                           | Ca lợi ích thứ hai                            |
| Phản hồi truyền dở sau commit                      | Có nguy cơ ghi trùng khi retry     | Không xác nhận từ dữ liệu thiếu; retry an toàn | Kiểm tra bằng chứng                           |
| Mạng đứt xuyên suốt ngân sách retry                | Không hoàn tất                     | Cũng không hoàn tất                            | **Giới hạn của cơ chế**                       |

). Bạn có thể gợi ý tinh giản hoặc giữ nguyên, có thể tách làm 2 slide. Ý mình là thuyết trình xong về "TCP đảm bảo tin cậy nhưng tại sao vẫn có bất định?' -> Các trường hợp có thể ảnh hưởng tới luồng làm việc của MCP

Type: correction/requirement/question. Authority: record and advise; not slide-production or packaging implementation approval. State: CAPTURED.

### R64 — annotation 6

Selected: 5. Những cách xử lý có thể chọn	Không retry; retry thông thường; retry với định danh/replay; tra cứu kết quả. Nêu đánh đổi và điều kiện.

Owner comment:

Hmm cái này có vẻ... không có trong cái mình đã học. Nghĩa là mình khi xây dựng miAssura thì đi thẳng từ vấn đề (là các trường hợp bất định) tới giải pháp miAssura luôn mà không có bước lựa chọn cách xử lý và xem xét trade-off này. T1 thấy thế nào? Có nên tình bày không nhỉ?

Type: correction/requirement/question. Authority: record and advise; not slide-production or packaging implementation approval. State: CAPTURED.

### R65 — annotation 7

Selected: 6. miAssura hoạt động thế nào?	Giữ ID/payload, API chống tác dụng lặp, trả receipt sau commit, bridge kiểm trước khi xác nhận.

Owner comment:

trước hết cần định nghĩa miAssura như thế nào trước, nó là tập hợp các thủ tục hay sự phối hợp giữa nhiều thành phần MCP, server v.v hay cái gì khác. và mình rất thích cách diễn đạt này (**7. miAssura có quá đơn giản không? Đã bao phủ đủ bất định chưa? Có bảo đảm cho microLink thật không?**

**Lõi hiện tại nhỏ là tốt; nhưng “thêm ID là xong” thì chưa đúng.** Bảo đảm phụ thuộc cả chuỗi:

1. **Giữ cùng khóa và payload** qua mọi retry của một thao tác.
2. **API chống tác dụng lặp bằng cơ chế atomic**, không kiểm tồn tại rồi insert bằng hai bước dễ tranh chấp.
3. **Cùng khóa nhưng payload khác phải bị từ chối.**
4. **Receipt chỉ được trả sau commit**, và bridge kiểm receipt trước khi xác nhận.
5. **Thiếu bằng chứng giữ UNKNOWN**; không đổi thành “chưa ghi”.
6. **Retry có ngân sách**, và thao tác phụ thuộc chỉ đi tiếp sau xác nhận.

Unique constraint và transaction trong API là phần thiết yếu của miAssura theo định nghĩa rộng vừa chốt. Ta không nghiên cứu sự cố đường API–DB trong Topic, nhưng vẫn **cần giả định và thực hiện đúng tính atomic của việc ghi**.

Không cần mô phỏng mọi hình dạng mạng xấu. Ta cần bao phủ những **kết quả có ý nghĩa với thao tác**: chưa tới, đang xử lý, đã commit; rồi bridge có receipt hợp lệ, thiếu receipt, hoặc receipt không khớp. Các toxic giúp tạo những tình huống đó.). Có thể tách làm nhiều slide hoặc không

Type: correction/requirement/question. Authority: record and advise; not slide-production or packaging implementation approval. State: CAPTURED.

### R66 — annotation 8

Selected: 7. Phục hồi và phụ thuộc	UNKNOWN → retry có giới hạn → CONFIRMED; cha được xác nhận rồi mới gửi checklist.

Owner comment:

Chưa hiểu lắm? Sau khi nghe xong miAssura hoạt động thế nào thì thực tế mình muốn nhìn xem là các tình huống bất định đã được trình bày ở thì ở đây nó sẽ được miAssura giải quyết như thế nào

Type: correction/requirement/question. Authority: record and advise; not slide-production or packaging implementation approval. State: CAPTURED.

### R67 — annotation 9

Selected: Hai slide dự phòng nên dành cho payload/JSON-RPC ID và timeout, retry budget, API atomic insert/replay để trả lời câu hỏi.

Owner comment:

đồng ý là có các slide dự phòng và bạn hãy trình bày nó với mã DP-X với X là thay số thứ tự vào. Trình bày như trên cùng các slide chính để mình thấy rõ hơn nội dung dự kiến

Type: correction/requirement/question. Authority: record and advise; not slide-production or packaging implementation approval. State: CAPTURED.

### R68 — annotation 10

Selected: Demo chính mình chọn hai đoạn:

Owner comment:

Demo thì let me cook, phần này nên để mình tự dẫn dắt tùy hứng. Nói là tùy hứng nhưng về cơ bản mình sẽ cho mọi người thấy "đối chứng" trước -> Show được thực tế hiệu quả miAssura -> quá tab giải thích mình sẽ bám theo một chỗ lỗi và chỉ ra miAssura ON/OFF xử lý như thế nào. -> Qua tab hành trình để giải thích, đúng hơn là giả lập lại để giải thích đặc biệt kỹ tại sao miAssura đảm bảo được

Type: correction/requirement/question. Authority: record and advise; not slide-production or packaging implementation approval. State: CAPTURED.

### R69 — annotation 11

Selected: Mốc chuẩn bị mình đề xuất:

Owner comment:

bạn không cần đề xuất mình mốc đâu. tiếp tới sẽ là chúng ta làm việc để cho ra khung slide -> chốt nội dung -> làm slide -> Còn lại thì let me cook. Mà mình hỏi một câu ngoài là đối với Lab thì chạy đúng 1 script là tất cả lên đúng không?

Type: correction/requirement/question. Authority: record and advise; not slide-production or packaging implementation approval. State: CAPTURED.

### R70 — submission package

Owner original request:

Về bản nộp cho thầy thì slide thì dễ rồi, thế còn kịch bản demo thì nó bao gồm lab của mình -> Làm sao chúng ta đóng gói Lab vào nhỉ? Hay là chỉ kèm một file kịch bản demo rồi hướng dẫn tới link Github nói rõ ràng rằng demo là lab của microLink? Kèm cả các hình ảnh thực tế dùng nữa cho thuyết phục vào nhỉ? Ý mình là gửi 2 file lên, 1 là slide, 2 là demo zip trong đó đóng gói một tài liệu hướng dẫn ngắn ví dụ README trỏ lới microLink repo, ghi rõ demo là lab và các ảnh thực tế demo, bạn thấy thế nào? Ảnh demo thì mình có thể lấy trực tiếp hoặc bạn

Type: advice on submission format and lab packaging. State CAPTURED. README/repo/screenshots ZIP is an Owner proposal, not a verified teacher upload contract. No publication, ZIP generation or deck creation approved yet.


Accepted steering: opening story starts from connecting the Agent to the Owner's
website, leading to microLink BTL then miAssura Topic; show both MCP-server and
HTTPS-bridge roles; mark network research boundary and healthy-local assumptions.
Owner keeps demo direction (Compare→Explain→Journey), timetable and presentation
time allocation. No further milestone schedule. Next sequence is frame→content
approval→slide creation. Reserve slides use DP-X IDs. These supersede R58's
T1-suggested demo order and prep milestones. Scenario table and alternatives slide
are still under discussion; preserve all meaningful operation-outcome classes.


## T1 reply proposal for R59–R70 — 2026-10-13

Status: ANSWERED/PROPOSED, not Owner-satisfied or production-approved. No slide,
ZIP, screenshot run, repo publication or packaging implementation performed.

- R59–R62: use Owner's website→microLink MCP/BTL→uncertain HTTPS path→miAssura
  Topic narrative. One microLink process has MCP-server and HTTPS-bridge roles.
  Show both directions and the bridge–API research boundary. Local STDIO/process
  and API/DB correctness are assumptions; implement atomicity but do not inject
  API–DB faults. TCP byte reliability is not proof of application commit/result.
- R63: retain all seven scenarios; split into two slides for reading. Give
  equality, benefit and connectivity-limit cases equal intellectual legitimacy.
  Avoid an unconditional "absolute" guarantee; safety depends on the API contract.
- R64: do not claim a four-solution experiment that was not conducted. Include
  a small explanation of why ordinary retry alone is insufficient, comparing the
  two actual implemented policies. Standalone outcome lookup was not implemented.
- R65–R66: define miAssura as coordinated write-recovery policy+bridge/API
  contract+enforcement. Present all six conditions, then map the seven scenario
  outcomes back to the mechanism. Parent/checklist is host orchestration.
- R67: proposed11 main slides plusDP-1..DP-4 (payload/IDs, timeouts/budget,
  atomic SQL/replay, dependencies/new-call identity and crash boundary).
- R68: Owner leads Compare→Explain→Journey as chosen, no fixed live-demo timing.
  Submission guide documents controls/cases/expected outcomes, not a rigid script.
- R69: no preparation milestones. Continue frame→content approval→deck creation.
  Verified current scripts: setup.ps1 installs local dependencies once; start.ps1
  starts lab services on a prepared Windows machine. MCP bridge processes start
  per experiment. Existing running lab should be reused, not blindly started twice.
- R70: recommend two uploads (slides anddemo.zip), with concise human guide,
  version/source identity, current clean source snapshot, reproducible case configs
  and real screenshots/results. A pointer-only ZIP is lighter but depends on
  network and repo version; current working tree has uncommitted/untracked edits.
  Exclude .venv/.tools/.runtime/private DB/certificates/keys. Setup needs network
  on a fresh machine; source ZIP is not a preinstalled offline runtime bundle.
  Clearly separate real Compare/Explain evidence and Journey simulation. Gist raw
  asks for slides+demo script and AI disclosure; ZIP upload acceptance/file limits
  are not verified. No packaging or publication approval inferred.

The slide counts/grouping and package snapshot option remain T1 proposals awaiting
Owner choice. These do not supersede the Owner's narration/demo authority.


## Artifact approval and creation-route inquiry — 2026-10-13

Source: Owner chat, annotations on `msg_09f9be615261f729016acd9caa98c08191892a62ac18677667`.

### R71 — annotation 1

Selected: Bạn chụp hoặc mình chụp đều được

Owner original comment:

đề xuất delegate cho T3 đi chụp, T1 nghiệm thu và báo cáo mình

State CAPTURED; authority and dependencies are summarized below.

### R72 — annotation 2

Selected: S01	Từ nhu cầu đến đề tài. Tên TC01, nhu cầu Agent kết nối website, microLink là BTL, miAssura là cơ chế được nghiên cứu trong Topic.

Owner original comment:

Mình đề xuất có một S00 để trình bày tên đề tài, tên mình, mã SV v.v rồi slide sau mới bắt đầu vào bài thật là S01

State CAPTURED; authority and dependencies are summarized below.

### R73 — annotation 3

Selected: gọi ra khi cần

Owner original comment:

thậm chí mình có thể xóa khi cần vì well.. kiến thức sâu quá mình không hiểu thì không nên trình bày

State CAPTURED; authority and dependencies are summarized below.

### R74 — artifact approval and route inquiry

Owner original wording:

Mình duyệt khung thuyết trình và cấu trúc demo.zip nhưng với các lưu ý: Thứ nhất là demo.zip là nộp cho thầy nên phải đủ ngữ cảnh, tiếng Việt ngắn gọn (giữ các từ kỹ thuật bằng tiếng Anh), dễ hiểu và không dùng danh xưng. Ảnh chụp bằng chứng phải được T1 kiểm rõ ràng và yêu cầu mình duyệt lại trước khi nộp, thực ra chính tay mình nộp mà hehe. Thứ 2 là slide + demo.zip cần được đóng goi trong một thư mục trong Lập trình mạng\btl cho mình. Thứ 3 là trong cur_docs là nơi chứa tài liệu học tập của mình thì các file/folder thừa ví dụ loạt mã (.microlink-batch-20261012
.microlink-fullhd-20261012
.microlink-journey-20261012) là phải bỏ đi hoặc chuyển chỗ. Thứ 4 là trước khi tạo slide thì cần bạn tư vấn về cách tạo slide, ví dụ bạn tạo trực tiếp hoặc bạn viết một handoff để mình mang sang ChatGPT web tạo, hoặc song song cả 2 làm cùng lúc và mình chọn cái tốt hơn, hoặc một công cụ nào khác như google slides? I don;t know, tư vấn mình


| ID | Authority / accepted requirement / unresolved choice |
|---|---|
| D79 | Owner approves the11-main-slide content frame and demo.zip structure from R59–R70, with the current conditions. Add S00 for official topic/title, student name/ID and course; main story starts at S01. DP-X slides may be removed if the Owner does not understand/choose them. |
| D80 | Submission documents need sufficient context, concise Vietnamese with English technical terms, neutral wording without personal forms of address. Deliver slides and demo.zip together in one folder under cur_docs/Lập trình mạng/btl. No automated submission; Owner submits. |
| D81 | T3 screenshot capture is requested as a proposed delegation. T1 must inspect/reconcile evidence, report to Owner and obtain explicit Owner image acceptance before submission. Role/model/effort/scope/output/dependencies/cost packet must be presented before dispatch; exact route not yet approved. |
| D82 | Keep cur_docs for learning/course documents. Remove or relocate disposable .microlink staging-code folders. Choose reversible relocation with a checked inventory and preserved evidence; no broad recursive deletion or changes to study notes inferred. Exact paths/backup destination still require inspection. |
| D83 | Before creating slides, advise on direct creation, a ChatGPT-web handoff, parallel alternatives or Google Slides. Route and visual/template choices remain unresolved. Deck creation stays pending until this discussion is resolved; structure approval is not a route choice. |
| R74 | Approval and requirements captured. Next: creation-route recommendation, bounded T3 proposal and staging relocation scope. No slide creation, worker dispatch, packaging export, cleanup move or publication performed in this capture step. |

D79–D83 supersede the earlier generic9+2-slide suggestion and packaging open state.
Preserve the real-vs-simulated evidence distinction and Owner narration authority.

### D82 relocation execution scope — 2026-10-13

Owner-authorized reversible cleanup: relocate exactly six inspected cur_docs staging
folders (.microlink-batch-20261012, .microlink-fullhd-20261012,
.microlink-journey-20261012, .microlink-prep,
.microlink-restore-explain-20261013, .microlink-ui-20261012) into
microLink/.runtime/cur_docs-staging-20261013, preserving original folder names and
all contents. Destination is ignored by Git. No source code used by the live lab,
study notes or canonical evidence is deleted. Preflight: no embedded Git/reparse
points or active Python/Node processes using these staging paths. SHA256 inventory
will be compared once after relocation; receipt stays beside the archive.

D82 result: COMPLETE. Initial Move-Item stopped on read-only directory attributes after moving 14 files. Union source/archive inventory preserved all 173 files. Resumed by checked literal file moves with Force and removed only emptied source directories. Six folders / 173 files / 5806029 bytes archived; all content hashes matched. Receipt: .runtime/cur_docs-staging-20261013/move-receipt.json. No study documents or live lab code changed.


## Publication approval — 2026-10-13

Source: Owner annotation 1 on msg_0eeeef1636f5dade016acda44f1cb487d0a3045c87afe8eff4.
Selected text: GitHub chưa chứa toàn bộ thay đổi hiện tại,
Original Owner wording: commit & push lê

| ID | Scope / authority / state |
|---|---|
| R75 | Owner explicitly authorizes committing and pushing the current approved microLink lab implementation and associated technical records to the existing public origin. Record first, inspect final diff/public contents, run proportionate relevant checks, then commit and push. No new product feature, real data, credential material or teacher submission authorized. State CAPTURED/APPROVED. |
| D84 | Publish current approved lab changes on the existing main branch after review/checks; preserve unrelated changes and all ignored runtime/tools/certificates. This supersedes prior publication-pending status only for this snapshot. |

Preparation already performed under D80: approved frame and short Vietnamese demo
guide drafts are under cur_docs/Lập trình mạng/btl/TC01-miAssura-2026-10-13/chuan-bi.
No deck, final ZIP or image acceptance exists yet. T1 recommends direct PPTX/PDF
creation with an optional small ChatGPT-web comparison from the same content.
Proposed T3 capture is GPT-6 Luna/high, four1920x1080 evidence groups, synthetic
lab only; no code edits, output restricted to a capture receipt folder. T1 checks
all images and data before Owner image acceptance. Route/dispatch still pending.

### R75 pre-publication verification — 2026-10-13

T1 inspected the approved UI/payload/fault/document changes and public file list.
Current checks: Python8/8; Journey19/19; payload4/4; Ruff and JS syntax PASS;
diff whitespace PASS. Credential-pattern scan:57 candidate files,0 matches;
no runtime/tools/database/certificate/key files selected for publication.

Reused real integration6/6 and latency2/2 receipts from the approved batch:
all current backend/core sources match its final-source manifest. Current
Compare/Explain sources match the later Explain-restoration final manifest;
Journey sources match the final batch manifest. Earlier intermediate manifests
are preserved as historical, not claimed to identify the latest UI. No redundant
network benchmark or runtime restart was performed for publication.

Fetched origin/main: no divergence from local HEAD5f03ef3 before staging.
Publication snapshot includes completed Journey/payload integration, latency
schedule/removal evidence, neutral selectable traces,±10 history controls,
Full-HD layout, restored complete Explain logs and approved technical records.
Independent QA, final screenshot acceptance and production readiness remain
separate and pending. No AI/teacher submission or slide-route choice inferred.

State: T1 checked; commit/push authorized under D84. Exact command outcome and
commit/remote SHA will be saved in ignored .runtime/publication-20261013/receipt.json.
