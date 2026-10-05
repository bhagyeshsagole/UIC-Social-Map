import {dietWords} from './diet.js';
// Spotlight index: one flat list of everything a student can jump to, grouped for display.
export const GROUPS = ['Saved', 'Places', 'Events', 'My Events', 'Menu', 'Activities', 'Go to'];
const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
export function shortDate(iso) { return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'}); }
export function buildIndex({places, saved = [], drafts = [], events = [], categories = []}) {
  const items = [];
  for (const p of places) items.push({group:saved.includes(p.id) ? 'Saved' : 'Places', kind:'place', id:`place:${p.id}`, place:p, title:p.name, subtitle:p.benefit ? `${p.neighborhood} · ${p.benefit}` : p.neighborhood, text:[p.name, p.description, p.category, p.neighborhood, p.benefit, p.address, ...p.tags, dietWords(p), p.student ? 'student discount perk uic' : ''].join(' ')});
  for (const e of events) items.push({group:'Events', kind:'event', id:`event:${e.place.id}:${e.title}`, place:e.place, event:e, title:e.title, subtitle:`${e.place.name} · through ${shortDate(e.end)}`, text:[e.title, e.description, e.place.name, e.place.neighborhood, 'event exhibition calendar'].join(' ')});
  for (const d of drafts) { const p = places.find(x => x.id === d.placeId); items.push({group:'My Events', kind:'plan', id:`plan:${d.id}`, place:p, draft:d, title:d.title, subtitle:`${p?.name || 'Place unavailable'} · ${shortDate(d.date)} · ${d.time}`, text:[d.title, p?.name, d.date, 'plan draft'].join(' ')}); }
  for (const p of places) for (const [name, price, description, tags] of p.menu || []) items.push({group:'Menu', kind:'menu', id:`menu:${p.id}:${name}`, place:p, title:name, subtitle:`${p.name} · ${price}`, text:[name, description, p.name, ...tags, 'menu food drink'].join(' ')});
  for (const c of categories) { const n = places.filter(p => p.category === c).length; items.push({group:'Activities', kind:'category', id:`category:${c}`, category:c, title:c, subtitle:`${n} ${n === 1 ? 'place' : 'places'} to explore`, text:`${c} activities category`}); }
  for (const [title, subtitle, action, words] of [['Explore all places','Browse the list and filters','explore','browse places list'],['Live events','Exhibitions and listings near campus','events','calendar exhibitions'],['Saved','Your bookmarked places','saved','saved bookmarks'],['My Events','Your private event drafts','plans','my events drafts'],['Make a plan','Create a private event draft','create','new event draft create']]) items.push({group:'Go to', kind:'action', id:`action:${action}`, action, title, subtitle, text:`${title} ${subtitle} ${words}`});
  return items.map(i => ({...i, haystack:norm(`${i.title} ${i.text}`)}));
}
// Every word must match somewhere; title matches rank first, then prefix matches.
export function searchIndex(items, query, limit = 6) {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const pick = words.length
    ? items.filter(i => words.every(w => i.haystack.includes(w))).map(i => { const t = norm(i.title); return {i, score:(t.startsWith(words[0]) ? 4 : 0) + words.filter(w => t.includes(w)).length * 2 + (i.haystack.split(/\W+/).some(x => x.startsWith(words[0])) ? 1 : 0)}; }).sort((a, b) => b.score - a.score).map(x => x.i)
    : items.filter(i => ['Saved', 'My Events', 'Events', 'Go to'].includes(i.group));
  return GROUPS.map(group => ({group, items:pick.filter(i => i.group === group).slice(0, limit)})).filter(g => g.items.length);
}
