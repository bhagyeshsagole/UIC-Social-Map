// kampuscape.com is the only public address: send *.pages.dev (including
// per-deployment preview URLs) and www to it, keeping the path and query.
const CANONICAL = 'kampuscape.com';

export async function onRequest({request, next}) {
  const url = new URL(request.url);
  if (url.hostname.endsWith('.pages.dev') || url.hostname === `www.${CANONICAL}`) {
    url.hostname = CANONICAL; url.protocol = 'https:'; url.port = '';
    return Response.redirect(url.href, 301);
  }
  return next();
}
