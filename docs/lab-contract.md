# miTrust — hợp đồng thao tác ghi

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
- Cả hai luồng đều dùng microLink. Tắt miTrust giữ retry thông thường; bật miTrust
  áp dụng stable-ID/replay và hàng rào xác nhận. API cũng phải tôn trọng ID đó.
- Agent giả lập phát cùng ID ý định cho hai luồng, mặc định1 giây/ý định. Nhịp phát
  độc lập với retry; các lệnh đã phát chờ trong hàng đợi của từng luồng.
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
Giải thích đều giữ ba màn Agent và hai trạng thái server. Cấu hình chi tiết nằm dưới.
