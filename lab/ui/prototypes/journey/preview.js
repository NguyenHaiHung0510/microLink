// Presentation fixtures. No requests are sent to the live lab.
const $ = id => document.getElementById(id);
const layout = new URLSearchParams(location.search).get('layout') === 'sequence' ? 'sequence' : 'flow';
document.body.className = layout;
$(layout + 'Link').setAttribute('aria-current', 'page');
const lanes = ['tắt', 'bật'];
const element = (tag, text = '', className = '') => { const e = document.createElement(tag); e.textContent = text; e.className = className; return e; };
const frame = (title, detail, actor, effect = {}, time = '') => ({title, detail, actor, effect, time});
function story(scenario) {
  const result = [
    frame('Agent phát một ý định tạo Task 1', 'Mỗi luồng có ID riêng. MCP tools/call đi qua STDIO tới bridge; chưa có yêu cầu HTTPS.', 'Agent', {client:'Chưa gửi', state:'not_sent', clientDetail:'Đã nhận tools/call; chuẩn bị cùng một payload.', server:'Chưa nhận yêu cầu', road:'Chưa gửi', direction:'—'}, '0 s'),
    frame('Bridge gửi yêu cầu HTTPS lần 1', 'Một lần gọi tool có thể chứa nhiều HTTP attempts. ID ý định và payload phải được giữ ổn định.', 'Bridge', {attempt:1,client:'Đang chờ phản hồi',state:'waiting',clientDetail:'Đã bắt đầu HTTP attempt R1; chưa có receipt.',road:'Lệnh đang đi',direction:'→'}, '0,2 s')
  ];
  if (scenario === 'request') {
    result.push(frame('Yêu cầu không tới API', 'Trong tình huống được chọn, server chưa nhận yêu cầu hoàn chỉnh. Bridge chỉ thấy chưa có phản hồi.', 'Mạng', {road:'Cản chiều đi',direction:'→ ×',adverse:true}, '0,4 s'));
  } else {
    result.push(frame('API nhận đủ yêu cầu', 'Đây là quan sát ở server. Bridge vẫn chưa nhận bằng chứng mới.', 'API', {server:'Nhận yêu cầu R1',road:'Chờ kết quả',direction:'←'}, '0,4 s'));
    result.push(frame('Server hoàn tất ghi', 'API chỉ tạo phản hồi thành công sau commit. Commit không tự làm bridge biết kết quả.', 'DB', {rows:1,server:'Đã ghi Task 1 · commit xong',receipt:false}, '0,7 s'));
    if (scenario === 'normal') {
      result.push(frame('Phản hồi đầy đủ tới bridge', 'Bridge kiểm tra receipt khớp thao tác. TCP ACK riêng lẻ không thay thế receipt của API.', 'Bridge', {client:'Đã xác nhận',state:'confirmed',clientDetail:'Nhận 2xx và record khớp thao tác.',server:'Đã gửi phản hồi',road:'Kết quả đã về',direction:'← ✓',receipt:true}, '0,9 s'));
      result.push(frame('MCP trả kết quả cho Agent', 'tools/call hoàn tất qua STDIO. Hai luồng đều có một bản ghi trong điều kiện bình thường.', 'MCP', {clientDetail:'Tool result: confirmed · 1 attempt.'}, '1 s'));
      return result;
    }
    result.push(frame('Server gửi phản hồi, đường về bị cản', 'Server có bản ghi nhưng phản hồi chưa tới bridge. Log “đã gửi” ở API không chứng minh phía gọi đã nhận.', 'Mạng', {server:'Đã gửi phản hồi R1',road:'Cản chiều về',direction:'× ←',adverse:true}, '0,9 s'));
  }
  result.push(frame('Bridge hết thời hạn chờ', 'Cùng một timeout có thể đi kèm 0 hoặc 1 bản ghi. Bridge không lấy sự thật server từ màn hình để quyết định.', 'Bridge', {client:'Chưa biết kết quả',state:'unknown',clientDetail:'Chưa có phản hồi hợp lệ trước timeout.',receipt:false}, '3 s'));
  result.push(frame('Mạng hồi phục', 'Điều kiện xấu kết thúc theo kịch bản mô phỏng. Việc khôi phục đường truyền chưa tự xác nhận thao tác.', 'Mạng', {road:'Đường truyền hồi phục',direction:'⇄',adverse:false}, '4 s'));
  result.push(frame('Bridge thử lại cùng ý định', 'Retry không phải ý định mới. Trong lab, cả hai luồng giữ ID ý định; khác biệt là contract API có tôn trọng ID để tránh ghi thêm hay không.', 'Bridge', {attempt:2,client:'Đang chờ phản hồi',state:'waiting',clientDetail:'Gửi attempt R2; giữ ID và payload cũ.',road:'Lệnh thử lại đi',direction:'→'}, '4,2 s'));
  result.push(frame('API xử lý yêu cầu thử lại', scenario === 'request' ? 'Lần đầu chưa tới: cả hai API tạo một bản ghi.' : 'Tắt: API tạo thêm một bản ghi. Bật: API nhận ra ID cũ, kiểm payload và trả bản ghi đã có.', 'API', {rows:scenario === 'request' ? 1 : [2,1],server:scenario === 'request' ? 'Ghi Task 1 lần đầu' : ['Ghi thêm Task 1 · một effect thừa','Trả bản ghi cũ · không ghi thêm'],road:'Kết quả đang về',direction:'←'}, '4,5 s'));
  result.push(frame('Receipt tới bridge và được kiểm tra', 'Luồng bật chỉ xác nhận khi record khớp ID/payload/scope. Bảo đảm này cần contract phía API; ID do client đặt không đủ nếu API bỏ qua.', 'Bridge', {client:'Đã xác nhận',state:'confirmed',clientDetail:'Nhận phản hồi hợp lệ của R2.',receipt:true,road:'Kết quả đã về',direction:'← ✓'}, '4,7 s'));
  result.push(frame('MCP trả kết quả cho Agent', scenario === 'request' ? 'Cả hai luồng có một bản ghi. Ca này không tự chứng minh ưu thế chống ghi lặp.' : 'Cùng một ý định: server tắt có hai bản ghi; server bật có một. Hai bridge chỉ xác nhận sau khi có phản hồi.', 'MCP', {clientDetail:'Tool result: confirmed · 2 attempts.'}, '4,8 s'));
  return result;
}
let frames = story('response'), step = 0, timer = null;
const choose = (value, lane) => Array.isArray(value) ? value[lane] : value;
function stateAt(index, lane) {
  const state = {rows:0,attempt:0,client:'Chưa gửi',state:'not_sent',clientDetail:'Chưa có bằng chứng',server:'Chưa nhận yêu cầu',road:'Chưa gửi',direction:'—',adverse:false,receipt:false};
  for (const f of frames.slice(0,index+1)) for (const [key,value] of Object.entries(f.effect)) state[key] = choose(value,lane);
  return state;
}
function records(state) {
  const list = element('div','','records');
  for (let n=0;n<state.rows;n++) list.append(element('span',n ? '1 ↻' : '1','record'+(n?' extra':'')));
  if (!state.rows) list.append(element('span','Chưa có bản ghi','note'));
  return list;
}
function client(state,lane) {
  const card = element('article','','card client-'+lane+' '+(lane?'on':'off'));
  card.append(element('h2','Agent / MCP · miAssura '+lanes[lane]),element('div',state.client,'status '+state.state),element('p',state.clientDetail,'detail'),element('p',`Ý định ${lane?'ON':'OFF'}-1 · attempt ${state.attempt}`,'identity'));
  return card;
}
function server(state,lane) {
  const card = element('article','','card server-'+lane+' '+(lane?'on':'off'));
  card.append(element('h2','Server · miAssura '+lanes[lane]),element('h3','Sự thật ở server'),element('span',state.rows+' bản ghi','count'),records(state),element('p',state.server,'detail'));
  return card;
}
function log(lane) {
  const card = element('article','','card '+(lane?'on':'off')); card.append(element('h2','Luồng · miAssura '+lanes[lane]));
  const list = element('ol','','log');
  frames.slice(0,step+1).forEach((f,i)=>{ const row = element('li','',i===step?'current':''); row.append(element('time',f.time),element('b',f.actor),element('span',f.title)); list.append(row); });
  card.append(list); return card;
}
function messagePath(f) {
  if (f.actor === 'Agent') return 'Agent → MCP · STDIO';
  if (f.actor === 'MCP') return 'MCP → Agent · STDIO';
  if (f.actor === 'DB') return 'API → DB · commit';
  if (f.actor === 'API') return f.effect.rows === undefined ? 'Mạng → API · yêu cầu' : 'API ↔ DB · xử lý ghi';
  if (f.actor === 'Mạng') return !f.effect.adverse ? 'Đường truyền hồi phục' : f.effect.direction.startsWith('→') ? 'MCP → × API' : 'API × → MCP';
  if (f.effect.state === 'unknown') return 'Bridge · hết thời hạn chờ';
  return f.effect.state === 'waiting' ? 'MCP → API · HTTPS' : 'API → Bridge · receipt';
}
function paint() {
  const f = frames[step]; $('position').textContent = `${step+1}/${frames.length} · ${f.time}`; $('headline').textContent=f.title; $('explanation').textContent=f.detail;
  $('play').textContent = step === 0 ? 'Chạy' : 'Tiếp tục';
  $('prev').disabled=step===0; $('next').disabled=step===frames.length-1; $('play').disabled=timer!==null||step===frames.length-1; $('pause').disabled=timer===null;
  const states = [stateAt(step,0),stateAt(step,1)];
  $('board').replaceChildren();
  if (layout==='flow') {
    states.forEach((s,i)=>$('board').append(client(s,i),server(s,i)));
    const network=element('aside','','network'+(states.some(s=>s.adverse)?' adverse':''));network.append(element('h2','Đường bất định'));
    states.forEach((s,i)=>{ const route=element('div','','route');route.append(element('strong','Luồng · miAssura '+lanes[i]),element('div',s.direction,'direction'),element('p',s.road));network.append(route); });$('board').append(network);
  } else {
    states.forEach((s,i)=>{
      const card=element('article','','card sequence-card '+(i?'on':'off')),head=element('div','','sequence-head');head.append(element('h2','miAssura '+lanes[i]),element('div',s.client,'status '+s.state));card.append(head);
      const line=element('div','','lifelines');['Agent / MCP','Đường bất định','API / DB'].forEach(t=>line.append(element('b',t)));card.append(line);
      const message=element('div','','sequence-message');message.append(element('strong',messagePath(f)),element('p',f.title));card.append(message);
      const truth=element('div','','sequence-truth');truth.append(element('span',s.rows+' bản ghi','count'),element('span',s.server));card.append(truth,records(s),element('p',s.clientDetail,'detail'),element('p',`Ý định ${i?'ON':'OFF'}-1 · attempt ${s.attempt}`,'identity'));$('board').append(card);
    });
  }
  $('logs').replaceChildren(log(0),log(1));
}
function stop() {clearTimeout(timer);timer=null;}
function tick() {if(step>=frames.length-1){stop();paint();return;}step++;paint();timer=setTimeout(tick,+$('speed').value);}
$('prev').onclick=()=>{stop();step=Math.max(0,step-1);paint();};$('next').onclick=()=>{stop();step=Math.min(frames.length-1,step+1);paint();};$('reset').onclick=()=>{stop();step=0;paint();};
$('play').onclick=()=>{if(timer===null&&step<frames.length-1){timer=setTimeout(tick,+$('speed').value);paint();}};$('pause').onclick=()=>{stop();paint();};
$('scenario').onchange=()=>{stop();frames=story($('scenario').value);step=0;paint();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();paint();}});window.addEventListener('pagehide',stop);paint();
