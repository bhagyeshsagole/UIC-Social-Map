// Converts published opening hours into the app's weekly schedule: index 0 is Sunday, each day is
// null (closed), one [open, close] range in minutes, or a list of ranges for split shifts.
// Anything outside the plain weekly subset (months, holidays-only rules, sunrise, open-ended "+")
// returns null so the app keeps asking people to check instead of guessing.
const OSM_DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const NAMED_DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const minutes = text => {const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(text.trim()); if (!m || +m[1] > 24 || +m[2] > 59) return null; return +m[1] * 60 + +m[2];};
function range(text) {
  const [from, to, extra] = text.split('-');
  if (extra !== undefined || !from || !to) return null;
  const open = minutes(from); let close = minutes(to);
  if (open === null || close === null || open >= 1440) return null;
  if (close <= open) close += 1440;
  return close - open > 1440 ? null : [open, close];
}
function days(selector) {
  const out = new Set();
  for (const part of selector.split(',')) {
    const [a, b] = part.trim().split('-'), start = OSM_DAYS.indexOf(a);
    if (start < 0) return null;
    if (b === undefined) {out.add(start); continue;}
    const end = OSM_DAYS.indexOf(b); if (end < 0) return null;
    for (let d = start; ; d = (d + 1) % 7) {out.add(d); if (d === end) break;}
  }
  return out;
}
const simplify = schedule => schedule.map(day => !day || !day.length ? null : day.length === 1 ? day[0] : day.sort((a, b) => a[0] - b[0]));

export function parseOpeningHours(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const value = text.trim();
  if (/^24\/7$/.test(value)) return Array(7).fill([0, 1440]);
  const schedule = Array(7).fill(null).map(() => []);
  let touched = false;
  // ";" starts a rule that replaces earlier hours for its days; ", " before a new day selector adds to them.
  const DAY = '(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)\\b';
  const rules = value.replace(new RegExp(`((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)\\s*,\\s+(?=${DAY})`, 'g'), '$1,')
    .split(/;|\|\|/).flatMap(part => part.split(new RegExp(`(?<=\\d|off|closed)\\s*,\\s*(?=${DAY})`)).map((rule, i) => ({rule, add: i > 0})));
  for (const {rule: raw, add} of rules) {
    const rule = raw.trim(); if (!rule) continue;
    // Holiday-only rules don't change the regular week.
    if (/^(PH|SH)\b/.test(rule)) continue;
    const m = /^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)?(?:,PH)?\s*(.*)$/.exec(rule);
    if (!m) return null;
    const selected = m[1] ? days(m[1]) : new Set([0,1,2,3,4,5,6]), body = m[2].trim();
    if (!selected) return null;
    let ranges;
    if (/^(off|closed)$/i.test(body)) ranges = [];
    else {
      ranges = body.split(',').map(part => range(part));
      if (!body || ranges.some(r => !r)) return null;
    }
    for (const d of selected) schedule[d] = add && ranges.length ? [...schedule[d], ...ranges.map(r => [...r])] : ranges.map(r => [...r]);
    touched = true;
  }
  if (!touched || schedule.every(day => !day.length)) return null;
  return simplify(schedule);
}

// schema.org openingHoursSpecification entries ({dayOfWeek, opens, closes}) to the same schedule.
export function parseOpeningSpecification(specs) {
  const list = (Array.isArray(specs) ? specs : [specs]).filter(Boolean);
  if (!list.length) return null;
  const schedule = Array(7).fill(null).map(() => []);
  for (const spec of list) {
    if (spec.validFrom || spec.validThrough) continue;
    const dayNames = (Array.isArray(spec.dayOfWeek) ? spec.dayOfWeek : [spec.dayOfWeek]).filter(Boolean).map(d => String(d).split('/').pop().toLowerCase());
    const indexes = dayNames.map(d => NAMED_DAYS.indexOf(d));
    if (!indexes.length || indexes.some(i => i < 0)) return null;
    if (!spec.opens && !spec.closes) continue;
    // schema.org convention: opens and closes both "00:00" means closed all day.
    if (String(spec.opens).slice(0, 5) === String(spec.closes).slice(0, 5)) continue;
    const r = range(`${String(spec.opens || '')}-${String(spec.closes || '')}`.replace(/(\d{1,2}:\d{2}):\d{2}/g, '$1'));
    if (!r) return null;
    for (const i of indexes) schedule[i].push(r);
  }
  if (schedule.every(day => !day.length)) return null;
  return simplify(schedule);
}
