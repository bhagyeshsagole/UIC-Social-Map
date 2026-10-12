import test from 'node:test';
import assert from 'node:assert/strict';
import {robotsAllow} from '../scripts/lib/robots.mjs';

test('robots.txt rules follow the standard: wildcards, $ anchors, Allow overrides, our own group first', () => {
  const wix = 'User-agent: *\nDisallow: /*?lightbox=\nDisallow: /_api/*\n';
  assert.equal(robotsAllow(wix, '/'), true, 'a wildcard rule does not block the homepage');
  assert.equal(robotsAllow(wix, '/menu?lightbox=x'), false);
  assert.equal(robotsAllow('User-agent: *\nDisallow: /', '/contact'), false);
  assert.equal(robotsAllow('User-agent: *\nDisallow: /\nAllow: /$\nAllow: /contact', '/contact'), true);
  assert.equal(robotsAllow('User-agent: *\nDisallow: /\nAllow: /$', '/about'), false);
  assert.equal(robotsAllow('User-agent: *\nDisallow: /*.pdf$', '/menu.pdf'), false);
  assert.equal(robotsAllow('User-agent: *\nDisallow: /*.pdf$', '/menu.pdf.html'), true);
  assert.equal(robotsAllow('User-agent: KampuscapeBot\nDisallow: /\n\nUser-agent: *\nDisallow:', '/'), false, 'a group naming us wins');
  assert.equal(robotsAllow('User-agent: Googlebot\nDisallow: /', '/'), true);
  assert.equal(robotsAllow('', '/'), true);
});
