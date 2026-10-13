/* One bounded presentation clock. Real Agent streams keep their own controllers. */
'use strict';
const $ = id => document.getElementById(id);
const model = window.MiAssuraJourney;
const payload = window.MiAssuraPayload;
let payloadView = 'flow';
const escaped = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seconds = value => Number(value.toFixed(1)).toLocaleString('vi-VN') + 's';
const symbols = {info:'→', unknown:'?', fault:'!', commit:'✓', confirmed:'✓', duplicate:'↻', replay:'↺'};
let journey, position = 0, timer = null, playing = false;

$('scenario').innerHTML = model.cases.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
$('scenario').value = new URLSearchParams(location.search).get('case') || 'response';
if (!model.cases.some(c => c.id === $('scenario').value)) $('scenario').value = 'response';

function pause() {
  clearTimeout(timer); timer = null; playing = false;
}
function loadCase(preserveVariant = false) {
  pause();
  const selected = model.cases.find(c => c.id === $('scenario').value);
  if (!preserveVariant) {
    $('variant').innerHTML = (selected.variants || []).map(([id, name]) => `<option value="${id}">${name}</option>`).join('');
    if (selected.id === 'delay') $('variant').value = 'after';
  }
  $('variantLabel').hidden = !selected.variants;
  $('limitLabel').hidden = selected.id !== 'outage';
  journey = payload.expand(model.build(selected.id, {variant:$('variant').value, limit:$('limit').value}));
  position = 0; paint();
}
function clientCard(state, lane) {
  const policy = lane ? 'bật' : 'tắt';
  const evidence = state.receipt ? `Receipt: ${state.receipt.recordId}` : 'Receipt: chưa có bằng chứng hợp lệ';
  return `<article class="card client-${lane} ${state.policy}"><div class="card-head"><h2>Agent ${lane+1} · Bridge ${lane+1}</h2><span class="policy">miAssura ${policy}</span></div>
    <p class="identity">${lane ? escaped('Khóa phục hồi ' + state.intent) : 'Create thông thường · mã lab không khử lặp'} · lần ${state.attempt}${state.deadline !== null ? ` · deadline ${seconds(state.deadline)}` : ''}</p>
    <p class="status ${state.status}">${escaped(state.client)}</p><p class="decision">${escaped(state.decision)}</p><p class="receipt">${escaped(evidence)}</p></article>`;
}
function serverCard(state, lane) {
  const seen = new Set(); let extras = 0;
  const records = state.records.map(row => {
    const extra = seen.has(row.id); seen.add(row.id); if (extra) extras++;
    return `<span class="record ${extra ? 'extra' : ''}" title="${escaped(row.recordId + (row.parent ? ' · cha ' + row.parent : ''))}">${escaped(row.task)}${extra ? ' ↻' : ''}</span>`;
  }).join('');
  return `<article class="card server-${lane} ${state.policy}"><div class="card-head"><h2>Server · luồng ${lane+1}</h2><span class="policy">miAssura ${lane ? 'bật' : 'tắt'}</span></div>
    <p class="server-state">${escaped(state.server)}</p><div class="records">${records || '<span class="record empty">Chưa có bản ghi</span>'}</div>
    <p class="metrics"><b>${state.records.length}</b> bản ghi · <b class="extra-count">${extras}</b> ghi thừa · ${state.received} request đã nhận</p>
    <p class="receipt">${state.parentRef ? escaped('Checklist → cha ' + state.parentRef) : 'Sự thật tại server · không phải bằng chứng của bridge'}</p></article>`;
}
function paintPayload(current) {
  const selectedLane = Number($('payloadLane').value), metadata = $('payloadMetadata').checked;
  $('payloadCurrent').textContent = `Bước ${position+1}/${journey.frames.length} · ${current.frame.title}`;
  const message = payload.describe(journey, current, selectedLane, metadata);
  $('payloadPaths').innerHTML = current.lanes.map((state, lane) => {
    const route = payload.describe(journey, current, lane, metadata);
    return `<article class="payload-path ${state.policy}"><div class="path-heading"><strong>miAssura ${lane ? 'bật' : 'tắt'}</strong><span>Bridge: ${escaped(state.status.toUpperCase())} · lần ${state.attempt}</span></div><div class="payload-stations">${payload.stations.map((name, stage) => `${stage ? `<span class="payload-arrow ${route.returning ? 'return' : ''}" aria-hidden="true">${route.returning ? '←' : '→'}</span>` : ''}<div class="payload-station ${stage === route.stage ? 'active ' : ''}${stage === 3 ? 'network-node ' : ''}${stage === 3 && state.adverse ? 'adverse' : ''}"><h3>${escaped(name)}</h3><small>${escaped(!lane && stage === 4 ? 'Create thông thường' : !lane && stage === 5 ? 'Resource ID mới + transaction' : payload.roles[stage])}</small></div>`).join('')}</div></article>`;
  }).join('');
  $('payloadPaths').hidden = payloadView !== 'flow';
  $('payloadSequenceRows').hidden = payloadView !== 'sequence';
  $('payloadFlow').setAttribute('aria-pressed', payloadView === 'flow');
  $('payloadSequence').setAttribute('aria-pressed', payloadView === 'sequence');
  if (payloadView === 'sequence') {
    $('payloadSequenceRows').innerHTML = '<div class="payload-sequence-head"><span>Bước</span><span>Chặng</span><span>Thông điệp / xử lý</span><span>Ý nghĩa</span></div>' + journey.frames.map((frame, i) => {
      const route = payload.describe(journey, model.snapshot(journey, i), selectedLane, metadata);
      return `<div class="payload-sequence-row ${i === position ? 'current' : i > position ? 'future' : ''}"><b>${i+1}</b><span>${escaped(payload.stations[route.stage])} ${route.returning ? '←' : '→'}</span><span>${escaped(frame.title)}</span><span>${escaped(frame.explanation)}</span></div>`;
    }).join('');
  }
  $('payloadRpc').textContent = metadata ? JSON.stringify(message.rpc, null, 2) : message.toolReturned ?
    `{"jsonrpc":"2.0", "id":${message.rpcId},
 "result":{"resultType":"complete",
  "isError":false, "structuredContent":
${JSON.stringify(message.result, null, 2).split('\n').map(line => '  ' + line).join('\n')}
 }
}` :
    `{"jsonrpc":"2.0", "id":${message.rpcId},
 "method":"tools/call",
 "params":{"name":"create_task",
  "arguments":{"operation":
   ${JSON.stringify(message.rpc.params.arguments.operation)}
  }}
}`;
  $('payloadHttp').textContent = message.http;
  $('payloadEvidence').textContent = JSON.stringify(message.evidence, null, 2);
  $('payloadNote').textContent = (metadata ? 'Wire rút gọn; ON/OFF/RUN thay UUID thật.' : 'Đã lược metadata lab khi trình chiếu; wire thật vẫn có.') +
    ' OFF: ID chỉ nối log, API không khử lặp. ON: host cấp khóa, bridge giữ qua retry, API dùng để replay. JSON-RPC ID ghép call/result; mỗi retry là HTTP attempt mới.' +
    (message.toolReturned ? ' Đang hiển thị tool result đã trả cho MCP client.' : ' Call MCP còn chờ; trạng thái nội bộ không phải tool result đã gửi.') +
    (message.responseAvailable ? ' Cột HTTP là response API đã gửi; cột bằng chứng chỉ có receipt khi bridge nhận và kiểm hợp lệ.' : ' Cột HTTP là request sẽ/đang gửi.');
}

function paint() {
  const current = model.snapshot(journey, position);
  $('headline').textContent = current.frame.title;
  $('explanation').textContent = current.frame.explanation;
  $('position').textContent = `Bước ${position+1}/${journey.frames.length} · t = ${seconds(current.frame.at)}`;
  const network = `<aside class="network ${current.lanes.some(s => s.adverse) ? 'adverse' : ''}"><h2>Đường bất định</h2><p class="network-intro">Hai luồng mô phỏng</p>${current.lanes.map((state, lane) => `<div class="route"><strong>Luồng ${lane+1} · ${lane ? 'bật' : 'tắt'}</strong><p>${escaped(state.network)}</p></div>`).join('')}<p class="network-foot">→ Lệnh đi · ← Kết quả về</p></aside>`;
  $('board').innerHTML = current.lanes.map(clientCard).join('') + network + current.lanes.map(serverCard).join('');
  $('logs').innerHTML = current.lanes.map((state, lane) => `<article class="card log-card ${state.policy}"><h2>Luồng ${lane+1} · miAssura ${lane ? 'bật' : 'tắt'}</h2><ol class="log">${state.log.map((entry, i) => `<li class="${entry.mark} ${i === state.log.length-1 ? 'current' : ''}"><time>${seconds(entry.at)}</time><span>${entry.source}</span><span class="mark" aria-hidden="true">${symbols[entry.mark]}</span><span>${escaped(entry.message)}</span></li>`).join('')}</ol></article>`).join('');
  paintPayload(current);
  $('prev').disabled = playing || position === 0;
  $('next').disabled = playing || position === journey.frames.length-1;
  $('play').disabled = playing || position === journey.frames.length-1;
  $('play').textContent = position > 0 ? 'Tiếp tục' : 'Chạy';
  $('pause').disabled = !playing;
  for (const [copy, original] of [['payloadPrev','prev'],['payloadNext','next'],['payloadPlay','play'],['payloadPause','pause']]) {$(copy).disabled = $(original).disabled; $(copy).textContent = $(original).textContent;}
  $('playState').textContent = playing ? 'Đang chạy' : position === journey.frames.length-1 ? 'Đã kết thúc' : 'Đã dừng';
}
function schedule() {
  clearTimeout(timer);
  if (!playing) return;
  timer = setTimeout(() => {
    if (!playing) return;
    position++;
    if (position === journey.frames.length-1) pause();
    paint(); if (playing) schedule();
  }, Number($('speed').value));
}
for (const [copy, original] of [['payloadPrev','prev'],['payloadNext','next'],['payloadPlay','play'],['payloadPause','pause']]) $(copy).addEventListener('click', () => $(original).click());
$('payloadLane').addEventListener('change', paint);
$('payloadMetadata').addEventListener('change', paint);
$('payloadFlow').addEventListener('click', () => {payloadView = 'flow'; paint();});
$('payloadSequence').addEventListener('click', () => {payloadView = 'sequence'; paint();});
$('scenario').addEventListener('change', () => loadCase());
$('variant').addEventListener('change', () => loadCase(true));
$('limit').addEventListener('change', () => loadCase(true));
$('reset').addEventListener('click', () => {pause(); position = 0; paint();});
$('prev').addEventListener('click', () => {pause(); position = Math.max(0, position-1); paint();});
$('next').addEventListener('click', () => {pause(); position = Math.min(journey.frames.length-1, position+1); paint();});
$('play').addEventListener('click', () => {playing = true; paint(); schedule();});
$('pause').addEventListener('click', () => {pause(); paint();});
$('speed').addEventListener('change', () => {if (playing) schedule();});
$('fullscreen').addEventListener('click', async () => {
  try {if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen();}
  catch { $('playState').textContent = 'Trình duyệt không cho phép toàn màn hình'; }
});
document.addEventListener('visibilitychange', () => {if (document.hidden) {pause(); paint();}});
window.addEventListener('pagehide', pause);
loadCase();
