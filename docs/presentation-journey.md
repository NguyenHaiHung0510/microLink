# Presentation journey — proposed

Keep **Compare** for the real streams and **Explain** for their full logs.
Both display the same run with1..100 tasks. Add one **Journey / Hành trình** tab
for a deterministic presentation simulation, independent of the live controller.

## Layout choices

- **A — Outward command and returning result:** two client/server pairs around a
  common uncertainty box. Put bridge evidence on the client side and server truth
  on the server side. Recommended for the class presentation.
- **B — Sequence:** lifelines and chronological messages, with the same two policy
  paths. Better for discussing protocol order; more technical text on screen.

Standalone previews: `lab/ui/prototypes/journey/index.html`. They cover normal,
blocked request and lost response. Neither layout is selected for the live tab yet.

## Proposed case selector

| Case | What the audience sees |
|---|---|
| Normal | STDIO tool call, HTTPS request, API receive, commit, matching receipt, tool result. |
| Request blocked | Server receives no complete command in this selected story; bridge times out and cannot infer that fact from timeout alone. |
| Response lost after commit | Server has a row while bridge is UNKNOWN. Retry creates another effect off; on replays the same record. |
| Delay | A result arriving before the deadline versus no usable receipt by the deadline. Show what happens to a late response separately from a later retry. |
| Connection interrupted | Choose before complete API receipt versus after commit. The same transport error can have different write outcomes. |
| Incomplete response / slow transfer | Server may have committed; a partial or invalid response is not sufficient confirmation. |
| Outage exceeds budget | Attempts stop with UNKNOWN. The simulation does not promise completion without recovery. |
| Parent then checklist | A dependent write stays unsent until the parent's matching receipt is confirmed. |

These cover distinct outcomes in this write contract, not every possible network
fault combination. Duplication is an outcome of retry/API semantics, not a toxic.
A delayed commit can be an additional story with explicit server-processing
assumptions; do not claim the current proxy can reproduce every timing relation.
ID/payload conflict is an optional contract guard, not a network failure.

## Step controls and evidence

Use previous/next, play/pause/resume, reset and an adjustable simulated step pace.
Each step changes the model itself; previous restores an earlier model snapshot.
It never undoes real database writes or freezes TCP traffic.

Always show both ON/OFF lanes with separate identities and records. Display:
logical intent ID, HTTP attempt, command/result direction, server rows, bridge
knowledge and the policy's next action. Keep a visible simulated clock/deadline.
Open chronological logs below; no quiz, hidden truth or last-N cap.

Bridge confirmation must follow modeled receipt delivery and validation. It cannot
read the server observation pane to decide. The on path requires the API's unique
ID, matching-payload and replay contract. The current off path also reports UNKNOWN
on timeout; do not invent a false-failure policy to make the comparison look better.

Label the tab **Mô phỏng**. Use the real lab for experimental numbers. Grouping all
cases in one selector keeps the navigation small; separate Journey/Recovery/
Dependencies tabs are an alternative if the presentation needs larger dedicated
views. The additional navigation and repeated controls are the trade-off.

## Implementation proposal

Implement the selected layout in the existing HTML/CSS/JS UI.
No new dependency, backend, core-policy, production or MCP configuration change is
needed. Reuse the existing palette, typography and controls. Check phase order,
UNKNOWN before valid evidence, ON replay/no extra effect, step reversal and
bounded playback before connecting the new navigation tab. Full case coverage is
part of that implementation; the current previews only establish the layout.
