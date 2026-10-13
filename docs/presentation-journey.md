# Presentation journey

**Compare** and **Explain** display the same real run with 1..100 tasks.
**Journey** is a separate presentation simulation at `/ui/journey.html`.
It makes no network calls or database writes and yields no benchmark numbers.

The selected outward/return layout places bridge knowledge on the Agent side,
server truth opposite, and a shared uncertainty box between the two policy paths.
The earlier flow/sequence previews remain in `lab/ui/prototypes/journey/`.

## Stories

| Story | Main point |
|---|---|
| Normal | API receipt, commit, response send, bridge validation, tool result are separate steps. |
| Request blocked | This story delivers no complete request. Timeout alone cannot tell the bridge that. |
| Response lost | Server has committed while bridge is UNKNOWN. Ordinary create retry duplicates; the on API replays. |
| Delay | Select before or after a 3-second deadline. A late reply to a closed request is not a receipt for a later attempt. |
| Connection interrupted | Select before complete API receipt or after commit. Similar transport errors can hide different outcomes. |
| Incomplete response | A committed write with a partial/unusable receipt remains unknown to the bridge. |
| Outage exceeds budget | Select 1..5 total sends. The result stays UNKNOWN without connectivity. |
| Parent then checklist | The child stays unsent until the parent has a matching receipt; each lane uses its own parent record ID. |

These are eight groups with ten timing branches, not every network fault.
Duplication is a retry/API outcome, not a toxic. Stories model explicit outcomes;
they do not claim that Toxiproxy always produces that exact timing.

## Controls and assumptions

Previous/next rebuild the selected model snapshot. Reset returns to the first
Agent call. Play/pause/resume uses one bounded presentation clock and stops at the
last frame. Changing stories stops playback; hiding the page pauses it.
Presentation pace is independent of the displayed simulated time/deadline.
Chronological logs remain open below the board, without a last-N cap or quiz.

MCP initialization is assumed complete. The HTTPS adapter closes a timed-out
request and validates matching intent/payload evidence. Both paths preserve
UNKNOWN and the parent dependency barrier, matching the live lab. The off API
uses ordinary create; the on API enforces unique ID, matching payload and replay
after commit. Keeping an ID at the client is insufficient if the API ignores it.
Server observations never decide bridge confirmation.

No backend, recovery core, dependency, protocol pin or production setting changed.
Run `node tests/test_journey.cjs` for the model checks. Use the real lab for
network experiments and measured comparisons.


## Presentation size

The primary target is 1920x1080. Wide desktop views use nearly the whole width,
28px current states, 36px records and a 320x576px route box. The main journey
stays above its complete logs. Smaller panels keep the responsive layout.
Compare uses numbered nodes and three-line state windows. Explain places full
chronological Agent/Bridge and API logs below their respective nodes for every
workload size, including100 tasks. Its page grows vertically; the full source
trace remains below. Both views read the same real run.


## Message and payload walkthrough

Owner-approved B04 is below the main board and above the full logs. Its
outward/return and sequence views follow the same selected Journey step; there
is no second presentation clock. Nearby previous/next/play/pause controls mirror
the main controls so the walkthrough remains usable while scrolled down.

The highlighted station shows Agent, MCP client, bridge, network, API or database.
Select either policy to read its MCP call/result, HTTP request/response and bridge
evidence. API response sending and bridge receipt validation are different steps;
the response can be visible while bridge evidence is still missing. MCP client
delivery is shown before Agent delivery. Outage returns UNKNOWN through MCP.

Metadata is omitted by default for readability, including the OFF lab tracking ID.
The wire toggle reveals the simplified lab fields; the real implementation still
carries them under alternative A. Specimens use short IDs, omit routine headers,
and do not claim to be packet captures. Host manages parent/checklist dependency.
