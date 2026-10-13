// The approved payload view follows evidence rather than observer truth.
const assert = require('node:assert/strict');
const {test} = require('node:test');
const model = require('../lab/ui/journey-model.js');
const payload = require('../lab/ui/journey-payload.js');

test('inserted protocol steps preserve all original outcomes', () => {
  for (const story of model.cases) for (const variant of story.variants?.map(v => v[0]) || [undefined]) {
    const original = model.build(story.id, {variant});
    const expanded = payload.expand(original);
    const before = model.snapshot(original, original.frames.length-1);
    const after = model.snapshot(expanded, expanded.frames.length-1);
    for (let lane = 0; lane < 2; lane++) {
      assert.equal(after.lanes[lane].status, before.lanes[lane].status);
      assert.deepEqual(after.lanes[lane].records, before.lanes[lane].records);
      assert.deepEqual(after.lanes[lane].receipt, before.lanes[lane].receipt);
    }
  }
});
test('API response is visible before bridge evidence; retry key is stable', () => {
  const journey = payload.expand(model.build('response'));
  const at = (kind, attempt) => journey.frames.findIndex(f => f.actions[0].kind === kind && (!attempt || f.actions[0].attempt === attempt));
  const response = payload.describe(journey, model.snapshot(journey, at('response')), 1);
  assert.match(response.http, /201 Created/);
  assert.equal(response.evidence.receipt, null);
  assert.equal(response.toolReturned, false);
  const sends = journey.frames.flatMap((f, i) => f.actions[0].kind === 'send' ? [i] : []);
  const keys = sends.map(i => payload.describe(journey, model.snapshot(journey, i), 1).rpc.params.arguments.operation.intent_id);
  assert.equal(new Set(keys).size, 1);
  const retryResponse = journey.frames.findIndex((f, i) => f.actions[0].kind === 'response' && i > sends[1]);
  assert.match(payload.describe(journey, model.snapshot(journey, retryResponse), 1).http, /200 OK/);
  assert.match(payload.describe(journey, model.snapshot(journey, retryResponse), 0).http, /201 Created/);
  const request = payload.expand(model.build('request'));
  const response2 = request.frames.findIndex(f => f.actions[0].kind === 'response');
  assert.match(payload.describe(request, model.snapshot(request, response2), 1).http, /201 Created/);
});
test('OFF metadata is optional presentation data and never an ON key', () => {
  const journey = payload.expand(model.build('normal'));
  const state = model.snapshot(journey, 2);
  const off = payload.describe(journey, state, 0);
  const wire = payload.describe(journey, state, 0, true);
  assert.equal(off.rpc.params.arguments.operation.intent_id, undefined);
  assert.match(wire.rpc.params.arguments.operation.intent_id, /^OFF-/);
  assert.notEqual(wire.rpc.params.arguments.operation.intent_id, payload.describe(journey, state, 1, true).rpc.params.arguments.operation.intent_id);
});
test('UNKNOWN and parent result are correctly delivered through MCP', () => {
  const outage = payload.expand(model.build('outage'));
  const final = model.snapshot(outage, outage.frames.length-1);
  const result = payload.describe(outage, final, 1);
  assert.equal(result.rpc.result.structuredContent.state, 'unknown');
  assert.equal(result.rpc.result.structuredContent.receipt, null);
  const parent = payload.expand(model.build('parent'));
  const child = parent.frames.findIndex(f => f.actions[0].kind === 'send' && f.actions[0].task === 'C');
  const state = model.snapshot(parent, child);
  const childPayload = payload.describe(parent, state, 1);
  assert.equal(childPayload.rpc.id, 5);
  assert.equal(childPayload.rpc.params.arguments.operation.parent_id, state.lanes[1].confirmations.P.recordId);
});
