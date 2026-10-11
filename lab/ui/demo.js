// Live views read observer data; no observer result is supplied to the bridge.
const $ = id => document.getElementById(id);
const lanes = ['baseline', 'reliable'];
const sources = [...lanes.map(lane => 'agent-' + lane), ...lanes, ...lanes.map(lane => 'server-' + lane)];
const defaults = {latency:10, bandwidth:5, request:6, response:6, reset:2, partial:1};
const names = {normal:'Bình thường', latency:'Phản hồi chậm', bandwidth:'Băng thông thấp', request:'Cản chiều đi', response:'Cản chiều về', reset:'Ngắt đột ngột', partial:'Ngắt khi đang truyền', outage:'Đứt mạng'};
const statuses = {idle:'Sẵn sàng', running:'Đang chạy', paused:'Tạm dừng', stopping:'Đang dừng', finished:'Đã kết thúc'};
const focus = new URLSearchParams(location.search).get('view') === 'focus';
document.body.dataset.view = focus ? 'focus' : 'compare';
$(focus ? 'focusMode' : 'compareMode').setAttribute('aria-current', 'page');
$('presetLabel').hidden = !focus;
const node = (tag, value = '', className = '') => {
  const result = document.createElement(tag); result.textContent = value; result.className = className; return result;
};
for (const key of Object.keys(defaults)) {
  const label = node('label', names[key]);
  const input = document.createElement('input');
  Object.assign(input, {type:'number', min:'0', max:'100', value:defaults[key], id:'weight-' + key});
  label.append(input); $('weights').append(label);
}
let snapshot = null, hydrated = false, busy = false, enabled = true, timer = null;
let runId = null, events = [], traceFingerprint = '', moreTrace = false;
let cursors = {baseline:null, reliable:null}, laneEvents = {baseline:[], reliable:[]};
let traceStore = Object.fromEntries(sources.map(source => [source, []]));
let offsets = Object.fromEntries(sources.map(source => [source, 0]));
const signatures = new Map(), opened = Date.now();
function message(value, error = false) { $('message').textContent = value; $('message').classList.toggle('error', error); }

function config() {
  for (const input of document.querySelectorAll('input,select')) {
    if (!input.disabled && !input.checkValidity()) { input.reportValidity(); throw Error('Kiểm tra lại giá trị cấu hình.'); }
  }
  return {probability:+$('prob').value, count:+$('count').value, attempts:+$('attempts').value,
    persistent:$('persistent').checked, force:$('force').value, parent_case:$('parent').checked,
    paired_faults:$('paired').checked,
    seed:+$('seed').value, duration:+$('duration').value, delay_ms:+$('delay').value,
    bandwidth_kb:+$('bandwidth').value, pace:+$('pace').value,
    weights:Object.fromEntries(Object.keys(defaults).map(key => [key, +$('weight-' + key).value]))};
}
async function post(path, body) {
  const response = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json'}, body:body ? JSON.stringify(body) : undefined});
  const result = await response.json();
  if (!response.ok) {
    const detail = result.detail;
    throw Error(typeof detail === 'string' ? detail : 'Cấu hình chưa hợp lệ; kiểm tra lại các giá trị.');
  }
  return result;
}
async function act(path, body, message) {
  if (busy) return;
  busy = true;
  try { await post(path, body); $('message').textContent = message; $('message').classList.remove('error'); if (path !== '/config') cursors = {baseline:null, reliable:null}; }
  catch (error) { $('message').textContent = error.message; $('message').classList.add('error'); }
  finally { busy = false; }
}
function apply() {
  try { return act('/config', config(), 'Đã áp dụng. Hồ sơ mới dùng cho ý định phát tiếp; Khôi phục bỏ cả sự cố đang chờ.'); }
  catch (error) { message(error.message, true); }
}
$('start').onclick = () => {
  try { act('/start', config(), 'Lượt mới: Agent gọi MCP thật; hai luồng đi qua proxy và API thật.'); }
  catch (error) { message(error.message, true); }
};
$('apply').onclick = apply;
$('pause').onclick = () => act('/action/pause', null, 'Tạm dừng lần gửi tiếp. Request đang bay vẫn có thể hoàn tất.');
$('resume').onclick = () => act('/action/run', null, 'Tiếp tục lượt chạy và xem dữ liệu hiện tại.');
$('stop').onclick = () => act('/action/stop', null, 'Đã yêu cầu dừng. Ghi đã xảy ra không bị hoàn tác.');
$('prob').oninput = () => { $('probLabel').textContent = $('prob').value + '%'; };
$('prob').onchange = apply;
$('pace').onchange = apply;
for (const [id, value] of [['offline', 100], ['restore', 0]]) $(id).onclick = () => {
  $('prob').value = value; $('prob').oninput();
  if (id === 'restore') $('force').value = 'mixed';
  try { act('/config', config(), id === 'offline' ? 'Đã ngắt hai đường truyền. Không suy ra rằng các request trước chưa ghi.' : 'Đã khôi phục mạng; các lần thử tiếp vẫn giữ ID của ý định.'); }
  catch (error) { message(error.message, true); }
};
$('preset').onchange = () => {
  const selected = $('preset').value;
  $('force').value = selected === 'outage' ? 'normal' : selected;
  $('prob').value = selected === 'outage' ? 100 : 0;
  $('duration').value = 4;
  if (selected === 'latency') $('delay').value = 4500;
  $('prob').oninput();
  $('message').textContent = 'Tình huống đã điền vào cấu hình. Chạy lượt mới để thực hiện; kiểm tra trace để xác nhận điều đã xảy ra.';
};
$('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { message('Mở trình duyệt rộng để trình chiếu toàn bộ các panel.', true); }
};
document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = document.fullscreenElement ? 'Thoát toàn màn hình' : 'Toàn màn hình'; });

function chooseStep(lane, index) {
  if (!laneEvents[lane].length) return;
  cursors[lane] = Math.max(0, Math.min(laneEvents[lane].length - 1, index));
}
for (const [id, change] of [['firstStep', () => 0], ['prevStep', (index) => index - 1], ['nextStep', (index) => index + 1]]) $(id).onclick = () => {
  for (const lane of lanes) chooseStep(lane, change(cursors[lane] ?? laneEvents[lane].length - 1));
  paint();
};
$('liveView').onclick = () => { cursors = {baseline:null, reliable:null}; paint(); };

function clock(value) { return Number.isFinite(value) ? new Date(value * 1000).toLocaleTimeString('vi-VN', {hour12:false}) : '—'; }
function eventKind(event) {
  if (event.event === 'result') return event.state;
  if (event.extra) return 'duplicate';
  return event.event;
}
function symbol(event) {
  return ({issued:'→', attempt:'→', confirmed:'✓', unknown:'?', rejected:'×', not_sent:'○', received:'↓', commit:'✓', duplicate:'↻', replay:'=', response_sent:'←', observed_row:'✓', trace_error:'!'})[eventKind(event)] || '·';
}
function label(event, brief = false) {
  if (!event) return 'Chưa có sự kiện.';
  const task = `Task ${event.seq}`;
  switch (event.event) {
    case 'issued': return `Phát ${task}`;
    case 'attempt': return `Gửi ${task} · lần ${event.attempt}`;
    case 'received': return `Nhận yêu cầu ${task}`;
    case 'commit': return `${event.extra ? 'Ghi thêm' : 'Ghi'} ${task} · commit xong`;
    case 'replay': return `${task}: trả bản ghi cũ · không ghi thêm`;
    case 'response_sent': return `${task}: đã gửi phản hồi ${event.http_status}`;
    case 'observed_row': return `DB quan sát: ${task} đã ghi`;
    case 'rejected': return `${task}: từ chối ${event.http_status}${!brief && event.reason ? ' · ' + event.reason : ''}`;
    case 'trace_error': return 'Không đọc được một dòng trace.';
    case 'result': {
      const known = {confirmed:'Xác nhận', unknown:'Chưa biết', rejected:'Bị từ chối', not_sent:'Chưa gửi'}[event.state] || event.state;
      return `${task} · ${known} (lần ${event.attempt})${!brief && event.reason ? ' · ' + event.reason : ''}${event.receipt?.created === false ? ' · bản ghi cũ' : ''}`;
    }
    default: return `${task} · ${event.event}`;
  }
}
function sourceLabel(event, brief = false) { return (event.source?.startsWith('agent-') ? 'Agent: ' : 'MCP: ') + label(event, brief); }
function markExtras(list) {
  const seen = new Set();
  return list.map(event => {
    if (event.event !== 'commit') return event;
    const extra = seen.has(event.intent_id); seen.add(event.intent_id);
    return {...event, extra};
  });
}
function setWindow(id, list, next, client = false) {
  const previous = list.at(-2), current = list.at(-1);
  const describe = event => `${symbol(event)} ${client ? sourceLabel(event, true) : label(event, true)}`;
  const content = [previous ? describe(previous) : '—', current ? describe(current) : 'Chưa có sự kiện', next];
  const signature = JSON.stringify(content);
  if (signatures.get(id) === signature) return;
  signatures.set(id, signature);
  const window = node('div', '', 'state-window');
  for (const [index, name] of ['Vừa qua', 'Hiện tại', 'Tiếp theo'].entries()) {
    const row = node('div', '', 'state-row ' + ['previous', 'current ' + (current ? eventKind(current) : ''), 'upcoming'][index]);
    row.append(node('span', name, 'state-label'), node('span', content[index])); window.append(row);
  }
  $(id).replaceChildren(window);
}
function setNodes(id, rows, target, agent = false) {
  const counts = new Map(); rows.forEach(row => counts.set(row.intent_id || row.seq, (counts.get(row.intent_id || row.seq) || 0) + 1));
  const signature = JSON.stringify([rows.map(row => [row.seq, row.id]), target]);
  if (signatures.get(id) === signature) return;
  signatures.set(id, signature);
  const fragment = document.createDocumentFragment(), present = new Set();
  for (const row of rows) {
    present.add(row.seq); const duplicate = !agent && counts.get(row.intent_id || row.seq) > 1;
    const tile = node('span', row.seq, 'node' + (agent ? ' emitted' : duplicate ? ' duplicate' : ''));
    tile.title = `Task ${row.seq}: ${agent ? 'Agent đã phát' : duplicate ? counts.get(row.intent_id || row.seq) + ' bản ghi cùng ý định' : 'server đã ghi'} · ID ý định: ${row.intent_id || '—'}`;
    fragment.append(tile);
  }
  for (let seq = 1; seq <= target; seq++) if (!present.has(seq)) {
    const tile = node('span', seq, 'node waiting'); tile.title = `Task ${seq}: ${agent ? 'chưa phát' : 'chưa có bản ghi'}`; fragment.append(tile);
  }
  if (!target && !rows.length) fragment.append(node('p', 'Chưa có task.', 'empty'));
  $(id).replaceChildren(fragment);
}
function setMetrics(id, values) {
  const signature = JSON.stringify(values); if (signatures.get(id) === signature) return;
  signatures.set(id, signature);
  $(id).replaceChildren(...values.map(([name, value, bad]) => {
    const metric = node('div', '', 'metric' + (bad ? ' bad' : '')); metric.append(node('strong', value), node('span', name)); return metric;
  }));
}
function setLog(id, list) {
  const signature = list.map(event => `${event.source}:${event.trace_offset ?? event.time}`).join('|');
  if (signatures.get(id) === signature) return;
  signatures.set(id, signature);
  const root = $(id), fragment = document.createDocumentFragment();
  for (const event of list) {
    const item = node('li', '', eventKind(event));
    item.append(node('time', clock(event.time)), node('b', symbol(event)), node('span', id.endsWith('ClientLog') ? sourceLabel(event) : label(event)));
    item.title = event.intent_id ? `Ý định: ${event.intent_id}` : '';
    item.onclick = () => {
      const lane = event.source.endsWith('baseline') ? 'baseline' : 'reliable';
      chooseStep(lane, laneEvents[lane].findIndex(row => row.source === event.source && row.trace_offset === event.trace_offset)); paint();
    };
    fragment.append(item);
  }
  if (!list.length) fragment.append(node('li', 'Chưa có sự kiện.'));
  if (root.tagName !== 'OL') { const ol = node('ol', '', 'log-list'); ol.append(fragment); root.replaceChildren(ol); }
  else root.replaceChildren(fragment);
}
function bridgeNext(lane, last, info, issued, target) {
  if (!last) return 'Chờ ý định Agent';
  if (last.event === 'attempt') return 'Chờ phản hồi';
  if (last.state === 'confirmed') return last.seq < target ? (last.seq < issued ? `Dự kiến gửi Task ${last.seq + 1}` : 'Chờ Agent phát tiếp') : 'Đã xử lý hết chuỗi';
  if (last.state === 'rejected') return lane === 'reliable' ? 'Dừng chuỗi · request bị từ chối' : 'Không thử lại request bị từ chối';
  const limit = snapshot.config.persistent ? 250 : snapshot.config.attempts;
  if (cursors[lane] === null && snapshot.status === 'paused') return 'Tạm dừng lần gửi tiếp';
  if (cursors[lane] === null && snapshot.status === 'finished' && info.state !== 'confirmed') return 'Chuỗi đã dừng · giữ kết quả chưa biết';
  if (last.attempt >= limit) return 'Hết giới hạn · chưa được đi tiếp';
  return lane === 'reliable' ? 'Thử lại cùng ID khi còn giới hạn' : 'Thử lại theo API thông thường';
}
function profile(config, network) {
  const percentages = Object.fromEntries(['normal', ...Object.keys(defaults), 'outage'].map(key => [key, 0]));
  if (config.probability === 100) percentages.outage = 100;
  else if (config.force !== 'mixed') percentages[config.force] = 100;
  else {
    percentages.normal = 100 - config.probability;
    const sum = Object.values(config.weights).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(defaults)) percentages[key] = config.probability * config.weights[key] / sum;
  }
  const signature = JSON.stringify([percentages, network?.assigned_by_lane, config.paired_faults]);
  if (signatures.get('profile') === signature) return;
  signatures.set('profile', signature); $('rateRows').replaceChildren(); $('rateBar').replaceChildren();
  for (const [key, value] of Object.entries(percentages)) {
    const row = node('tr'); row.append(node('td', names[key]), node('td', value.toLocaleString('vi-VN', {maximumFractionDigits:1}) + '%'), ...lanes.map(lane => node('td', network?.assigned_available ? network.assigned_by_lane[lane][key] ?? 0 : '—'))); $('rateRows').append(row);
    if (value) { const segment = node('span', '', key); segment.style.width = value + '%'; $('rateBar').append(segment); }
  }
  $('profileLabel').textContent = config.probability === 100 ? 'Ngắt kết nối toàn phần' : config.force === 'mixed' ? `Bất lợi ${config.probability}%` : `Ép: ${names[config.force]}`;
  $('profileNote').textContent = `${config.paired_faults ? 'Cùng kịch bản lỗi theo số task để đối chứng; thời điểm chạy vẫn độc lập.' : 'Hai luồng chọn lỗi độc lập dưới cùng tỷ lệ.'} Cột Tắt/Bật đếm ý định đã gán điều kiện, không đếm lỗi thao tác.`;
}
function paintNetwork(network) {
  const active = network?.active || {};
  const description = fault => {
    const direction = fault.direction === 'upstream' ? '→ Lệnh đi' : '← Kết quả về';
    const detail = fault.scenario === 'latency' ? ` · ${fault.attributes.latency} ms` : fault.scenario === 'bandwidth' ? ` · ${fault.attributes.rate} KB/s` : '';
    return `${names[fault.scenario]} · ${direction}${detail}`;
  };
  $('activeFaults').replaceChildren();
  if (network?.offline) { $('networkNow').textContent = 'Đứt mạng · cả hai luồng'; return; }
  const affected = lanes.filter(lane => active[lane]);
  if (!affected.length) { $('networkNow').textContent = 'Không có sự cố đang áp dụng'; return; }
  $('networkNow').textContent = 'Sự cố đang áp dụng';
  const equal = affected.length === 2 && description(active.baseline) === description(active.reliable);
  for (const lane of equal ? ['baseline'] : affected) {
    const row = node('div', '', 'fault-state');
    row.append(node('b', equal ? 'Cả hai luồng' : lane === 'baseline' ? 'Luồng 1 · Tắt' : 'Luồng 2 · Bật'), node('span', description(active[lane])));
    $('activeFaults').append(row);
  }
}
function paint() {
  if (!snapshot) return;
  const s = snapshot, active = ['running', 'paused', 'stopping'].includes(s.status);
  $('runState').textContent = statuses[s.status] || s.status;
  $('start').disabled = active || busy; $('pause').disabled = s.status !== 'running'; $('resume').disabled = s.status !== 'paused'; $('stop').disabled = !active || s.status === 'stopping';
  for (const id of ['count', 'attempts', 'persistent', 'parent', 'seed', 'preset', 'paired']) $(id).disabled = active;
  for (const lane of lanes) {
    const cursor = cursors[lane];
    const timeline = laneEvents[lane];
    const visible = cursor === null ? timeline : timeline.slice(0, cursor + 1);
    const agentSource = 'agent-' + lane, serverSource = 'server-' + lane;
    const agentInfo = s.agents[lane];
    const agent = cursor === null ? agentInfo.intents : visible.filter(event => event.source === agentSource);
    const target = agentInfo.target || s.config.count;
    const info = s.lanes[lane] || {state:'ready', results:[]};
    let bridge = visible.filter(event => event.source === lane);
    if (cursor === null && !bridge.length) bridge = s.traces[lane] || [];
    let server = markExtras(visible.filter(event => event.source === serverSource));
    const rowTruth = s.rows.filter(row => row.lane === lane);
    const rows = cursor === null ? rowTruth : traceStore[serverSource].length ? server.filter(event => event.event === 'commit').map(event => event.receipt) : rowTruth.filter(row => Date.parse(row.committed_at) / 1000 <= timeline[cursor]?.time);
    if (cursor === null && !server.length && rows.length) server = rows.map(row => ({...row, event:'observed_row', time:Date.parse(row.committed_at) / 1000}));
    const confirmed = bridge.filter(event => event.event === 'result' && event.state === 'confirmed').length;
    $(lane + 'Issued').textContent = `${agent.length}/${target} đã phát`;
    const processed = cursor === null ? info.results.length : new Set(bridge.filter(event => event.event === 'result' && ['confirmed','rejected'].includes(event.state)).map(event => event.seq)).size;
    $(lane + 'Queue').textContent = `${Math.max(0, agent.length - processed)} chờ xử lý`;
    setNodes(lane + 'AgentNodes', agent, target, true);
    setNodes(lane + 'Nodes', rows, target);
    const extra = rows.length - new Set(rows.map(row => row.intent_id)).size;
    setMetrics(lane + 'Metrics', [['Đã ghi', rows.length], ['Ghi thừa', extra, extra > 0], ['Từ chối', server.filter(event => event.event === 'rejected').length]]);
    setWindow(lane + 'Window', bridge, bridgeNext(lane, bridge.at(-1), info, agent.length, target));
    setWindow(lane + 'ServerWindow', server, 'Chờ yêu cầu tiếp theo');
    const clientEvents = visible.filter(event => event.source === lane || event.source === agentSource);
    for (const [id, list] of [[lane + 'ClientLog', clientEvents], [lane + 'ServerLog', server]]) { $(id).hidden = !focus; if (focus) setLog(id, list); }
    $(lane + 'Sends').textContent = bridge.filter(event => event.event === 'attempt').length;
    $(lane + 'Receipts').textContent = confirmed;
    if (info.error) message(`Luồng ${lane === 'baseline' ? 'tắt' : 'bật'} gặp lỗi tiến trình: ${info.error}`, true);
  }
  paintNetwork(s.network); profile(s.config, s.network);
  const historical = lanes.some(lane => cursors[lane] !== null);
  $('historyLabel').textContent = historical ? lanes.map(lane => `${lane === 'baseline' ? 'Tắt' : 'Bật'} ${cursors[lane] === null ? 'trực tiếp' : `${cursors[lane] + 1}/${laneEvents[lane].length}`}`).join(' · ') : `Hai luồng trực tiếp · ${events.length} sự kiện`;
  if (s.legacy_shared_agent) $('historyLabel').textContent += ' · lượt cũ dùng chung Agent';
  $('firstStep').disabled = !events.length;
  $('prevStep').disabled = !lanes.some(lane => (cursors[lane] ?? laneEvents[lane].length - 1) > 0);
  $('nextStep').disabled = !lanes.some(lane => cursors[lane] !== null && cursors[lane] < laneEvents[lane].length - 1);
  $('liveView').disabled = !historical;
  for (const source of sources) setLog('trace-' + source, source.startsWith('server-') ? markExtras(traceStore[source]) : traceStore[source]);
  $('traceMessage').textContent = `${events.length} sự kiện của lượt chạy${moreTrace ? ' · đang tải tiếp' : ''}. Các nút bước áp dụng riêng trên lịch sử mỗi luồng, không ép chạy đồng bộ. Black box luôn là mạng hiện tại.`;
}
function hydrate(config) {
  for (const [id, key] of [['prob','probability'], ['count','count'], ['attempts','attempts'], ['seed','seed'], ['duration','duration'], ['delay','delay_ms'], ['bandwidth','bandwidth_kb'], ['force','force'], ['pace','pace']]) $(id).value = config[key];
  $('persistent').checked = config.persistent; $('parent').checked = config.parent_case; $('paired').checked = config.paired_faults;
  for (const key of Object.keys(defaults)) $('weight-' + key).value = config.weights[key];
  if (focus) {
    $('count').max = '3'; $('count').value = Math.min(3, config.count);
    const preset = config.probability === 100 ? 'outage' : ['normal', 'request', 'response', 'latency'].includes(config.force) ? config.force : 'normal';
    $('preset').value = preset;
    if (config.force === 'mixed') { $('force').value = 'normal'; $('prob').value = 0; }
  }
  $('prob').oninput(); hydrated = true;
}
function resetTrace(id) {
  runId = id; cursors = {baseline:null, reliable:null}; laneEvents = {baseline:[], reliable:[]}; events = []; moreTrace = true; traceFingerprint = '';
  traceStore = Object.fromEntries(sources.map(source => [source, []])); offsets = Object.fromEntries(sources.map(source => [source, 0])); signatures.clear();
}
async function loadEvents() {
  if (!runId) return;
  const selected = runId;
  const pages = await Promise.all(sources.map(async source => {
    const response = await fetch(`/trace/${source}?run_id=${encodeURIComponent(selected)}&offset=${offsets[source]}`);
    if (!response.ok) throw Error('Không tải được trace đầy đủ.'); return [source, await response.json()];
  }));
  if (selected !== runId) return;
  moreTrace = false;
  for (const [source, page] of pages) {
    traceStore[source].push(...page.events.map(event => ({...event, source, event:source.startsWith('agent-') ? 'issued' : event.event})));
    offsets[source] = page.next_offset; moreTrace ||= page.more;
  }
  events = sources.flatMap(source => traceStore[source]).sort((a, b) => a.time - b.time || sources.indexOf(a.source) - sources.indexOf(b.source) || a.trace_offset - b.trace_offset);
  for (const lane of lanes) laneEvents[lane] = events.filter(event => event.source === lane || event.source.endsWith('-' + lane));
}
async function refresh() {
  if (!enabled) return;
  if (Date.now() - opened > 1200000) { message('Đã ngừng cập nhật sau 20 phút. Tải lại trang để xem tiếp.', true); return; }
  try {
    const response = await fetch('/state'); if (!response.ok) throw Error('Không lấy được trạng thái lab.');
    snapshot = await response.json(); if (!hydrated) hydrate(snapshot.config);
    if (snapshot.run_id !== runId) resetTrace(snapshot.run_id);
    const fingerprint = JSON.stringify([snapshot.run_id, ...lanes.map(lane => snapshot.agents[lane].intents.length), ...lanes.map(lane => [snapshot.traces[lane].at(-1)?.time, snapshot.server_traces?.[lane]?.at(-1)?.time])]);
    if (moreTrace || fingerprint !== traceFingerprint) { await loadEvents(); traceFingerprint = fingerprint; }
    paint();
  } catch (error) { message(error.message, true); }
  if (enabled) timer = setTimeout(refresh, document.hidden ? 2000 : 350);
}
window.addEventListener('pagehide', () => { enabled = false; clearTimeout(timer); });
window.addEventListener('pageshow', event => { if (event.persisted && !enabled) { enabled = true; refresh(); } });
refresh();
