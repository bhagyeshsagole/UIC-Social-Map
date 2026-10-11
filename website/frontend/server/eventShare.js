import {cleanEvent,privateWhen} from '../src/privateEvents.js';
export const SHARE_TOKEN=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function sharedEvent(token,env,fetcher=fetch){
 if(!SHARE_TOKEN.test(token))return null;
 const key=env.SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!key)throw new Error('Sharing unavailable');
 const response=await fetcher('https://ddhqammspwmmrprpolfw.supabase.co/rest/v1/rpc/kampuscape_shared_event',{
  method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({p_token:token}),signal:AbortSignal.timeout(8000),
 });
 if(!response.ok)throw new Error('Sharing unavailable');
 const data=await response.json();return data?cleanEvent(data):null;
}
export function shareMetadata(event,origin,token){
 const host=event.host?.name||'A Kampuscape host',when=privateWhen(event);
 return {title:`${event.title} · Hosted by ${host}`,description:`${when} · ${event.venue.name} · Join ${host} on Kampuscape.`,url:`${origin}/uic/share/${token}`,image:`${origin}/uic/share/${token}/image.png`,app:`${origin}/uic?share=${token}`,when,host};
}
export function shareHtml(event,origin,token){
 const m=shareMetadata(event,origin,token),e=escapeHtml;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${e(m.title)}</title><meta name="description" content="${e(m.description)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Kampuscape"><meta property="og:title" content="${e(m.title)}"><meta property="og:description" content="${e(m.description)}"><meta property="og:url" content="${e(m.url)}"><meta property="og:image" content="${e(m.image)}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${e(`${event.title}, hosted by ${m.host}, ${m.when}`)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(m.title)}"><meta name="twitter:description" content="${e(m.description)}"><meta name="twitter:image" content="${e(m.image)}"><style>body{margin:0;background:#edf1e5;color:#28392b;font:16px/1.6 system-ui,sans-serif;min-height:100vh;display:grid;place-items:center}main{max-width:600px;margin:24px;padding:32px;background:#fff;border-radius:24px;box-shadow:0 20px 90px #2d452015}img{width:100%;border-radius:16px}h1{font-size:32px;line-height:1.2;overflow-wrap:anywhere}p{overflow-wrap:anywhere}.details{white-space:pre-wrap}a{display:inline-block;background:#405f39;color:white;border-radius:12px;padding:12px 22px;text-decoration:none}.brand{font-weight:700;letter-spacing:1px;color:#678154}</style></head><body><main><p class="brand">KAMPUSCAPE · YOU’RE INVITED</p><img src="${e(m.image)}" alt="${e(event.title)}"><h1>${e(event.title)}</h1><p>Hosted by <strong>${e(m.host)}</strong><br>${e(m.when)}<br>${e(event.venue.name)}</p>${event.description?`<p class="details">${e(event.description)}</p>`:''}<a href="${e(m.app)}">Open event on the map →</a></main></body></html>`;
}
function lines(text,max=29,count=3){const words=String(text).split(/\s+/),result=[''];for(const word of words){const last=result.length-1;if((result[last]+' '+word).trim().length>max&&result[last]){if(result.length===count){result[last]=result[last].slice(0,max-1)+'…';break;}result.push(word);}else result[last]=(result[last]+' '+word).trim();}return result.map(s=>s.length>max?s.slice(0,max-1)+'…':s);}
export function shareSvg(event){
 const e=escapeHtml,title=lines(event.title,30,3),host=lines(`Hosted by ${event.host?.name||'a Kampuscape host'}`,57,1)[0],venue=lines(event.venue.name,65,1)[0];
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#eef1e4"/><circle cx="1125" cy="90" r="285" fill="#dce6cb"/><circle cx="1125" cy="90" r="210" fill="none" stroke="#c7d6b2" stroke-width="2"/><circle cx="1125" cy="90" r="140" fill="none" stroke="#c7d6b2" stroke-width="2"/><path d="M950 240V420h70V310h65V420h70V220" fill="none" stroke="#a9bf91" stroke-width="22"/><rect x="60" y="51" width="46" height="46" rx="14" fill="#405f39"/><path d="m76 83 7-18 8 8z" fill="#fff"/><g font-family="Inter" font-weight="600" fill="#2b402e"><text x="123" y="84" font-size="26">Kampuscape</text><text x="62" y="153" font-size="16" letter-spacing="4" fill="#6c8457">YOU’RE INVITED</text>${title.map((line,i)=>`<text x="60" y="${223+i*65}" font-size="53">${e(line)}</text>`).join('')}<text x="62" y="426" font-size="24" fill="#567045">${e(host)}</text><rect x="60" y="465" width="1080" height="112" rx="18" fill="#405f39"/><text x="87" y="510" font-size="25" fill="#fff">${e(privateWhen(event))}</text><text x="87" y="548" font-size="21" fill="#dce8cf">${e(venue)}</text></g></svg>`;
}
export const shareHeaders={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
