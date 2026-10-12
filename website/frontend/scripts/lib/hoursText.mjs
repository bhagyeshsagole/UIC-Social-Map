// Reads opening hours written as prose on a venue's website ("Mon–Thu 11am–10pm, Fri & Sat 11am–11pm,
// Sunday closed") into the app's weekly schedule (Sunday first; null, [open, close] or a list of ranges).
// It refuses rather than guesses: a closing time needs am/pm (or 24-hour clock), and conflicting or
// partial results return null. findHoursInPage picks the hours block that belongs to one address.

const DAYS = [['sunday', 'sun'], ['monday', 'mon'], ['tuesday', 'tues', 'tue'], ['wednesday', 'wed'], ['thursday', 'thurs', 'thur', 'thu'], ['friday', 'fri'], ['saturday', 'sat']];
const DAY_WORD = DAYS.flat().sort((a, b) => b.length - a.length).join('|');
const dayIndex = word => DAYS.findIndex(names => names.includes(word));
const ALL = [0, 1, 2, 3, 4, 5, 6];

export function normalizeHoursText(text) {
  return String(text || '').toLowerCase()
    .replace(/[‒-―−]/g, '-').replace(/ /g, ' ')
    .replace(/\b([ap])\.\s?m\.?/g, '$1m').replace(/\bnoon\b/g, '12pm').replace(/\bmidnight\b/g, '12am')
    .replace(/(\d)\s*([ap])\b(?!m)/g, '$1$2m')
    .replace(/\s+/g, ' ');
}

const clock = (h, m, suffix) => {
  h = +h; m = +(m || 0);
  if (m > 59) return null;
  if (suffix) {if (h < 1 || h > 12) return null; return (h % 12 + (suffix === 'pm' ? 12 : 0)) * 60 + m;}
  return h <= 24 ? h * 60 + m : null;
};
function range(m) {
  const [, h1, m1, s1, h2, m2, s2] = m;
  let open, close;
  if (s2) {
    close = clock(h2, m2, s2);
    // An opening time without am/pm takes the closing suffix unless that would open after closing ("11-2pm").
    open = s1 ? clock(h1, m1, s1) : clock(h1, m1, s2);
    if (!s1 && open !== null && close !== null && open >= close && s2 === 'pm') open = clock(h1, m1, 'am');
  } else if (!s1 && m1 && m2) {
    open = clock(h1, m1); close = clock(h2, m2);
    if (Math.max(+h1, +h2) < 13 && +h1 !== 0 && +h2 !== 0) return null;   // 24-hour clock only when it's unmistakable
  } else return null;
  if (open === null || close === null || open >= 1440) return null;
  if (close <= open) close += 1440;
  return close - open > 1440 || close - open < 30 ? null : [open, close];
}

const TIME = String.raw`(\d{1,2})(?::(\d{2}))?\s*(am|pm)?`;
const TOKEN = new RegExp(String.raw`(${TIME}\s*(?:-|to|until|till)\s*${TIME})|(open\s+24\s*hours|24\s*hours|24/7)|(closed)|(daily|every\s?day|7 days a week|seven days a week)|(weekdays)|(weekends)|\b(${DAY_WORD})s?\b\.?`, 'g');

// Parse one block of hours text. Returns a schedule or null (with {listed: true}, also the days it named).
export function parseHoursText(text, {listed: wantListed = false} = {}) {
  const tokens = [];
  for (const m of normalizeHoursText(text).matchAll(TOKEN)) {
    if (m[1]) {const r = range(m.slice(1, 8)); if (!r) return null; tokens.push({range: r, at: m.index});}
    else if (m[8]) tokens.push({range: [0, 1440], at: m.index});
    else if (m[9]) tokens.push({closed: true, at: m.index});
    else if (m[10]) tokens.push({days: ALL, at: m.index});
    else if (m[11]) tokens.push({days: [1, 2, 3, 4, 5], at: m.index});
    else if (m[12]) tokens.push({days: [0, 6], at: m.index});
    else tokens.push({day: dayIndex(m[13]), at: m.index, end: m.index + m[0].length});
  }
  // Merge "mon - fri", "mon, wed & fri", "mon thru fri" into day groups.
  const text2 = normalizeHoursText(text), groups = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.day === undefined) {groups.push(t); continue;}
    let days = [t.day], last = t;
    while (tokens[i + 1]?.day !== undefined) {
      const next = tokens[i + 1], between = text2.slice(last.end, next.at).trim();
      if (/^(-|-?\s*(to|thru|through))$/.test(between)) {const from = days.pop(); for (let d = from; ; d = (d + 1) % 7) {days.push(d); if (d === next.day) break;}}
      else if (/^(,|&|and|\/|,\s*and)$/.test(between)) days.push(next.day);
      else break;
      last = next; i++;
    }
    groups.push({days: [...new Set(days)], at: t.at});
  }
  // Day names back to back with no times between them are a table's header row ("Mon-Thu Friday Saturday"): refuse.
  if (groups.some((g, i) => g.days && groups[i + 1]?.days)) return null;
  const schedule = Array(7).fill(undefined), assigned = new Set();
  let current = null, currentFilled = false, pending = [], lastWasRange = false;
  const assign = (days, value) => {
    for (const d of days) {
      if (assigned.has(d) && schedule[d] !== undefined && JSON.stringify(schedule[d]) !== JSON.stringify(value)) {
        // Several ranges right after one day group are a split shift; anything else is a conflict.
        if (value && schedule[d] && lastWasRange) {schedule[d] = [...(Array.isArray(schedule[d][0]) ? schedule[d] : [schedule[d]]), value]; continue;}
        throw new Error('conflict');
      }
      schedule[d] = value; assigned.add(d);
    }
  };
  try {
    for (const g of groups) {
      if (g.days) {
        if (g.consumed) {current = null; continue;}
        currentFilled = false;
        if (pending.length && !current) {for (const v of pending) assign(g.days, v); pending = []; current = null; lastWasRange = false; continue;}
        current = g.days; lastWasRange = false; continue;
      }
      const value = g.closed ? null : g.range, next = groups[groups.indexOf(g) + 1];
      // "Sunday Closed Monday 9-5": closed belongs to the day before it. "Mon-Fri 9-5, closed Sundays": the day after.
      if (g.closed && (!current || currentFilled) && next?.days && /^[\s:,-]*(on\s+)?$/.test(text2.slice(g.at + 6, next.at))) {assign(next.days, null); next.consumed = true; lastWasRange = false; continue;}
      if (current) {assign(current, value); lastWasRange = !!value; currentFilled = true;}
      else pending.push(value);
    }
    // "Open daily 7am-3pm" style: a single range with no days at all means every day only with an explicit "daily".
    if (!assigned.size) return null;
  } catch {return null;}
  if (assigned.size < 3 || [...assigned].every(d => schedule[d] === null)) return null;
  const result = schedule.map(day => day === undefined ? null : day);
  return wantListed ? {schedule: result, listed: assigned.size, days: [...assigned]} : result;
}

// Day indices a stretch of text names ("sat & sun", "weekends", "daily").
function mentionedDays(text) {
  const t = normalizeHoursText(text), days = new Set();
  if (/\b(daily|every\s?day|7 days)\b/.test(t)) [0, 1, 2, 3, 4, 5, 6].forEach(d => days.add(d));
  if (/\bweekends?\b/.test(t)) {days.add(0); days.add(6);}
  if (/\bweekdays\b/.test(t)) [1, 2, 3, 4, 5].forEach(d => days.add(d));
  for (const m of t.matchAll(new RegExp(`\\b(${DAY_WORD})s?\\b`, 'g'))) days.add(dayIndex(m[1]));
  return [...days];
}

const BLOCK_END = /\b(happy hour|brunch|kitchen|delivery|catering|holiday|lunch special|menu|reservations?|private events?|patio)\b/;
// Visible text of a page, with line breaks where blocks end.
export function pageText(html) {
  return String(html || '').replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6]|section|article|dd|dt|table)>/gi, '\n').replace(/<\/t[dh]>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;|&ndash;|&#8212;|&mdash;/g, '-').replace(/&#\d+;|&\w+;/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n');
}

// Hours blocks start at a heading such as "Hours" or "Hours of operation" and run until another topic.
export function findHoursInPage(html, {housenumber, street, requireAddress = false} = {}) {
  const text = pageText(html), lower = text.toLowerCase(), blocks = [];
  // A heading, not prose: "Hours" starting a line or followed by a colon ("extended hours when…" doesn't count).
  const headings = [...lower.matchAll(/(?:^|\n)[ \t]*(?:[a-z0-9&'’]+ ){0,2}hours(?: of operation)?\b|(?:^|\n)[ \t]*we('| a)re open\b|\bhours(?: of operation)?\s*:/g)]
    .map(m => Object.assign(m, {index: m.index + m[0].search(/\S/)}));
  for (const [i, m] of headings.entries()) {
    const next = headings.slice(i + 1).find(h => h.index > m.index + m[0].length + 8);
    const full = lower.slice(m.index, Math.min(m.index + 420, next ? next.index : Infinity)), end = full.slice(12).search(BLOCK_END);
    // Cut at "happy hour", "brunch"… so side sections don't clash with the main hours. If the cut drops days,
    // the cut word was a meal label inside the hours ("Saturday Brunch 10-2"): try the whole block instead.
    let found = parseHoursText(end >= 0 ? full.slice(0, end + 12) : full, {listed: true});
    if (end >= 0 && (!found || found.listed < 7)) {
      const whole = parseHoursText(full, {listed: true});
      if (whole && whole.listed > (found?.listed || 0)) found = whole;
      // Days missing from the cut block that the rest of the block names ("Brunch Sat & Sun") are unknown, not closed.
      else if (found && mentionedDays(full.slice(end + 12)).some(d => !found.days.includes(d))) found = null;
    }
    if (found) blocks.push({at: m.index, schedule: found.schedule});
  }
  const distinct = [...new Map(blocks.map(b => [JSON.stringify(b.schedule), b])).values()];
  if (!distinct.length) return null;
  // A site shared by several branches must show this branch's address before its hours count.
  if (distinct.length === 1 && !requireAddress) return distinct[0].schedule;
  // Several locations on one page: use the block after this place's street address.
  if (!housenumber || !street) return null;
  const word = street.toLowerCase().replace(/\b(north|south|east|west|n|s|e|w|street|st|avenue|ave|road|rd|boulevard|blvd)\b\.?/g, '').trim().split(/\s+/)[0];
  const address = lower.search(new RegExp(`\\b${housenumber}\\b[^\\n]{0,40}\\b${word}`));
  if (address < 0) return null;
  const after = blocks.filter(b => b.at > address).sort((a, b) => a.at - b.at)[0];
  return after && after.at - address < 900 ? after.schedule : null;
}

// Distinct street addresses written on a page ("1220 W Taylor St", "131 North Clinton"): more than one means a multi-location page.
export function addressCount(html) {
  const text = pageText(html).toLowerCase().replace(/\s+/g, ' ');
  const found = [...text.matchAll(/\b(\d{2,5})\s+(n|s|e|w|north|south|east|west)\.?\s+([a-z]+)/g)].map(m => `${m[1]} ${m[3]}`);
  return new Set(found).size;
}
