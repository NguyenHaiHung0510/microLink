const $ = id => document.getElementById(id);
const names = {latency:'Trễ',bandwidth:'Băng thông',request:'Cản đi',response:'Cản về',reset:'Reset',partial:'Chưa đủ'};
const defaults = {latency:10,bandwidth:5,request:6,response:6,reset:2,partial:1};
const labels = {confirmed:'Đã xác nhận',unknown:'Chưa biết',not_sent:'Chưa gửi',rejected:'Bị từ chối',sending:'Đang gửi',queued:'Chờ ý định',ready:'Sẵn sàng',runtime_error:'Lỗi runtime',session_limit:'Hết ngân sách phiên'};
const statuses = {idle:'Sẵn sàng',running:'Đang chạy',paused:'Tạm dừng',stopping:'Đang dừng',finished:'Đã kết thúc'};
const focus = new URLSearchParams(location.search).get('view') === 'focus';
document.body.classList.toggle('focus', focus);
$(focus ? 'focusMode' : 'compareMode').setAttribute('aria-current', 'page');
$('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { $('message').textContent = 'Hãy mở demo trong cửa sổ trình duyệt rộng để trình chiếu ba màn cạnh nhau.'; }
};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'Thoát toàn màn hình':'Toàn màn hình';});
for (const key of Object.keys(defaults)) {
  const label = document.createElement('label');
  label.textContent = names[key];
  const input = document.createElement('input');
  Object.assign(input, {type:'number', min:'0', max:'100', value:defaults[key], id:'weight-'+key});
  label.append(input); $('weights').append(label);
}
function config() {
  return {probability:+$('prob').value, count:+$('count').value, attempts:+$('attempts').value,
    persistent:$('persistent').checked, force:$('force').value, parent_case:$('parent').checked,
    seed:+$('seed').value, duration:+$('duration').value, delay_ms:+$('delay').value,
    bandwidth_kb:+$('bandwidth').value, pace:+$('pace').value,
    weights:Object.fromEntries(Object.keys(defaults).map(k=>[k,+$('weight-'+k).value]))};
}
async function post(path, body) {
  const r = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json'}, body:body ? JSON.stringify(body) : undefined});
  const data = await r.json();
  if (!r.ok) throw Error(JSON.stringify(data.detail || data));
  return data;
}
async function act(path, body, message) {
  try { await post(path, body); $('message').textContent = message; }
  catch (e) { $('message').textContent = e.message; }
}
$('start').onclick = () => act('/start', config(), 'Lượt mới: một Agent phát cùng ý định cho hai luồng microLink.');
$('pause').onclick = () => act('/action/pause', null, 'Đã tạm dừng phát ý định và các lần retry kế tiếp. Request đang bay có thể hoàn tất.');
$('resume').onclick = () => act('/action/run', null, 'Tiếp tục phát ý định và phục hồi.');
$('stop').onclick = () => act('/action/stop', null, 'Đã yêu cầu dừng. Các ghi đã xảy ra không bị hoàn tác.');
$('prob').oninput = () => {$('probLabel').textContent = $('prob').value+'%';};
const apply = () => act('/config', config(), 'Đã cập nhật tốc độ và hồ sơ mạng. Các ý định đã phát giữ kịch bản của chúng.');
$('prob').onchange = apply;
$('offline').onclick = () => {$('prob').value=100; $('prob').oninput(); act('/config',config(),'Đã ngắt cả hai đường truyền. Ý định mới tiếp tục xếp hàng; request đã tới server có thể đã ghi.');};
$('restore').onclick = () => {$('prob').value=0; $('force').value='mixed'; $('prob').oninput(); act('/config',config(),'Đã bỏ sự cố hiện tại và trở về 0%. Các lần retry dùng lại ID của ý định đang xử lý.');};
for (const id of ['pace','force','duration','delay','bandwidth',...Object.keys(defaults).map(k=>'weight-'+k)]) $(id).onchange = apply;
function text(tag, value, className) {
  const e = document.createElement(tag); e.textContent = value;
  if (className) e.className = className;
  return e;
}
function metrics(id, values) {
  $(id).replaceChildren(...values.map(([label,value,bad])=>{
    const block = text('div','',bad?'bad':'');
    block.append(text('strong',value),text('span',label)); return block;
  }));
}
const signatures = new Map();
function sequence(id, rows, counts=new Map(), current=0) {
  const signature = JSON.stringify([rows.map(r=>r.seq),current]);
  if (signatures.get(id) === signature) return;
  signatures.set(id, signature);
  const root = $(id); const follow = root.scrollHeight-root.scrollTop-root.clientHeight < 50;
  root.replaceChildren();
  if (!rows.length) root.append(text('p','Chưa có task.','empty'));
  for (const r of rows) {
    const duplicate = counts.get(r.seq)>1;
    const tile = text('span',`${r.seq}${duplicate?' ↻':''}`,'tile'+(duplicate?' duplicate':'')+(r.seq===current?' active':''));
    tile.title = `Task ${r.seq}${duplicate?' · có nhiều bản ghi cùng ý định':''}`;
    root.append(tile);
  }
  if (follow) root.scrollTop = root.scrollHeight;
}
function eventText(event) {
  const result = event.event==='attempt' ? 'gửi request' : labels[event.state]||event.state;
  return `Task ${event.seq} · lần ${event.attempt}: ${result}${event.reason?' · '+event.reason:''}`;
}
let hydrated = false;
const traceSignatures = new Map();
function render(s) {
  if (!hydrated) {
    hydrated = true;
    const c = s.config;
    for (const [id,key] of [['prob','probability'],['count','count'],['attempts','attempts'],['seed','seed'],['duration','duration'],['delay','delay_ms'],['bandwidth','bandwidth_kb'],['force','force'],['pace','pace']]) $(id).value=c[key];
    $('persistent').checked=c.persistent; $('parent').checked=c.parent_case;
    for (const key of Object.keys(defaults)) $('weight-'+key).value=c.weights[key];
    $('prob').oninput();
  }
  $('runState').textContent = statuses[s.status]||s.status;
  const scenarios={normal:'Bình thường',request:'Cản chiều đi',response:'Mất kết quả về',latency:'Phản hồi chậm',bandwidth:'Băng thông thấp',reset:'Reset kết nối',partial:'Kết quả chưa đủ'};
  $('scenarioBadge').textContent=s.config.probability===100?'Đứt mạng':s.config.force==='mixed'?'Hỗn hợp':`Ép: ${scenarios[s.config.force]}`;
  const active = ['running','paused','stopping'].includes(s.status);
  $('start').disabled=active;
  $('pause').disabled=s.status!=='running'; $('resume').disabled=s.status!=='paused'; $('stop').disabled=!active||s.status==='stopping';
  for (const id of ['count','attempts','persistent','parent','seed']) $(id).disabled=active;
  const agent = s.agent || {intents:[],target:0,finished:true};
  const issued = agent.intents.length;
  $('agentCurrent').textContent=issued?String(issued).padStart(2,'0'):'—';
  $('agentRate').textContent=`${s.config.pace} giây/task`;
  $('agentBadge').textContent=s.status==='paused'?'Tạm dừng':s.status==='stopping'?'Đang dừng':!s.run_id?'Sẵn sàng':agent.finished?(issued===agent.target?'Đã phát xong':'Đã dừng phát'):'Đang phát';
  metrics('agentMetrics',[['Đã phát',issued],['Mục tiêu',agent.target||s.config.count],['Còn chờ phát',Math.max(0,(agent.target||s.config.count)-issued)]]);
  sequence('agentSequence',agent.intents,new Map(),issued);
  $('agentQueue').textContent=agent.finished&&s.run_id?'Agent đã kết thúc phát; hai luồng có thể vẫn đang xử lý.':'Hai luồng nhận cùng ID cho cùng một ý định.';
  const traces=$('traceRows');
  for (const lane of ['baseline','reliable']) {
    const info=s.lanes[lane]||{seq:0,state:'ready',results:[]};
    const rows=s.rows.filter(r=>r.lane===lane); const counts=new Map();
    for (const row of rows) counts.set(row.seq,(counts.get(row.seq)||0)+1);
    const extra=rows.length-counts.size; const events=s.traces[lane]||[];
    const current=events.filter(e=>e.seq===info.seq).at(-1);
    const known=info.state==='sending'&&current?.state==='unknown'?'unknown':info.state;
    $(lane+'State').textContent=`${info.seq?'Task '+info.seq+' · ':''}${labels[known]||known}`;
    $(lane+'State').className=known==='confirmed'?'good':known==='unknown'?'unknown':'';
    const attempt=current?.attempt;
    $(lane+'Attempt').textContent=attempt?`Attempt ${attempt}${current.reason?' · '+current.reason:''}`:'MCP/STDIO · chờ gọi tool';
    metrics(lane+'Metrics',[['Bản ghi',rows.length],['Ghi thừa',extra,extra>0],['Xác nhận',info.results.filter(r=>r.state==='confirmed').length]]);
    sequence(lane+'Sequence',rows,counts);
    const pending=Math.max(0,issued-info.results.length-(info.state==='sending'?1:0));
    $(lane+'Queue').textContent=info.error?info.error:`${pending} ý định đang chờ · ${info.protocol?'MCP '+info.protocol:s.run_id?'đang kết nối MCP':'MCP chưa bắt đầu'}`;
    $(lane+'Mini').replaceChildren(...(events.length?events.slice(-3).map(e=>text('p',eventText(e))):[text('p','Trace xuất hiện khi gọi tool thật.')]));
    if (!$(lane+'TraceList')) {
      const column=text('section',''); column.append(text('h3',`microLink · miTrust ${lane==='baseline'?'Tắt':'Bật'}`));
      const list=document.createElement('ol'); list.id=lane+'TraceList'; column.append(list);
      const raw=document.createElement('details'); const pre=document.createElement('pre'); pre.id=lane+'Raw';
      raw.append(text('summary','JSON sự kiện đang xem'),pre); column.append(raw); traces.append(column);
    }
    const signature=JSON.stringify(events);
    if (traceSignatures.get(lane)!==signature) {
      traceSignatures.set(lane,signature);
      $(lane+'TraceList').replaceChildren(...events.slice(-10).map(e=>text('li',eventText(e))));
      $(lane+'Raw').textContent=events.map(e=>JSON.stringify(e)).join('\n')||'Chưa có attempt.';
    }
  }
}
let enabled=true; let timer; const opened=Date.now();
window.addEventListener('pagehide',()=>{enabled=false;clearTimeout(timer);});
window.addEventListener('pageshow',e=>{if(e.persisted){enabled=true;refresh();}});
async function refresh() {
  if (!enabled) return;
  if (Date.now()-opened>1200000) {$('message').textContent='Đã dừng cập nhật sau 20 phút. Tải lại để xem tiếp.';return;}
  try {const r=await fetch('/state');if(!r.ok)throw Error('Không lấy được trạng thái lab');render(await r.json());}
  catch(e) {$('message').textContent=e.message;}
  if (enabled) timer=setTimeout(refresh,document.hidden?2000:250);
}
refresh();
