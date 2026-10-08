import test from 'node:test';
import assert from 'node:assert/strict';
import {readStore, STORAGE_KEYS} from '../src/storage.js';

const store = entries => ({getItem: key => entries[key] ?? null});

test('saved places and event drafts survive the Kampuscape rename', () => {
  const saved = ['busy-burger'];
  const drafts = [{id: 'd1', title: 'Burger break', placeId: 'busy-burger'}];
  const storage = store({
    'afterclass-saved': JSON.stringify(saved),
    'afterclass-drafts': JSON.stringify(drafts),
  });
  assert.deepEqual(readStore(STORAGE_KEYS.saved, [], storage), saved);
  assert.deepEqual(readStore(STORAGE_KEYS.drafts, [], storage), drafts);
});

test('current records take precedence and deleted items are not resurrected', () => {
  const storage = store({
    'kampuscape-saved': '["mca"]',
    'kampuscape-drafts': '[]',
    'afterclass-saved': '["busy-burger"]',
    'afterclass-drafts': '[{"id":"deleted-event"}]',
  });
  assert.deepEqual(readStore(STORAGE_KEYS.saved, [], storage), ['mca']);
  assert.deepEqual(readStore(STORAGE_KEYS.drafts, [], storage), []);
});

test('invalid current data can recover legacy arrays; unavailable storage stays usable', () => {
  for (const invalid of ['broken JSON', '{}', 'null']) {
    assert.deepEqual(readStore(STORAGE_KEYS.saved, [], store({
      'kampuscape-saved': invalid,
      'afterclass-saved': '["busy-burger"]',
    })), ['busy-burger']);
  }
  assert.deepEqual(readStore(STORAGE_KEYS.saved, [], store({})), []);
  assert.deepEqual(readStore(STORAGE_KEYS.saved, [], store({'afterclass-saved': '{}'})), []);
  assert.deepEqual(readStore(STORAGE_KEYS.saved, [], {getItem() {throw new Error('Storage blocked');}}), []);
});
