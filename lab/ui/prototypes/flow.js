// Visual fixtures only. This page does not call or control the live lab.
const $ = id => document.getElementById(id);
const el = (tag, text = '', className = '') => {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
};
const cases = {
  normal: 'Bình thường', request: 'Mất yêu cầu', response: 'Mất phản hồi sau khi ghi',
  late: 'Phản hồi chậm quá hạn', outage: 'Đứt mạng'
};
const phaseNames = {
  queued: 'Agent phát ý định', sent: 'Bridge gửi yêu cầu', blocked_outbound: 'Yêu cầu không tới server',
  server_written: 'Server ghi và gửi phản hồi', blocked_return: 'Phản hồi không tới bridge',
  waiting_reply: 'Phản hồi chưa về kịp', blocked_both: 'Mất kết nối',
  unknown: 'Hết thời gian chờ: kết quả chưa biết', retry: 'Bridge thử lại',
  server_retry: 'Server xử lý yêu cầu thử lại', confirmed: 'Bridge xác nhận kết quả'
};
let mode = 'compare', caseName = 'response', explainCount = 1, compareCount = 100;
let retryLimit = 5, step = 0, timer = null, restored = false, faultRate = 30, compareCursor = 100;
const duplicates = [8, 20, 42, 51, 69, 90];

function story() {
  const first = {
    normal: ['queued', 'sent', 'server_written', 'confirmed'],
    request: ['queued', 'sent', 'blocked_outbound', 'unknown', 'retry', 'server_written', 'confirmed'],
    response: ['queued', 'sent', 'server_written', 'blocked_return', 'unknown', 'retry', 'server_retry', 'confirmed'],
    late: ['queued', 'sent', 'server_written', 'waiting_reply', 'unknown', 'retry', 'server_retry', 'confirmed'],
    outage: ['queued', 'sent', 'blocked_both', 'unknown']
  }[caseName];
  const events = first.map(phase => ({ seq: 1, phase }));
  if (caseName === 'outage' && !restored) return events;
  if (caseName === 'outage') events.push(...['retry', 'server_written', 'confirmed'].map(phase => ({ seq: 1, phase })));
  for (let seq = 2; seq <= explainCount; seq++) {
    events.push(...['queued', 'sent', 'server_written', 'confirmed'].map(phase => ({ seq, phase })));
  }
  return events;
}
function emptyLane() {
  return { rows: [], sent: 0, received: 0, replies: 0, confirmed: 0, timeouts: 0, rejected: 0, bridge: [], server: [], status: 'Chưa gửi' };
}
function log(list, number, text, state = 'info') { list.push({ number, text, state }); }
function applyEvent(model, event, number) {
  const { seq, phase } = event;
  if (phase === 'queued') {
    model.agent.push(seq);
    log(model.agentLog, number, `Phát Task ${seq} · ý định op-${seq}`, 'send');
  }
  for (const kind of ['off', 'on']) {
    const lane = model[kind];
    const task = `Task ${seq}`;
    if (phase === 'sent' || phase === 'retry') {
      lane.sent++;
      lane.status = 'Đang chờ phản hồi';
      const action = phase === 'retry' ? 'Thử lại' : 'Gửi';
      log(lane.bridge, number, `${action} ${task} · ${kind === 'on' ? `giữ ID op-${seq}` : 'API tạo ID mới'}`, 'send');
    }
    if (phase === 'server_written' || phase === 'server_retry') {
      lane.received++;
      log(lane.server, number, `Nhận yêu cầu ${task}`, 'receive');
      if (phase === 'server_retry' && kind === 'on') {
        log(lane.server, number, `ID op-${seq} đã có · giữ bản ghi cũ`, 'replay');
      } else {
        lane.rows.push(seq);
        const duplicate = lane.rows.filter(n => n === seq).length > 1;
        log(lane.server, number, `Ghi ${task}${duplicate ? ' thêm một bản' : ''} · commit xong`, duplicate ? 'duplicate' : 'confirmed');
      }
      log(lane.server, number, 'Gửi phản hồi thành công', 'send');
    }
    if (phase === 'unknown') {
      lane.timeouts++;
      lane.status = '? Chưa biết kết quả';
      log(lane.bridge, number, `${task}: timeout · chưa đủ bằng chứng`, 'unknown');
    }
    if (phase === 'confirmed') {
      lane.replies++;
      lane.confirmed++;
      lane.status = `✓ Đã xác nhận Task ${seq}`;
      log(lane.bridge, number, `Nhận phản hồi hợp lệ · xác nhận ${task}`, 'confirmed');
    }
  }
}
function scene() {
  const model = { agent: [], agentLog: [], off: emptyLane(), on: emptyLane(), phase: 'queued', seq: 1 };
  if (mode === 'explain') {
    const events = story().slice(0, step + 1);
    events.forEach((event, i) => applyEvent(model, event, i + 1));
    return Object.assign(model, events.at(-1));
  }
  // A declared snapshot, not a stochastic simulation or benchmark.
  for (let seq = 1; seq <= compareCursor; seq++) {
    model.agent.push(seq);
    log(model.agentLog, seq, `Phát Task ${seq} · ý định op-${seq}`, 'send');
    const off = model.off;
    off.sent++; off.received++; off.rows.push(seq); off.replies++; off.confirmed++;
    log(off.bridge, seq, `Gửi Task ${seq}`, 'send');
    log(off.server, seq, `Nhận và ghi Task ${seq} · gửi phản hồi`, 'confirmed');
    if (duplicates.includes(seq)) {
      off.sent++; off.received++; off.rows.push(seq); off.timeouts++;
      log(off.bridge, seq, `Task ${seq}: timeout · thử lại`, 'unknown');
      log(off.server, seq, `Yêu cầu thử lại có ID mới · ghi thêm Task ${seq}`, 'duplicate');
    }
    log(off.bridge, seq, `Đã xác nhận Task ${seq}`, 'confirmed');
    if (seq <= 12) {
      const on = model.on;
      on.sent++; on.received++; on.rows.push(seq); on.replies++; on.confirmed++;
      log(on.bridge, seq, `Gửi và xác nhận Task ${seq} · ID op-${seq}`, 'confirmed');
      log(on.server, seq, `Ghi Task ${seq} · gửi phản hồi`, 'confirmed');
    }
  }
  model.off.status = compareCursor ? `✓ Đã xác nhận ${compareCursor}/${compareCursor}` : 'Chưa gửi';
  if (compareCursor >= 13) {
    const on = model.on;
    on.rows.push(13); on.received++;
    log(on.server, 13, 'Ghi Task 13 · gửi phản hồi', 'confirmed');
    for (let attempt = 1; attempt <= retryLimit; attempt++) {
      on.sent++; on.timeouts++;
      log(on.bridge, 13, `Task 13 · lần ${attempt}: timeout · chưa biết kết quả`, 'unknown');
    }
    on.status = `? Task 13 chưa xác nhận · ${compareCursor - 13} ý định chưa gửi`;
    model.phase = 'unknown'; model.seq = 13;
  } else model.on.status = compareCursor ? `✓ Đã xác nhận ${compareCursor}/${compareCursor}` : 'Chưa gửi';
  return model;
}
const symbols = { send: '→', receive: '↓', confirmed: '✓', unknown: '?', duplicate: '↻', replay: '=' };
function shortEvent(row) {
  const task = row.text.match(/Task (\d+)/)?.[1];
  if (!task) return row.text;
  if (row.text.startsWith('Phát')) return `Phát Task ${task}`;
  if (row.text.includes('lần ') && row.state === 'unknown') return `Task ${task} · timeout ${row.text.match(/lần (\d+)/)[1]}/${retryLimit}`;
  if (row.text.startsWith('Nhận và ghi') || row.text.startsWith('Ghi Task')) return `Ghi Task ${task} · đã gửi phản hồi`;
  if (row.text.includes('xác nhận') || row.text.includes('Xác nhận')) return `Xác nhận Task ${task}`;
  if (row.state === 'duplicate') return `Ghi thêm Task ${task} · ID mới`;
  return row.text;
}
function logView(title, rows, className = '') {
  const details = el('details', '', `observation ${className}`);
  details.open = mode === 'explain';
  details.append(el('summary', title));
  const list = el('ol', '', 'observation-log');
  if (!rows.length) list.append(el('li', 'Chưa có sự kiện.', 'quiet'));
  for (const row of rows) {
    const item = el('li', '', row.state);
    item.append(el('span', `${row.number}`, 'log-step'), el('b', symbols[row.state] || '·', 'log-symbol'), el('span', row.text));
    list.append(item);
  }
  details.append(list);
  return details;
}
function fullLog(title, rows) {
  const group = el('section', '', 'log-group');
  group.append(el('h3', title));
  const list = el('ol', '', 'observation-log');
  if (!rows.length) list.append(el('li', 'Chưa có sự kiện.', 'quiet'));
  for (const row of rows) {
    const item = el('li', '', row.state);
    item.append(el('span', `${row.number}`, 'log-step'), el('b', symbols[row.state] || '·', 'log-symbol'), el('span', row.text));
    list.append(item);
  }
  group.append(list);
  return group;
}
function stateWindow(rows, nextAction) {
  const window = el('div', '', 'state-window');
  const previous = rows.at(-2), current = rows.at(-1);
  for (const [label, text, className] of [
    ['Vừa qua', previous ? `${symbols[previous.state] || '·'} ${shortEvent(previous)}` : 'Chưa có sự kiện trước', 'previous'],
    ['Hiện tại', current ? `${symbols[current.state] || '·'} ${shortEvent(current)}` : 'Chưa có sự kiện', 'current'],
    ['Tiếp theo', nextAction, 'upcoming']
  ]) {
    const row = el('div', '', `state-row ${className}`);
    row.append(el('span', label, 'state-label'), el('span', text));
    window.append(row);
  }
  window.setAttribute('aria-label', 'Sự kiện trước, hiện tại và hành động dự kiến');
  return window;
}
function nodes(rows, kind, total = 0) {
  const grid = el('div', '', 'nodes');
  const counts = new Map(); rows.forEach(n => counts.set(n, (counts.get(n) || 0) + 1));
  for (const n of rows) {
    const duplicate = kind === 'server' && counts.get(n) > 1;
    const node = el('button', `${n}`, `node ${kind === 'agent' ? 'emitted' : duplicate ? 'duplicate' : ''}`);
    node.setAttribute('aria-label', `Task ${n}: ${kind === 'agent' ? 'Agent đã phát' : duplicate ? 'ghi thừa cùng ý định' : 'server đã ghi'}`);
    node.onclick = () => { $('selection').textContent = node.getAttribute('aria-label'); };
    grid.append(node);
  }
  if (mode === 'compare' && kind === 'server') {
    for (let n = 1; n <= total; n++) if (!counts.has(n)) {
      const node = el('button', `${n}`, 'node waiting');
      node.setAttribute('aria-label', `Task ${n}: chưa có bản ghi ở server`);
      node.onclick = () => { $('selection').textContent = node.getAttribute('aria-label'); };
      grid.append(node);
    }
  }
  if (!grid.childElementCount) grid.append(el('p', 'Chưa có bản ghi.', 'empty'));
  return grid;
}
function metric(label, value, className = '') {
  const item = el('div', '', `metric ${className}`);
  item.append(el('strong', value), el('span', label));
  return item;
}
function agentPanel(model) {
  const panel = el('article', '', 'card agent agent-panel');
  const head = el('div', '', 'lane-head'); head.append(el('h2', 'Agent giả lập'), el('span', `${model.agent.length} ý định đã phát`));
  panel.append(head, nodes(model.agent, 'agent'));
  panel.append(mode === 'explain' ? logView('Agent · lệnh đã phát', model.agentLog) : stateWindow(model.agentLog, compareCursor < compareCount ? `Dự kiến phát Task ${compareCursor + 1}` : 'Đã phát hết · chờ xử lý'));
  for (const kind of ['off', 'on']) {
    const lane = model[kind], section = el('section', '', `bridge-observation ${kind}`);
    section.append(el('h3', `Bridge · miAssura ${kind === 'off' ? 'tắt' : 'bật'}`));
    if (mode === 'explain') {
      section.append(el('p', lane.status, 'bridge-status'), logView(`Nhật ký bridge · ${lane.timeouts} lần timeout`, lane.bridge));
    } else section.append(stateWindow(lane.bridge, kind === 'on' && compareCursor >= 13 ? 'Chặn chuỗi · chờ phục hồi' : 'Chờ ý định mới'));
    panel.append(section);
  }
  return panel;
}
function networkPanel(model) {
  const panel = el('aside', '', 'shared-network');
  const black = el('div', '', 'blackbox');
  black.append(el('strong', 'Đường bất định'), el('span', 'TCP / TLS · lệnh đi, kết quả về'), el('p', mode === 'compare' ? 'Cùng một hồ sơ mạng' : cases[caseName], 'network-case'));
  panel.append(black);
  const caption = el('p', 'Quan sát tại hai đầu', 'network-caption');
  const table = el('table', '', 'endpoint-metrics');
  const head = el('tr'); head.append(el('th', ''), el('th', 'Tắt'), el('th', 'Bật')); table.append(head);
  for (const [label, field] of [['Lượt gửi →', 'sent'], ['← Phản hồi tới bridge', 'replies']]) {
    const row = el('tr'); row.append(el('th', label), el('td', model.off[field]), el('td', model.on[field])); table.append(row);
  }
  panel.append(caption, table, el('p', 'Một black box biểu diễn môi trường mạng chung; hai luồng vẫn độc lập.', 'network-footnote'));
  if (mode === 'explain') panel.append(el('p', phaseNames[model.phase], 'network-phase'));
  return panel;
}
function serverPanel(kind, model) {
  const lane = model[kind], panel = el('article', '', `card server-panel ${kind}`);
  const head = el('div', '', 'lane-head'); head.append(el('h2', `Server · miAssura ${kind === 'off' ? 'tắt' : 'bật'}`));
  const metrics = el('div', '', 'server-metrics');
  metrics.append(metric('Đã ghi', lane.rows.length), metric('Ghi thừa', lane.rows.length - new Set(lane.rows).size, 'duplicate'), metric('Từ chối', lane.rejected));
  panel.append(head, metrics, nodes(lane.rows, 'server', compareCount));
  panel.append(mode === 'explain' ? logView(`Nhật ký server · ${lane.received} yêu cầu nhận được`, lane.server) : stateWindow(lane.server, 'Chờ yêu cầu tiếp theo'));
  return panel;
}
function render() {
  const model = scene();
  document.body.dataset.mode = mode;
  $('board').replaceChildren();
  const servers = el('section', '', 'server-column'); servers.append(serverPanel('off', model), serverPanel('on', model));
  $('board').append(agentPanel(model), networkPanel(model), servers);
  $('stageNote').textContent = mode === 'compare'
    ? `Mẫu ${compareCursor}/${compareCount} ý định · minh họa bố cục, không phải benchmark.`
    : `Bước ${step + 1}/${story().length} · Task ${model.seq}: ${phaseNames[model.phase]}`;
  for (const id of ['compare', 'explain']) $(id).classList.toggle('active', mode === id);
  for (const id of ['caseLabel', 'explainCountLabel']) $(id).hidden = mode !== 'explain';
  for (const id of ['compareConfig', 'faultControl']) $(id).hidden = mode !== 'compare';
  $('prev').disabled = mode === 'compare' ? compareCursor === 0 : step === 0;
  $('next').disabled = mode === 'compare' ? compareCursor >= compareCount : step >= story().length - 1;
  $('pause').disabled = !timer;
  $('resume').disabled = !!timer || (mode === 'explain' && step >= story().length - 1);
  $('resume').textContent = mode === 'compare' && compareCursor >= compareCount ? 'Phát lại mẫu' : 'Tiếp tục';
  $('restore').hidden = mode !== 'explain' || caseName !== 'outage' || restored;
  $('faultValue').textContent = `${faultRate}%`;
  $('fullTrace').replaceChildren();
  const clientTrace = el('article', '', 'trace-column');
  clientTrace.append(el('h2', 'Agent và bridge'), fullLog('Agent · ý định đã phát', model.agentLog));
  for (const kind of ['off', 'on']) clientTrace.append(fullLog(`Bridge · miAssura ${kind === 'off' ? 'tắt' : 'bật'}`, model[kind].bridge));
  $('fullTrace').append(clientTrace);
  for (const kind of ['off', 'on']) {
    const serverTrace = el('article', '', `trace-column ${kind}`);
    serverTrace.append(el('h2', `Server · miAssura ${kind === 'off' ? 'tắt' : 'bật'}`), fullLog('Yêu cầu và xử lý', model[kind].server));
    $('fullTrace').append(serverTrace);
  }
}
function pause() { if (timer) clearTimeout(timer); timer = null; }
function reset() { pause(); step = 0; restored = false; compareCursor = compareCount; render(); }
function resume() {
  if (timer || (mode === 'explain' && step >= story().length - 1)) return;
  if (mode === 'compare' && compareCursor >= compareCount) compareCursor = 0;
  const tick = () => {
    if (mode === 'compare') compareCursor = Math.min(compareCursor + 1, compareCount);
    else step = Math.min(step + 1, story().length - 1);
    if (mode === 'compare' ? compareCursor < compareCount : step < story().length - 1) timer = setTimeout(tick, 1200); else timer = null;
    render();
  };
  timer = setTimeout(tick, 1200); render();
}
document.body.classList.add('flow-review');
$('app').innerHTML = `<header><div><h1>microLink / miAssura</h1><p>Reliability Through Uncertainty</p></div><nav><a href="a.html">A · Bảng node</a><a class="selected" href="b.html">B · Black box</a><a href="c.html">C · Timeline</a></nav><span class="prototype">Prototype · dữ liệu minh họa</span></header>
<div class="controls"><div class="switcher"><button id="compare">Đối chứng</button><button id="explain">Giải thích</button></div><div id="quickNetwork"></div>
<div class="actions" id="compareConfig"><label>Số task <input id="compareCount" type="number" min="1" max="100" value="100"></label><label>Tối đa lần gửi <input id="retryLimit" type="number" min="1" max="250" value="5"></label><button id="applySample">Áp dụng mẫu</button></div>
<div class="actions"><label id="caseLabel">Tình huống <select id="case"></select></label><label id="explainCountLabel">Số task <select id="explainCount"><option>1</option><option>2</option><option>3</option></select></label>
<div id="stepControls" class="actions"><button id="prev">← Bước trước</button><button id="next" class="primary">Bước tiếp →</button><button id="pause">Tạm dừng</button><button id="resume">Tiếp tục</button></div><button id="restore">Khôi phục mạng</button></div></div>
<div id="faultControl" class="fault-control"><label for="faultRate">Điều kiện bất lợi</label><input id="faultRate" type="range" min="0" max="100" value="30"><strong id="faultValue">30%</strong><span>Điều khiển minh họa · chưa tác động dữ liệu mẫu</span></div>
<p id="stageNote" class="stage-note"></p><section id="board" class="shared-board" aria-label="Agent, đường bất định và hai server"></section>
<div class="legend"><span><i class="dot purple"></i>Ý định đã phát</span><span><i class="dot"></i>Server đã ghi</span><span><i class="dot red"></i>↻ Ghi thừa</span><span>Ô xám: chưa có bản ghi</span></div>
<p id="selection" class="detail">Bridge ở phía Agent; trạng thái ghi và xử lý request ở phía server. Mở nhật ký để đọc theo thứ tự.</p>
<section class="below"><details id="settings"><summary>Cấu hình chi tiết của bản live</summary><p>Số task, tốc độ Agent, giới hạn retry, loại bất định, tỷ lệ, trọng số, seed, thời gian gây lỗi, độ trễ và băng thông được giữ. “Tối đa lần gửi” gồm cả lần đầu: 5 lần gửi tương đương tối đa 4 lần thử lại.</p><p>Thanh tỷ lệ trên prototype chỉ thử bố cục. Dữ liệu Đối chứng là một snapshot minh họa; thay số task hoặc lần gửi sẽ cập nhật snapshot, không chạy thí nghiệm mạng.</p><p>Khung ba dòng hiển thị sự kiện vừa qua, sự kiện hiện tại và hành động tiếp theo dự kiến. Dòng sau không phải bằng chứng rằng kết quả đã xảy ra.</p></details></section>
<section class="full-trace" aria-labelledby="traceHeading"><h2 id="traceHeading">Bằng chứng và trace đầy đủ</h2><p>Log theo thời gian tại mỗi nguồn · dữ liệu minh họa, không giới hạn số dòng.</p><div id="fullTrace" class="trace-columns"></div></section>`;
for (const [value, label] of Object.entries(cases)) $('case').append(new Option(label, value));
$('settings').append($('compareConfig'));
$('quickNetwork').append($('faultControl'));
$('case').value = caseName;
for (const id of ['compare', 'explain']) $(id).onclick = () => { mode = id; reset(); };
$('case').onchange = () => { caseName = $('case').value; reset(); };
$('explainCount').onchange = () => { explainCount = +$('explainCount').value; reset(); };
$('applySample').onclick = () => {
  pause();
  compareCount = Math.max(1, Math.min(100, Math.trunc(+$('compareCount').value || 1)));
  retryLimit = Math.max(1, Math.min(250, Math.trunc(+$('retryLimit').value || 1)));
  compareCursor = compareCount;
  $('compareCount').value = compareCount;
  $('retryLimit').value = retryLimit;
  render();
};
$('faultRate').oninput = () => { faultRate = +$('faultRate').value; $('faultValue').textContent = `${faultRate}%`; };
$('prev').onclick = () => { pause(); if (mode === 'compare') compareCursor = Math.max(0, compareCursor - 1); else step = Math.max(0, step - 1); render(); };
$('next').onclick = () => { pause(); if (mode === 'compare') compareCursor = Math.min(compareCount, compareCursor + 1); else step = Math.min(story().length - 1, step + 1); render(); };
$('pause').onclick = () => { pause(); render(); };
$('resume').onclick = resume;
$('restore').onclick = () => { restored = true; render(); };
window.addEventListener('pagehide', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); render(); } });
render();
