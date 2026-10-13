# Core trước, transport sau

Mục tiêu: nhìn vào code và tự giải thích được tại sao gửi lại không làm sai ý định.

miAssura gồm chính sách bridge và hợp đồng/cài đặt API. recovery.py là vòng lặp
phục hồi, không tự chống ghi trùng. Cùng mã retry được chạy riêng trong mỗi tiến
trình bridge; hai luồng không dùng chung attempts, connection hoặc response.

Owner chọn A: OFF vẫn mang ID để lab nối log, nhưng API OFF không dùng nó để
khử tác dụng lặp. ON giữ ID/payload và API thực thi unique/replay. ID hiện do host
cấp; không phải khả năng mặc định của MCP hoặc bridge tự sinh trong implementation.

## Bốn phần cần học

1. **Định danh:** một ý định tạo task có một intent ID. Tạo hai task cùng tên là
   hai ý định khác nhau, dùng hai ID. RPC ID và HTTP attempt không phải ID nghiệp vụ.
2. **Bằng chứng:** server trả record sau commit. Bridge kiểm ID, nội dung và scope
   trước khi xác nhận. Timeout/reset/JSON thiếu không chứng minh chưa ghi: giữ unknown.
3. **Retry:** vòng lặp trong recovery.py chỉ gọi lại cùng send_once. Adapter đóng
   trên snapshot ID/payload. API unique ID + matching payload mới làm điều này an toàn.
4. **Phụ thuộc:** host chưa xác nhận n thì chưa gửi n+1 trong một ordered stream. Tạo
   cha rồi tạo checklist là một nhu cầu thực tế; tất cả lệnh trên mọi stream không
   cần bị khóa tuần tự toàn hệ thống.

## Một câu chuyện đi hết đường

    Ý định: tạo task cha A
    Attempt 1: POST ID=A → API commit A → phản hồi bị cản
    Bridge: UNKNOWN, không nói chưa tạo
    Attempt 2: POST ID=A, payload cũ → API thấy A, trả record A
    Bridge: CONFIRMED sau khi kiểm record
    Tiếp theo: tạo checklist C, parent_id=A

Nếu request cha chưa tới thì server chưa biết gì. Khi retry cha tới, server mới
tạo A. Request con không tự yêu cầu server suy đoán hoặc tạo cha; foreign key từ
chối con mồ côi. Nếu cha vẫn unknown, host chưa gọi tool con. Bridge chỉ phục hồi
từng call; không tự nhận diện DAG hay nội dung ngôn ngữ tự nhiên của Agent.

## Luồng thông điệp

    Agent → host/MCP client → JSON-RPC UTF-8/newline qua STDIO
      → microLink (MCP server + HTTPS bridge) → HTTP trong TLS → API → PostgreSQL
    API trả record sau commit → HTTP client nhận/kiểm receipt
      → MCP server trả JSON-RPC result → MCP client ghép call ID → host/Agent

Một tool call có thể có nhiều HTTP attempts. JSON-RPC ID ghép call/result;
intent ID giữ một tác dụng ghi qua retry; resource ID nhận diện row.
API sent response không chứng minh bridge đã nhận. committed_at là timestamp
của row, không phải bằng chứng độc lập cho thời điểm commit.

HTTP client đặt connect/read/write/pool timeout3s; read đo thời gian chờ chunk,
không phải tổng request. recovery.py dừng sớm khi confirmed/rejected, còn unknown
thì retry trong limit/budget. Budget được xét giữa attempts. Tool result vẫn có
state=unknown nếu thiếu receipt; isError=false không đồng nghĩa ghi thành công.

## Đọc code theo thứ tự

1. src/microlink/recovery.py: vòng lặp và barrier, không import MCP/proxy/database.
2. src/microlink/bridge.py: snapshot payload, HTTPS, validate receipt, gọi policy.
3. lab/api.py: insert atomically, unique ID, compare existing payload, foreign key.
4. lab/controller.py: client MCP thật, chọn workload, barrier và observer riêng.
5. lab/faults.py: sự cố ở byte stream; API/bridge không được biết scenario outcome.

## Điều bảo đảm và điều chưa bảo đảm

| Tính chất | Điều kiện |
|---|---|
| Không thêm effect khi retry create | API tôn trọng cùng stable ID, scope và payload; row vẫn giữ |
| Xác nhận đúng | Record được API trả sau commit và khớp thao tác |
| Thứ tự trong stream | Chờ xác nhận thao tác trước, không pipeline các write phụ thuộc |
| Hoàn tất | Mạng/API hồi phục đủ lâu trước ngân sách; không hứa khi offline mãi |

Demo có thể retry nhiều, nhưng không có định lý "lần thứ 7 chắc chắn thành công".
Outage có tương quan; permanent outage giữ unknown. Bản đầu dùng cap250 attempts,
100 intents,20 phút/phiên và Pause/Stop thay vì chạy nền không giới hạn.

POST replay record là cơ chế phục hồi bằng chứng tối thiểu. Chưa cần journal,
lease, sequencer server, DAG scheduler, queue bền vững hoặc crash-recovery.

Demo chủ lực: commit mất phản hồi, phản hồi vượt timeout và đứt mạng quá ngân sách.
Normal/blocked-request có thể cho kết quả giống nhau; đó là đối chứng hợp lệ.
Bandwidth của receipt nhỏ chủ yếu làm chậm, không bảo đảm tạo timeout.
Phiên MCP local được giả định khỏe trong Topic; offline outbox và sản phẩm tính sau.

Tham chiếu: [idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/),
[PostgreSQL constraints](https://www.postgresql.org/docs/18/ddl-constraints.html).
