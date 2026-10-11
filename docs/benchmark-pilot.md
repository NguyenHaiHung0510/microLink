# Pilot benchmark — 2026-10-11

Four paired runs, twelve logical create intents per lane in each run. Scripted MCP
client, protocol2026-07-28, verified HTTPS, TCP fault proxy and PostgreSQL18.6.

| Profile p | Seed | Baseline effects | Reliable effects | Confirmed per lane | Attempts per lane |
|---:|---:|---:|---:|---:|---:|
| 0% | 42 | 12 | 12 | 12/12 | 12 |
| 30% | 42 | 13 | 12 | 12/12 | 18 |
| 30% | 71 | 13 | 12 | 12/12 | 14 |
| 50% | 42 | 13 | 12 | 12/12 | 18 |
| **Total** | — | **51** | **48** | **48/48 each** | **62 each** |

Observed baseline extra effects:3; reliable extra effects:0. This demonstrates the
selected cases, not a general proof of zero duplication or a production rate.
Each lane completed all48 logical intents. Calls were serialized within a lane;
the two lanes shared local runtime/DB resources and ran side by side.

The profiles use a deterministic runner seed and per-intent scenario manifest,
with fault duration4s, HTTP phase timeout3s, at most5 write attempts,12 intents.
These are synthetic exposure rates; the realized scenario mix in only12 draws is
not the advertised percentage exactly. Effects and confirmations came from actual
DB and bridge receipts, not animation or injected outcome labels.

Mean completed-call latency was about0.01s without faults; about0.38–1.37s across
these fault runs. This is an exploratory local measure, not an isolated throughput
benchmark or p95 claim. Retrying required additional requests in both policies.

Full synthetic run snapshots and wire/attempt records are retained under ignored
.runtime/benchmarks and .runtime/runs. A next research batch can add more seeds,
longer burst outages and explicit exposure counts. No estimate of Wi-Fi failure
frequency, real Codex behavior or production microSched safety is implied.
