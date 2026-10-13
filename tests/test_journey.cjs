// Presentation-model invariants. These are not MCP/network experiments.
const assert = require('node:assert/strict');
const {cases, build, snapshot} = require('../lab/ui/journey-model.js');
const {test} = require('node:test');

const branches = cases.flatMap(c => c.variants ? c.variants.map(([variant]) => [c.id, {variant}]) : [[c.id, {}]]);
for (const [id, options] of branches) {
  test(`${id}/${options.variant || 'default'} preserves evidence and identity`, () => {
    const journey = build(id, options);
    let previous = -1;
    for (let i = 0; i < journey.frames.length; i++) {
      const state = snapshot(journey, i);
      assert.ok(state.frame.at >= previous); previous = state.frame.at;
      for (const lane of state.lanes) {
        if (lane.status === 'confirmed') {
          assert.ok(lane.receipt);
          assert.equal(lane.receipt.id, lane.intent);
          assert.equal(lane.receipt.payload, lane.task);
        }
        if (lane.task === 'C' && lane.attempt > 0) assert.ok(lane.confirmations.P);
        if (lane.policy === 'on') assert.equal(new Set(lane.records.map(row => row.id)).size, lane.records.length);
      }
      assert.deepEqual(snapshot(journey, i), state); // Rewind/replay has no persistent effects.
    }
    const final = snapshot(journey, journey.frames.length-1).lanes;
    if (id === 'outage') {
      assert.deepEqual(final.map(s => s.status), ['unknown', 'unknown']);
      assert.deepEqual(final.map(s => s.records.length), [0, 0]);
    } else assert.deepEqual(final.map(s => s.status), ['confirmed', 'confirmed']);
  });
}
test('same timeout evidence, different server truth', () => {
  const unknown = id => {
    const j = build(id); return snapshot(j, j.frames.findIndex(f => f.actions[0].kind === 'timeout')).lanes;
  };
  assert.deepEqual(unknown('request').map(s => s.status), ['unknown','unknown']);
  assert.deepEqual(unknown('response').map(s => s.status), ['unknown','unknown']);
  assert.deepEqual(unknown('request').map(s => s.records.length), [0,0]);
  assert.deepEqual(unknown('response').map(s => s.records.length), [1,1]);
});
test('response retry duplicates only without the API replay contract', () => {
  const j = build('response'), final = snapshot(j, j.frames.length-1).lanes;
  assert.deepEqual(final.map(s => s.records.length), [2,1]);
});
test('a committed row does not confirm the bridge', () => {
  const j = build('normal');
  const states = snapshot(j, j.frames.findIndex(f => f.actions[0].kind === 'commit')).lanes;
  assert.deepEqual(states.map(s => [s.records.length, s.status, s.receipt]), [[1,'waiting',null],[1,'waiting',null]]);
});
test('late response from a closed request leaves UNKNOWN', () => {
  const j = build('delay', {variant:'after'});
  assert.deepEqual(snapshot(j, j.frames.findIndex(f => f.actions[0].kind === 'late')).lanes.map(s => s.status), ['unknown','unknown']);
});
test('finite outage budget includes the first send', () => {
  for (const limit of [1,3,5]) {
    const j = build('outage', {limit});
    assert.deepEqual(snapshot(j, j.frames.length-1).lanes.map(s => s.attempt), [limit,limit]);
    assert.ok(snapshot(j, j.frames.length-1).lanes.every(s => s.adverse && /không kết nối được/i.test(s.network)));
  }
});
test('checklist references its own confirmed parent', () => {
  const j = build('parent'), final = snapshot(j, j.frames.length-1).lanes;
  for (const lane of final) assert.equal(lane.records.find(r => r.task === 'C').parent, lane.confirmations.P.recordId);
  assert.deepEqual(final.map(s => s.records.length), [3,2]);
});
test('mismatched receipt fails the intended evidence boundary', () => {
  const j = build('normal');
  const index = j.frames.findIndex(f => f.actions[0].kind === 'receipt');
  j.frames[index].actions[0].receipt.id = 'wrong-intent';
  assert.throws(() => snapshot(j, index), /does not match/);
});
test('sending a child before confirmation fails the dependency boundary', () => {
  const j = build('parent');
  j.frames[0].actions[0] = {policy:'off',kind:'send',task:'C',attempt:1};
  assert.throws(() => snapshot(j, 0), /before confirmed parent/);
});
test('confirmation consumes the receipt, not observer rows', () => {
  const j = build('normal');
  j.frames = j.frames.filter(f => f.actions[0].kind !== 'commit');
  const final = snapshot(j, j.frames.length-1).lanes;
  assert.deepEqual(final.map(s => s.records.length), [0,0]);
  assert.deepEqual(final.map(s => s.status), ['confirmed','confirmed']);
});
