# miAssura — hợp đồng thao tác ghi

Ngày: 11/10/2026. Thuật toán ưu tiên nhỏ và dễ học; transport và hạ tầng được tách riêng.

## Ý định và bằng chứng

- Một intent tạo task có một ID cố định và payload snapshot. Retry giữ nguyên cả hai.
- Candidate API unique resource ID, kiểm matching payload và trả row sau transaction commit.
- Same ID/different payload trả409. Parent chưa tồn tại trả409; không tự tạo parent từ request child.
- Bridge chỉ CONFIRMED khi response2xx chứa đúng ID/payload/scope. Timeout/reset/receipt thiếu là UNKNOWN.
- REJECTED nghĩa request bị từ chối, không là cam kết rằng mọi attempt trước chưa từng commit.
- Observer DB dùng cho phép đo/UI, không được feed vào policy.

## Thứ tự và phụ thuộc

- Stream đơn giản chờ xác nhận n rồi gửi n+1. Chưa confirmed parent thì checklist còn chưa gửi.
- Không tuyên bố MCP tự sắp mọi tool calls, hoặc cần khóa mọi stream toàn hệ thống.
- Stop/cancel không undo effect đã gửi; request cũ có thể tới muộn. Giữ UNKNOWN khi thiếu evidence.
- Baseline API tạo record mới mỗi POST; reliable API nhận stable ID. Whole-solution comparison phải công bố server participation.
- Cả hai luồng đều dùng microLink. Tắt miAssura giữ retry thông thường; bật miAssura
  áp dụng stable-ID/replay và hàng rào xác nhận. API cũng phải tôn trọng ID đó.
- Hai Agent giả lập độc lập, mỗi Agent có ID, nhịp phát, hàng đợi và bridge MCP riêng.
  Mặc định1 giây/ý định. Nhịp phát độc lập với retry; mỗi bridge chỉ nhận kết quả
  từ endpoint của mình. Số task giống nhau phục vụ đối chứng, không chia sẻ ID.
- Tốc độ phát0..10 giây có thể đổi live. Queue chỉ nằm trong RAM của lab, không phải
  cam kết outbox bền vững khi crash. Confirmation barrier vẫn chặn ghi phụ thuộc.

## Budget

- Default5 total attempts; production3/5 là ứng viên chưa product-validated.
- Persistent demo dùng250 total attempts/intent,100 intents và20 phút/phiên, có Pause/Stop.
- Không hứa attempt7 thành công. Liveness cần mạng/API hồi phục; safety không đòi completion khi offline.

## Sự cố độc lập

- Toxiproxy ở TCP/TLS stream giữa bridge và API; API/bridge không được biết outcome của scenario.
- p<100 là adverse exposure, conditional weights được normalize; p100 được demo quy ước là full disconnect.
- TLS warm-up trước directional application fault; write/retry trong episode đều đi qua proxy.
- Timed fault tự hết theo schedule, không theo lane nào thắng. Các thay đổi live được ghi và không gọi là frozen bench.
- Nút Khôi phục bỏ cả toxic hiện tại và kịch bản ép, đưa đường truyền về0%.
  Các ý định đã xếp hàng dùng đường bình thường đến khi cấu hình mạng đổi tiếp.
- Toxiproxy toxicity theo connection, không trực tiếp operation. Scenario được runner gán theo intent/seed.

## Phạm vi

Synthetic local lab, MCP/STDIO thật, HTTPS verify thật, portable PostgreSQL private.
Không tích hợp tài khoản microSched, auth/pairing/privacy, crash durability, journal,
server sequencer hoặc generic DAG scheduler trong bản đầu. Hai chế độ UI Đối chứng/
Giải thích hiển thị hai cặp Agent/MCP → server; cấu hình chi tiết nằm dưới.
API dùng một tiến trình và database với namespace riêng cho mỗi luồng, không phải
hai máy chủ vật lý. Mỗi luồng có một kết nối/proxy riêng.

## Live observation and history

Agent, bridge and API write separate traces. The API observes receipt, commit/replay,
rejection and final ASGI response-send completion. Response-send does not prove the
bridge received it. No observer output is fed into miAssura.

Previous/next inspect recorded events of the selected run. They do not rewind
writes or pause the TCP stream. Pause controls the next dispatch; an in-flight
write may complete. Current network/profile data stays current during history review.

Fault percentages are configured exposure probabilities, distinct from assigned
intent counts and observed failures. Both independent proxy lanes share one profile;
the common black box does not claim one physical connection or packet visibility.

By default, each lane draws a deterministic but independent fault sequence from
the configured seed. Paired mode selects the same scenario per task number for
benchmark comparison, without sharing IDs or requiring equal execution times.
The benchmark script enables paired mode explicitly. Live settings changes are
not a frozen benchmark.

Common Start/Pause/Resume/Stop controls broadcast the action to both Agents and
bridges. Each history step moves one recorded event on each lane independently;
clicking a trace event selects only its lane. Historical snapshots never drive
the recovery algorithm. The network box always describes current proxy conditions.

Compare and Explain use the same run/configuration and accept1..100 intents.
Switching views does not clamp the task count or replace a mixed network profile.
Only small Explain runs use larger task tiles. Both network-lane status slots stay
present in normal and adverse states. The probability slider and numeric input
share one0..100 value;100 retains its explicit full-disconnect meaning.

The proposed presentation Journey is a separate deterministic simulation. Its
previous/next controls would move model state, unlike the live history controls.
See [the proposal](presentation-journey.md); it is not connected as a live tab yet.
