/* Presentation specimens only; no observer data or network calls. */
(function (root) {
  'use strict';
  const stations = ['Agent', 'MCP client', 'microLink', 'Đường bất định', 'API server', 'PostgreSQL'];
  const roles = ['Chọn tool + tham số', 'JSON-RPC qua STDIO', 'MCP server + HTTPS bridge', 'Lệnh đi / kết quả về', 'Kiểm khóa và payload', 'Unique ID + transaction'];

  function expand(journey) {
    const frames = [];
    const pathFrame = (frame, stage, title, explanation) => ({
      at:frame.at, title, explanation,
      actions:frame.actions.map(action => ({policy:action.policy, kind:'path', stage}))
    });
    for (const frame of journey.frames) {
      const kind = frame.actions[0].kind;
      if (kind === 'call') {
        frames.push({...frame, title:'Agent chọn create_task và tham số',
          explanation:'Host giao lời gọi cho MCP client. Mỗi luồng có ID, bridge và kết quả riêng.'});
        frames.push(pathFrame(frame, 1, 'MCP client gửi tools/call qua STDIO',
          'JSON-RPC ID ghép lời gọi với tool result. Khóa phục hồi ở API là một ID khác.'));
        frames.push(pathFrame(frame, 2, 'microLink nhận và snapshot thao tác',
          'MCP server cũng là HTTPS bridge. ID và payload snapshot được giữ qua các lần thử gửi.'));
      } else if (kind === 'finish') {
        frames.push(pathFrame(frame, 1, 'MCP client nhận tool result',
          'microLink trả JSON-RPC result qua STDIO; MCP client ghép đúng call ID để báo lại host.'));
        frames.push(frame);
      } else {
        frames.push(frame);
        if (kind === 'budget') {
          frames.push(pathFrame(frame, 1, 'MCP client nhận kết quả UNKNOWN',
            'Hết ngân sách mà không có receipt: tool result giữ UNKNOWN, không nói chưa ghi.'));
          frames.push(pathFrame(frame, 0, 'Agent nhận kết quả chưa biết',
            'Mạng chưa phục hồi. Cả hai luồng dừng mà không tự báo ghi thành công hoặc chưa ghi.'));
        }
      }
    }
    return {...journey, frames};
  }

  function describe(journey, current, lane, metadata = false) {
    const state = current.lanes[lane], action = current.frame.actions[lane];
    const kind = action.kind;
    const stages = {call:0, queueChild:0, send:3, receive:4, commit:5, response:4,
      fault:3, timeout:2, late:3, network:3, receipt:2, finish:0, budget:2};
    const stage = kind === 'path' ? action.stage : stages[kind];
    const returning = ['response','receipt','late','finish','budget'].includes(kind) || kind === 'path' && action.stage < 2 && state.attempt > 0;
    const rpcId = state.task === 'C' ? 5 : 4;
    const title = state.task === 'P' ? 'Task cha' : state.task === 'C' ? 'Checklist 1' : 'Task 1';
    const operation = {title, parent_id:state.parentRef};
    if (state.policy === 'on' || metadata) operation.intent_id = state.intent;
    if (metadata) Object.assign(operation, {run_id:`RUN-${state.policy.toUpperCase()}`, seq:state.task === 'C' ? 2 : 1});
    const args = {operation};
    if (metadata) Object.assign(args, {attempt_limit:journey.caseId === 'outage' ? journey.limit : 5, budget_seconds:1200});

    const record = modelReceipt => {
      if (!modelReceipt) return null;
      const result = {id:state.policy === 'on' ? modelReceipt.id : modelReceipt.recordId,
        title, parent_id:state.parentRef};
      if (state.policy === 'on' || metadata) result.intent_id = modelReceipt.id;
      if (metadata) Object.assign(result, {run_id:operation.run_id, seq:operation.seq, lane:state.policy === 'on' ? 'reliable' : 'baseline'});
      return result;
    };
    const result = {state:state.status, attempts:state.attempt, receipt:record(state.receipt)};
    const toolReturned = kind === 'finish' || kind === 'path' && action.stage < 2 && current.lanes[lane].attempt > 0;
    const rpc = toolReturned ? {jsonrpc:'2.0', id:rpcId, result:{resultType:'complete', isError:false, structuredContent:result}} :
      {jsonrpc:'2.0', id:rpcId, method:'tools/call', params:{name:'create_task', arguments:args}};
    if (metadata && !toolReturned) rpc.params._meta = {'io.modelcontextprotocol/protocolVersion':'2026-07-28'};

    let responseAvailable = false, responseCreated = true;
    const committed = new Set();
    for (const frame of journey.frames.slice(0, current.position+1)) {
      const event = frame.actions[lane];
      if (event.kind === 'send') responseAvailable = false;
      if (event.kind === 'commit') {
        responseCreated = state.policy === 'off' || !committed.has(event.task);
        committed.add(event.task);
      }
      if (event.kind === 'response') responseAvailable = true;
    }
    let http;
    if (responseAvailable) {
      const receipt = record({id:state.intent, recordId:`off-${state.task}-${state.attempt}`});
      const created = responseCreated;
      receipt.created = created;
      http = `HTTP/1.1 ${created ? '201 Created' : '200 OK'}\nContent-Type: application/json\n\n${JSON.stringify(receipt, null, 2)}`;
    } else {
      const body = {...operation};
      if (metadata) body.lane = state.policy === 'on' ? 'reliable' : 'baseline';
      http = `POST /${state.policy === 'on' ? 'reliable' : 'baseline'}/tasks HTTP/1.1\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}`;
    }
    return {stage, returning, rpcId, rpc, http, result, toolReturned, responseAvailable,
      evidence:state.receipt ? result : {state:state.status, receipt:null,
        note:toolReturned ? 'Tool result đã trả UNKNOWN cho host' : state.status === 'unknown' ? 'Chưa có receipt hợp lệ; MCP call còn chờ phục hồi' : 'Bridge chưa có bằng chứng để xác nhận'}};
  }
  const api = {stations, roles, expand, describe};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MiAssuraPayload = api;
})(typeof globalThis === 'object' ? globalThis : this);
