import test from 'node:test';
import assert from 'node:assert/strict';
import {createResource} from '../src/liveResource.js';

test('a forced refresh during an in-flight request fetches again, so a just-saved write is never missed', async () => {
  let server = ['old'], calls = 0, release;
  const resource = createResource(() => {calls++; const answer = [...server]; return calls === 1 ? new Promise(r => {release = () => r(answer);}) : Promise.resolve(answer);});
  const first = resource.refresh();
  await Promise.resolve();
  server = ['old', 'new event'];
  const afterWrite = resource.refresh({force: true});
  release();
  assert.deepEqual(await first, ['old']);
  assert.deepEqual(await afterWrite, ['old', 'new event'], 'the forced refresh sees the write');
  assert.equal(calls, 2);
  assert.deepEqual(resource.getSnapshot().data, ['old', 'new event']);
});

test('several forced refreshes during one request share a single follow-up fetch', async () => {
  let calls = 0, release;
  const resource = createResource(() => {calls++; return calls === 1 ? new Promise(r => {release = () => r(calls);}) : Promise.resolve(calls);});
  resource.refresh();
  await Promise.resolve();
  const a = resource.refresh({force: true}), b = resource.refresh({force: true});
  release();
  assert.equal(await a, 2);
  assert.equal(await b, 2);
  assert.equal(calls, 2);
});

test('a cleared resource does not run its queued follow-up', async () => {
  let calls = 0, release;
  const resource = createResource(() => {calls++; return new Promise(r => {release = () => r(calls);});});
  resource.refresh();
  await Promise.resolve();
  const queued = resource.refresh({force: true});
  resource.clear();
  release();
  await queued;
  assert.equal(calls, 1);
});
