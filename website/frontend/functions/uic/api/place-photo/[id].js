import sources from '../../../../src/placePhotoSources.json' with {type: 'json'};

// Serves a venue's own website photo through kampuscape.com. Only images listed in the generated
// allowlist can be fetched, so this is not an open proxy, and visitors never contact the venue site.
const AGENT = 'Mozilla/5.0 (compatible; KampuscapeBot/1.0; +https://kampuscape.com/support)';
const WEEK = 7 * 86400;

export async function servePlacePhoto({params}, fetcher = fetch) {
  const src = Object.hasOwn(sources, params.id) ? sources[params.id] : null;
  if (!src) return new Response('Not found', {status: 404});
  try {
    const upstream = await fetcher(src, {headers: {'User-Agent': AGENT, Accept: 'image/webp,image/jpeg,image/png'}, cf: {cacheEverything: true, cacheTtl: WEEK}, signal: AbortSignal.timeout(10000)});
    const type = upstream.headers.get('content-type') || '';
    if (!upstream.ok || !/^image\/(jpeg|png|webp)$/.test(type.split(';')[0].trim())) return new Response('Unavailable', {status: 502});
    return new Response(upstream.body, {headers: {'Content-Type': type, 'Cache-Control': `public, max-age=${WEEK}`, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'"}});
  } catch {
    return new Response('Unavailable', {status: 502});
  }
}

export const onRequestGet = context => servePlacePhoto(context);
