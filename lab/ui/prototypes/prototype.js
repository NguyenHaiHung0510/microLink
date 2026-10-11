// Synthetic fixtures for selecting a visual layout. No lab/network requests.
const layout=document.body.dataset.layout;
document.body.classList.add(layout);
const titles={matrix:'A · Ba bảng node',flow:'B · Black box hai chiều',timeline:'C · Dòng thời gian'};
const $=id=>document.getElementById(id);
const element=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
let mode='compare',caseName='response',count=1,step=0,timer=null,restored=false;
const cases={normal:'Bình thường',request:'Lệnh bị cản',response:'Ghi rồi mất phản hồi',late:'Kết quả chậm quá hạn',outage:'Đứt mạng'};
const phaseNames={queued:'Chuẩn bị ý định',sent:'Gọi mạng',blocked_outbound:'Chiều đi bị cản',blocked_return:'Chiều về bị cản',blocked_both:'Mất kết nối',server_written:'Server đã ghi',waiting_reply:'Kết quả chưa về kịp',unknown:'Bridge: chưa biết',retry:'Gửi lại cùng ý định',server_retry:'Server xử lý retry',confirmed:'Bridge xác nhận'};
function story(){
  let phases={normal:['queued','sent','server_written','confirmed'],request:['queued','sent','blocked_outbound','unknown','retry','server_written','confirmed'],response:['queued','sent','server_written','blocked_return','unknown','retry','server_retry','confirmed'],late:['queued','sent','server_written','waiting_reply','unknown','retry','server_retry','confirmed'],outage:['queued','sent','blocked_both','unknown']}[caseName];
  const result=phases.map(phase=>({seq:1,phase}));
  if(caseName==='outage'&&!restored)return result;
  if(caseName==='outage')result.push(...['retry','server_written','confirmed'].map(phase=>({seq:1,phase})));
  for(let seq=2;seq<=count;seq++)result.push(...['queued','sent','server_written','confirmed'].map(phase=>({seq,phase})));
  return result;
}
function nodeList(rows,kind){
  const root=element('div','','nodes');const counts=new Map();for(const n of rows)counts.set(n,(counts.get(n)||0)+1);
  if(!rows.length)root.append(element('p','Chưa quan sát được bản ghi.','empty'));
  for(const n of rows){const duplicate=kind==='server'&&counts.get(n)>1;const button=element('button',`${n}${duplicate?' ↻':''}`,'node '+(duplicate?'duplicate':kind==='agent'?'emitted':''));button.onclick=()=>{$('selection').textContent=`Task ${n}: ${kind==='agent'?'ý định Agent đã phát':duplicate?'nhiều bản ghi của cùng ý định':'server đã ghi'}. Đây là dữ liệu minh họa để chọn UI.`;};root.append(button);}
  if(mode==='compare'&&kind==='server')for(let n=1;n<=100;n++)if(!counts.has(n)){const button=element('button',String(n),'node waiting');button.onclick=()=>{$('selection').textContent=`Task ${n}: đã phát ở Agent, chưa quan sát bản ghi ở server này. Trong fixture này nó đang chờ phía sau task13 chưa xác nhận.`;};root.append(button);}
  return root;
}
function scene(){
  if(mode==='compare')return {agent:Array.from({length:100},(_,i)=>i+1),off:Array.from({length:100},(_,i)=>i+1).flatMap(n=>[8,20,42,51,69,90].includes(n)?[n,n]:[n]),on:Array.from({length:13},(_,i)=>i+1),seq:13,phase:'unknown',knownOff:'100 ✓',knownOn:'13 ? · hết5 attempts'};
  const steps=story(),current=steps[Math.min(step,steps.length-1)],off=[],on=[],agent=[];
  for(const event of steps.slice(0,step+1)){
    if(event.phase==='queued')agent.push(event.seq);
    if(event.phase==='server_written'){off.push(event.seq);on.push(event.seq);}
    if(event.phase==='server_retry')off.push(event.seq);
  }
  const known={queued:'Chưa gọi mạng',unknown:'? Chưa biết',retry:'Đang thử lại',confirmed:'✓ Đã xác nhận'}[current.phase]||'Đang chờ phản hồi';
  return {agent,off,on,...current,knownOff:known,knownOn:known};
}
function box(current){const b=element('div','','blackbox');b.append(element('strong','Đường bất định'),element('small','Black box · TCP/TLS'),element('div',mode==='compare'?'Không thấy nội bộ đường truyền':`Ca: ${cases[caseName]}`,'box-state'));return b;}
function direction(current,returning){const blocked=returning?['blocked_return','waiting_reply','unknown'].includes(current.phase):['blocked_outbound','blocked_both'].includes(current.phase);return element('div',returning?`← kết quả ${blocked?'· chưa tới':''}`:`lệnh → ${blocked?'· bị cản':''}`,'direction'+(returning?' return':'')+(blocked?' blocked':''));}
function card(kind,current){
  const panel=element('article','','card '+kind+(mode==='explain'?' big':''));const head=element('div','','lane-head');
  const title=kind==='agent'?'Agent giả lập':`Server · miAssura ${kind==='off'?'Tắt':'Bật'}`;
  head.append(element('h2',title),element('span',kind==='agent'?'ý định đã phát':`Bridge: ${kind==='off'?current.knownOff:current.knownOn}`));panel.append(head);
  if(kind!=='agent'&&layout==='matrix'){const path=element('div','','mini-path');path.append(element('span','lệnh →'),box(current),element('span','← kết quả'));panel.append(path);}
  const rows=current[kind==='agent'?'agent':kind];
  panel.append(nodeList(rows,kind==='agent'?'agent':'server'));
  panel.append(element('p',kind==='agent'?'Màu tím: ý định, chưa phải xác nhận.':'Màu xanh: server đã ghi. Bridge có thể vẫn chưa biết.','hint'));
  return panel;
}
function route(kind,current){
  const panel=element('article','','card route '+kind+(mode==='explain'?' big':''));const title=element('div','','route-label');title.append(element('b',`miAssura ${kind==='off'?'Tắt':'Bật'}`),element('p',`Bridge: ${kind==='off'?current.knownOff:current.knownOn}`));
  const path=element('div','','path-column');path.append(direction(current,false),box(current),direction(current,true));const server=element('section','');server.append(element('h2','Server đã ghi'),nodeList(current[kind],'server'));panel.append(title,path,server);return panel;
}
function timeline(kind,current){
  const panel=element('article','','card '+kind);panel.append(element('h2',`miAssura ${kind==='off'?'Tắt':'Bật'}`));
  const track=element('div','','timeline-track');const steps=story();
  for(let i=0;i<steps.length;i++){const event=steps[i];const e=element('div','','event-card'+(i===step?' current':i<step?' done':'')+(['unknown','blocked_outbound','blocked_return','blocked_both','waiting_reply'].includes(event.phase)&&i<=step?' uncertain':''));e.append(element('b',`${i+1}. ${phaseNames[event.phase]}`),element('span',`Task ${event.seq}${event.phase==='server_retry'?(kind==='off'?' · ghi thêm':' · trả lại bản ghi cũ'):event.phase==='unknown'?' · không suy ra chưa ghi':''}`));track.append(e);}
  panel.append(track,element('p',`Server: ${current[kind].join(' · ')||'chưa có bản ghi'}`,'hint'));return panel;
}
function render(){
  const current=scene();$('board').replaceChildren();
  if(mode==='explain'&&layout==='timeline')$('board').append(card('agent',current),timeline('off',current),timeline('on',current));
  else if(layout==='flow')$('board').append(card('agent',current),route('off',current),route('on',current));
  else $('board').append(card('agent',current),card('off',current),card('on',current));
  $('stageNote').textContent=mode==='compare'?'100 ý định minh họa: Tắt ghi thừa; Bật dừng khi chưa xác nhận. Không dùng số này làm benchmark.':`Bước ${step+1}/${story().length} · Task ${current.seq}: ${phaseNames[current.phase]}`;
  $('prev').disabled=mode==='compare'||step===0;$('next').disabled=mode==='compare'||step>=story().length-1;$('play').disabled=mode==='compare';
  for(const id of ['prev','next','play'])$(id).hidden=mode==='compare';
  $('restore').hidden=mode==='compare'||caseName!=='outage'||restored;
  for(const id of ['caseLabel','countLabel'])$(id).hidden=mode==='compare';
  $('metrics').replaceChildren();
  for(const [label,off,on] of [['Bản ghi',current.off.length,current.on.length],['Ghi thừa',current.off.length-new Set(current.off).size,current.on.length-new Set(current.on).size]]){const row=element('tr','');row.append(element('td',label),element('td',off),element('td',on));$('metrics').append(row);}
  for(const id of ['compare','explain'])$(id).classList.toggle('active',mode===id);
}
function stop(){clearTimeout(timer);timer=null;$('play').textContent='Tự chạy';}
function reset(){stop();step=0;restored=false;render();}
function play(){if(timer){stop();return;}if(step===story().length-1)step=0;$('play').textContent='Dừng tự chạy';const tick=()=>{if(step<story().length-1){step++;render();timer=setTimeout(tick,900);}else stop();};timer=setTimeout(tick,900);}
const app=$('app');
app.innerHTML=`<header><div><h1>microLink / miAssura</h1><p>Reliability Through Uncertainty</p></div><nav><a href="a.html" ${layout==='matrix'?'class="selected"':''}>A · Bảng node</a><a href="b.html" ${layout==='flow'?'class="selected"':''}>B · Black box</a><a href="c.html" ${layout==='timeline'?'class="selected"':''}>C · Timeline</a></nav><span class="prototype">Prototype · dữ liệu minh họa</span></header>
<div class="controls"><div class="switcher"><button id="compare">Đối chứng100 task</button><button id="explain">Giải thích1–3 task</button></div><div class="actions"><label id="caseLabel">Ca<select id="case"></select></label><label id="countLabel">Task<select id="count"><option>1</option><option>2</option><option>3</option></select></label><button id="prev">← Bước trước</button><button id="next" class="primary">Bước tiếp →</button><button id="play">Tự chạy</button><button id="restore">Khôi phục mạng</button></div></div>
<p id="stageNote" class="stage-note"></p><section id="board" class="board" aria-label="Task và giao tiếp"></section><div class="legend"><span><i class="dot purple"></i>Ý định đã phát</span><span><i class="dot"></i>Server đã ghi</span><span><i class="dot red"></i>↻ Ghi thừa</span><span><i class="dot amber"></i>? Bridge chưa biết</span><span>Ô xám: chưa có bản ghi · có thể đang chờ</span></div><p id="selection" class="detail">Chọn một node để đọc ý nghĩa. Bằng chứng ở bridge và trạng thái server là hai góc nhìn riêng.</p>
<section class="below"><details><summary>Chỉ số và cấu hình · nằm dưới vùng trực quan</summary><table><thead><tr><th>Chỉ số minh họa</th><th>Tắt</th><th>Bật</th></tr></thead><tbody id="metrics"></tbody></table><p>Tốc độ, số task, attempts, kịch bản, tỷ lệ/trọng số, seed, thời gian gây sự cố, độ trễ và băng thông sẽ được đặt ở đây trong bản live.</p></details><details><summary>Bằng chứng và trace · lịch sử đầy đủ</summary><p>UI thật sẽ tải từ đầu tới cuối theo từng trang, giữ toàn bộ lịch sử. → Gửi / ? Chưa biết / ✓ Xác nhận / × Từ chối. Prototype này không tạo bằng chứng mạng thật.</p></details></section>`;
for(const [value,label] of Object.entries(cases))$('case').append(new Option(label,value));$('case').value=caseName;
for(const id of ['compare','explain'])$(id).onclick=()=>{mode=id;reset();};
$('case').onchange=()=>{caseName=$('case').value;reset();};$('count').onchange=()=>{count=+$('count').value;reset();};
$('prev').onclick=()=>{stop();step=Math.max(0,step-1);render();};$('next').onclick=()=>{stop();step=Math.min(story().length-1,step+1);render();};$('play').onclick=play;
$('restore').onclick=()=>{restored=true;render();};window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
render();
