import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {servePlacePhoto} from '../functions/uic/api/place-photo/[id].js';

const sources = JSON.parse(readFileSync(new URL('../src/placePhotoSources.json', import.meta.url)));
const [id, src] = Object.entries(sources)[0] || [];

test('only allowlisted place photos are fetched; anything else is 404 without a request', async () => {
  for (const unknown of ['nope', '__proto__', 'constructor', 'https://evil.example/x.jpg'])
    assert.equal((await servePlacePhoto({params:{id:unknown}}, () => assert.fail('must not fetch'))).status, 404);
});

test('an allowlisted photo streams through with caching; non-images and failures are 502', {skip:!id}, async () => {
  let requested;
  const ok = await servePlacePhoto({params:{id}}, async url => {requested = url; return new Response(new Uint8Array([1,2,3]), {headers:{'content-type':'image/jpeg'}});});
  assert.equal(requested, src);
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('cache-control'), /max-age=604800/);
  assert.equal(ok.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await servePlacePhoto({params:{id}}, async () => new Response('<html>', {headers:{'content-type':'text/html'}}))).status, 502);
  assert.equal((await servePlacePhoto({params:{id}}, async () => new Response('x', {status:404, headers:{'content-type':'image/jpeg'}}))).status, 502);
  assert.equal((await servePlacePhoto({params:{id}}, async () => {throw new Error('secret upstream detail');})).status, 502);
});
