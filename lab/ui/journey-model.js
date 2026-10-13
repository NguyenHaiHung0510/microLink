/* Presentation fixtures only. No network calls, database reads or live policy inputs. */
(function (root) {
  'use strict';
  const cases = [
    {id:'normal', name:'Bình thường'},
    {id:'request', name:'Yêu cầu không tới server'},
    {id:'response', name:'Mất phản hồi sau khi ghi'},
    {id:'delay', name:'Phản hồi chậm', variants:[['before','Trong thời hạn'],['after','Quá thời hạn']]},
    {id:'reset', name:'Kết nối bị ngắt', variants:[['before','Trước khi API nhận đủ'],['after','Sau khi đã ghi']]},
    {id:'partial', name:'Phản hồi không đầy đủ'},
    {id:'outage', name:'Đứt mạng vượt giới hạn gửi'},
    {id:'parent', name:'Task cha → checklist'}
  ];
  const policies = ['off', 'on'];
  const intentId = (policy, task) => `${policy.toUpperCase()}-${task}`;
  const receipt = (policy, task, attempt) => ({
    id:intentId(policy, task), payload:task,
    recordId:policy === 'on' ? intentId(policy, task) : `${policy}-${task}-${attempt}`
  });

  function build(caseId, options = {}) {
    if (!cases.some(c => c.id === caseId)) throw new Error('Unknown journey');
    const variant = options.variant || (caseId === 'delay' ? 'after' : 'before');
    const limit = Math.max(1, Math.min(5, Math.floor(Number(options.limit) || 3)));
    const frames = [];
    function add(at, title, explanation, kind, data = {}) {
      const actions = policies.map(policy => ({policy, kind, ...data,
        ...(kind === 'receipt' || kind === 'late' ? {receipt:receipt(policy, data.task || 'T1', data.attempt)} : {})
      }));
      frames.push({at, title, explanation, actions});
    }
    const task = caseId === 'parent' ? 'P' : 'T1';
    add(0, 'Agent gọi công cụ qua MCP/STDIO',
      'Một ý định tạo task được giao cho mỗi bridge. Hai luồng có ID và kết quả riêng.', 'call', {task});
    if (caseId === 'parent') {
      add(.1, 'Checklist phụ thuộc task cha',
        'Host giữ checklist trong hàng đợi. Chưa có xác nhận tạo cha thì chưa gửi con.', 'queueChild');
    }
    add(.2, 'Bridge gửi yêu cầu HTTPS · lần 1',
      'Request ID của lần gửi khác ID của ý định. Chưa nhận bằng chứng thì chưa báo thành công.', 'send', {task, attempt:1});

    if (caseId === 'outage') {
      add(.4, 'Đường truyền bị ngắt liên tục',
        'Trong mô hình này không yêu cầu nào tới API. Bridge không nhìn thấy sự thật đó.', 'fault', {network:'→ Không kết nối được', adverse:true});
      for (let attempt = 1; attempt <= limit; attempt++) {
        if (attempt > 1) add((attempt-1)*3.5+.2, `Thử lại · lần ${attempt}`,
          'Cùng ý định; một lần gửi mới. Kết nối vẫn chưa phục hồi.', 'send', {task, attempt});
        add((attempt-1)*3.5+3.2, `Hết thời hạn chờ · lần ${attempt}`,
          'Không có receipt hợp lệ. UNKNOWN chỉ nói bridge chưa biết kết quả.', 'timeout', {reason:'Không có phản hồi', task});
      }
      add(limit*3.5, 'Đã dùng hết giới hạn gửi',
        'Dừng với UNKNOWN. Không báo ghi thất bại, không hứa sẽ hoàn tất khi mạng chưa trở lại.', 'budget', {limit});
      return {caseId, variant, limit, frames};
    }

    const requestBlocked = caseId === 'request' || (caseId === 'reset' && variant === 'before');
    if (requestBlocked) {
      add(.4, caseId === 'reset' ? 'Kết nối ngắt trước khi API nhận đủ' : 'Yêu cầu bị cản ở chiều đi',
        'Ca đã chọn không giao đủ request cho API; server chưa ghi. Bridge không được dùng observer để biết điều này.',
        'fault', {network:caseId === 'reset' ? '→ Kết nối bị ngắt' : '→ Yêu cầu bị cản', adverse:true});
    } else {
      add(.4, 'API nhận yêu cầu', 'API có request; nhận request chưa có nghĩa transaction đã commit.', 'receive', {task});
      add(.7, 'Server commit bản ghi',
        'Bản ghi đã tồn tại ở server. Bridge vẫn chỉ đang chờ; commit không tự gửi bằng chứng sang bridge.', 'commit', {task, attempt:1});
      add(.8, 'API gửi receipt về',
        'Server gửi kết quả sau commit. Bridge vẫn phải nhận đủ và kiểm tra phản hồi.', 'response', {task});
      const normal = caseId === 'normal' || (caseId === 'delay' && variant === 'before');
      if (normal) {
        if (caseId === 'delay') add(.9, 'Phản hồi đang truyền chậm',
          'Độ trễ không tự gây retry. Quan trọng là có receipt hợp lệ trước deadline hay không.', 'fault', {network:'← Phản hồi đang chậm', adverse:true});
        add(caseId === 'delay' ? 2.5 : .9, 'Receipt tới bridge và được kiểm tra',
          'Receipt khớp ý định, payload và lần gửi đang chờ. Bây giờ bridge mới xác nhận.', 'receipt', {task, attempt:1});
        add(caseId === 'delay' ? 2.6 : 1, 'Tool result trở về Agent',
          'Agent nhận kết quả đã xác nhận qua MCP/STDIO. Hai luồng đều thành công khi không cần phục hồi.', 'finish');
        return {caseId, variant, limit, frames};
      }
      const network = caseId === 'delay' ? '← Chậm quá deadline' : caseId === 'partial' ? '← Phản hồi thiếu dữ liệu' :
        caseId === 'reset' ? '← Kết nối bị ngắt' : '← Phản hồi bị cản';
      add(.9, 'Server đã gửi; bridge chưa có receipt hợp lệ',
        caseId === 'partial' ? 'Truyền dở hoặc lỗi giải mã/kiểm tra phản hồi không đủ để xác nhận một thao tác ghi.' :
          'Gửi response tại API không chứng minh bridge nhận được. Sự cố nằm ở đường kết quả về.', 'fault', {network, adverse:true});
    }
    add(caseId === 'reset' ? 1.2 : 3.2, caseId === 'reset' ? 'Bridge nhận lỗi kết nối' : 'Hết thời hạn chờ',
      'Bridge chuyển sang UNKNOWN. Cùng quan sát này có thể tương ứng với chưa ghi hoặc đã ghi ở server.',
      'timeout', {task, reason:caseId === 'reset' ? 'Kết nối bị ngắt' : caseId === 'partial' ? 'Không có receipt đầy đủ' : 'Quá thời hạn chờ'});
    if (caseId === 'delay') {
      add(4.5, 'Phản hồi cũ tới sau deadline',
        'Ca này giả định request cũ đã đóng khi timeout. Phản hồi muộn không được nhận làm kết quả của lần gửi mới.', 'late', {task, attempt:1});
    }
    const resumed = caseId === 'delay' ? 4.6 : caseId === 'reset' ? 1.5 : 4;
    add(resumed, 'Đường truyền phục hồi', 'Kết nối có thể dùng lại; trạng thái UNKNOWN chưa tự trở thành thành công.', 'network');
    add(resumed+.2, 'Bridge gửi lại cùng ý định · lần 2',
      'miAssura giữ ID và payload. Luồng tắt dùng create thông thường; API của luồng đó không khử tác dụng lặp.', 'send', {task, attempt:2});
    add(resumed+.4, 'API nhận lần gửi lại', 'Hai luồng xử lý request độc lập; không dùng chung kết quả trả về.', 'receive', {task});
    add(resumed+.5, 'Server tạo mới hoặc trả lại bản ghi cũ',
      requestBlocked ? 'Chưa có bản ghi từ lần 1: cả hai luồng tạo một bản ghi.' :
        'Luồng tắt tạo thêm bản ghi; luồng bật tìm ID đã commit và replay. Unique ID là hợp đồng phía API.', 'commit', {task, attempt:2});
    add(resumed+.6, 'API gửi receipt của lần 2', 'Response là bằng chứng đang trên đường về, chưa phải xác nhận tại bridge.', 'response', {task});
    add(resumed+.7, 'Receipt của lần 2 tới bridge',
      'Bridge xác nhận từ receipt khớp ý định và payload, không lấy số bản ghi từ màn hình server làm bằng chứng.', 'receipt', {task, attempt:2});
    if (caseId === 'parent') {
      add(resumed+.8, 'Cha đã được xác nhận; mới gửi checklist',
        'Mỗi host dùng record ID của cha trong receipt riêng. Cổng phụ thuộc chặn con cho tới mốc này.', 'send', {task:'C', attempt:1});
      add(resumed+1, 'API nhận checklist', 'Request của con tham chiếu đúng bản ghi cha đã xác nhận của luồng đó.', 'receive', {task:'C'});
      add(resumed+1.1, 'Server commit checklist', 'Con được tạo dưới cha đã tồn tại. Không tự tạo cha khi chưa nhận lệnh tạo cha.', 'commit', {task:'C', attempt:1});
      add(resumed+1.2, 'API gửi receipt của checklist', 'Kết quả đi ngược về bridge; con vẫn chưa được xác nhận ở phía Agent.', 'response', {task:'C'});
      add(resumed+1.3, 'Receipt của checklist tới bridge', 'Bridge xác nhận con từ receipt hợp lệ, hoàn thành chuỗi phụ thuộc.', 'receipt', {task:'C', attempt:1});
    }
    add(resumed+(caseId === 'parent' ? 1.4 : .8), 'Tool result trở về Agent',
      'Đã xác nhận không đồng nghĩa baseline không ghi thừa. Đối chiếu riêng bằng chứng bridge và tác dụng thật ở server.', 'finish');
    return {caseId, variant, limit, frames};
  }

  function initial(policy) {
    return {policy, task:'T1', intent:'—', attempt:0, status:'not_sent', deadline:null,
      client:'Chưa gửi', decision:'Chờ ý định từ Agent', server:'Chưa nhận yêu cầu',
      network:'Sẵn sàng', adverse:false, records:[], received:0, confirmations:{},
      queuedChild:false, log:[], parentRef:null, receipt:null};
  }
  function apply(state, action, at) {
    const task = action.task || state.task;
    const id = intentId(state.policy, task);
    let source = 'Mạng', message = '', mark = 'info';
    switch (action.kind) {
      case 'call':
        state.task = task; state.intent = id;
        state.client = `Agent gọi tools/call · tạo ${task}`; state.decision = 'Giao ý định cho bridge';
        source = 'Agent'; message = state.client; break;
      case 'queueChild':
        state.queuedChild = true; state.decision = 'Giữ checklist · chưa xác nhận cha';
        source = 'Host'; message = state.decision; break;
      case 'path':
        source = action.stage === 1 ? 'MCP client' : action.stage === 0 ? 'Agent' : 'Bridge';
        message = action.stage === 2 ? 'Snapshot thao tác · giữ payload qua retry' : action.stage === 1 && state.attempt === 0 ? 'Gửi tools/call qua STDIO' : state.attempt ? `Trả tool result · ${state.status.toUpperCase()}` : 'Chuẩn bị tools/call';
        mark = state.status === 'confirmed' ? 'confirmed' : state.status === 'unknown' ? 'unknown' : 'info';
        break;
      case 'send':
        if (task === 'C' && !state.confirmations.P) throw new Error('Child sent before confirmed parent');
        state.task = task; state.intent = id; state.attempt = action.attempt;
        state.status = 'waiting'; state.deadline = at + 3; state.receipt = null;
        state.parentRef = task === 'C' ? state.confirmations.P.recordId : null;
        if (task === 'C') state.queuedChild = false;
        state.client = `Gửi ${task} · lần ${action.attempt}`;
        state.decision = 'Chờ receipt hợp lệ';
        state.network = state.adverse ? '→ Vẫn không kết nối được' : `→ Request R${action.attempt}`;
        source = 'Bridge'; message = `${state.client} · ID ${id}${state.parentRef ? ` · cha ${state.parentRef}` : ''}`; break;
      case 'receive':
        state.received++; state.server = `Nhận ${task} · chuẩn bị xử lý`;
        state.network = '→ Yêu cầu đã tới API'; source = 'API'; message = state.server; break;
      case 'commit': {
        const existing = state.policy === 'on' && state.records.find(row => row.id === id);
        if (existing && existing.payload !== task) throw new Error('Intent payload conflict');
        if (!existing) state.records.push({...receipt(state.policy, task, action.attempt), task, parent:state.parentRef});
        state.server = existing ? `Replay ${task} · không ghi thêm` : `Commit ${task} · bản ghi mới`;
        source = 'API'; message = `${state.server}${state.parentRef ? ` · dưới cha ${state.parentRef}` : ''}`;
        mark = existing ? 'replay' : state.records.filter(row => row.id === id).length > 1 ? 'duplicate' : 'commit'; break;
      }
      case 'fault':
        state.network = action.network; state.adverse = action.adverse;
        message = action.network; mark = 'fault'; break;
      case 'response':
        state.server = `Gửi receipt ${task} · sau commit`; state.network = '← Receipt đang về';
        source = 'API'; message = state.server; break;
      case 'timeout':
        state.status = 'unknown'; state.client = `Chưa biết · ${action.reason}`;
        state.decision = state.queuedChild ? 'Giữ con · phục hồi cha trước' : 'Cân nhắc gửi lại theo hợp đồng API';
        source = 'Bridge'; message = `${state.client} · lần ${state.attempt}`; mark = 'unknown'; break;
      case 'late':
        state.network = '← Phản hồi cũ · không sử dụng';
        source = 'Bridge'; message = 'Phản hồi R1 muộn · request đã đóng · không xác nhận'; mark = 'unknown'; break;
      case 'network':
        state.adverse = false; state.network = 'Đường truyền phục hồi'; message = state.network; break;
      case 'receipt':
        // Confirm only from the supplied receipt, never by inspecting server records.
        if (action.attempt !== state.attempt || action.receipt.id !== state.intent || action.receipt.payload !== state.task)
          throw new Error('Receipt does not match the pending intent/attempt');
        state.receipt = {...action.receipt}; state.confirmations[task] = {...action.receipt};
        state.status = 'confirmed'; state.client = `Xác nhận ${task} · receipt khớp`;
        state.decision = state.queuedChild ? 'Cha đã xác nhận · được gửi con' : 'Trả kết quả đã xác nhận';
        state.server = `Đã gửi receipt ${task}`; state.network = '← Receipt hợp lệ đã tới bridge'; state.adverse = false;
        source = 'Bridge'; message = `${state.client} · record ${action.receipt.recordId}`; mark = 'confirmed'; break;
      case 'budget':
        state.status = 'unknown'; state.client = `Chưa biết · hết ${action.limit} lần gửi`;
        state.decision = 'Dừng chuỗi · trả UNKNOWN cho Agent'; source = 'Bridge'; message = state.decision; mark = 'unknown'; break;
      case 'finish':
        state.client = 'Agent nhận tool result đã xác nhận'; state.decision = 'Hoàn tất kịch bản';
        source = 'Agent'; message = state.client; mark = 'confirmed'; break;
      default: throw new Error('Unknown journey event');
    }
    state.log.push({at, source, message, mark});
  }
  function snapshot(journey, index) {
    const position = Math.max(0, Math.min(journey.frames.length-1, index));
    const lanes = policies.map(initial);
    for (const frame of journey.frames.slice(0, position+1)) {
      frame.actions.forEach((action, lane) => apply(lanes[lane], action, frame.at));
    }
    return {position, frame:journey.frames[position], lanes};
  }
  const api = {cases, build, snapshot};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MiAssuraJourney = api;
})(typeof globalThis === 'object' ? globalThis : this);
