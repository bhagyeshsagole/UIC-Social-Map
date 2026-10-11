import test from 'node:test';
import assert from 'node:assert/strict';
import {tokenFrom} from '../src/shareToken.js';
import {onRequestGet} from '../functions/uic/share/[token].js';

const token = 'a98d132b-056d-4266-af3c-7e1412f3b1fa';
const glued = `${token}%20testing%20·%20Hosted%20by%20testing%20·%20Nov%206,%202026%20·%2022:00`;

test('share links keep working when an app glues the share text onto them', () => {
  assert.equal(tokenFrom(token), token);
  assert.equal(tokenFrom(glued), token);
  assert.equal(tokenFrom(`${token} testing · Hosted by testing`), token);
  assert.equal(tokenFrom(token.toUpperCase()), token);
  for (const bad of ['', 'nope', `${token}0`, token.slice(1), `x${token}`]) assert.equal(tokenFrom(bad), null, bad);
});

test('a glued link redirects to the clean share page without a database call; junk is 404', async () => {
  const redirect = await onRequestGet({request: new Request(`https://kampuscape.com/uic/share/${glued}`), env: {}, params: {token: glued}});
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('location'), `https://kampuscape.com/uic/share/${token}`);
  const gone = await onRequestGet({request: new Request('https://kampuscape.com/uic/share/nope'), env: {}, params: {token: 'nope'}});
  assert.equal(gone.status, 404);
  assert.match(gone.headers.get('content-type'), /text\/html/);
  assert.match(await gone.text(), /expired or was removed[\s\S]*href="https:\/\/kampuscape.com\/uic"/);
});

import {eventLink, readEventLink} from '../src/privateEvents.js';
test('#event= links ignore share text glued after the payload', () => {
  const event = {id: '11111111-1111-4111-8111-111111111111', source: 'Private event', title: 'Glued link check', date: '2026-11-06', time: '22:00', venue: {id: 'test', name: 'Synthetic Hall', coords: [-87.65, 41.87]}};
  const hash = new URL(eventLink(event, 'https://kampuscape.com/uic', 'Nov 6')).hash;
  assert.equal(readEventLink(hash).event.title, 'Glued link check');
  assert.equal(readEventLink(`${hash}%20Glued%20link%20check%20·%20Nov%206`).event.title, 'Glued link check');
  assert.ok(readEventLink('#event=').error);
});
