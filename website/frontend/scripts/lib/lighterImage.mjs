// Ask an image host for a copy sized for the place card (about 900 px wide) instead of the original upload,
// which can run to several megabytes. Hosts without a resizing URL keep their original link.
export function lighterImage(url, width = 900) {
  let u; try { u = new URL(url); } catch { return url; }
  const host = u.hostname;
  if (/(^|\.)squarespace-cdn\.com$|(^|\.)squarespace\.com$/.test(host)) { u.searchParams.set('format', width <= 750 ? '750w' : '1000w'); return u.href; }
  if (host === 'static.wixstatic.com') return url.replace(/\/v1\/(fill|fit)\/w_(\d+),h_(\d+)/, (m, mode, w, h) => { const s = Math.min(1, width / +w); return `/v1/${mode}/w_${Math.round(w * s)},h_${Math.round(h * s)}`; });
  if (host === 'images.getbento.com') { u.searchParams.set('w', String(width)); u.searchParams.delete('h'); return u.href; }
  if (host === 'images.ctfassets.net') { u.searchParams.set('w', String(width)); u.searchParams.set('q', '75'); u.searchParams.set('fm', 'jpg'); return u.href; }
  if (host === 'img1.wsimg.com') return `${url.split('/:/')[0]}/:/rs=w:${width}`;
  if (u.pathname.includes('/cdn/shop/')) { u.searchParams.set('width', String(width)); return u.href; }
  // Wikimedia thumbnails come in fixed buckets; 960 px is plenty for the card.
  if (/(^|\.)wikimedia\.org$/.test(host)) return url.replace(/\/(\d+)px-/, (m, n) => +n > 960 ? '/960px-' : m);
  return url;
}
