// Keep IDs stable: profiles and the tagging pipeline share this catalog.
export const INTERESTS = [
  {id:'music', label:'Live music', emoji:'🎵', terms:['music','concert','radio','jazz','orchestra','band','dj','karaoke','symphony']},
  {id:'arts', label:'Arts & culture', emoji:'🎨', terms:['art','arts','museum','gallery','exhibition','painting','ceramics','photography','drawing','craft','crafts','creative','poetry','book club','bookmarks']},
  {id:'food', label:'Food & coffee', emoji:'☕', terms:['food','coffee','cafe','café','cooking','baking','dinner','lunch','brunch','pizza','potluck','cuisine']},
  {id:'outdoors', label:'The outdoors', emoji:'🌿', terms:['outdoor','outdoors','hiking','hike','garden','nature','kayak','camping','birding','park','lakefront']},
  {id:'sports', label:'Sports & movement', emoji:'🏀', terms:['sports','sport','basketball','soccer','volleyball','football','climbing','running','run','yoga','fitness','workout','cycling','swimming','softball','baseball','marathon','pilates','f45']},
  {id:'gaming', label:'Games & trivia', emoji:'🎮', terms:['gaming','game','games','esports','trivia','chess','board game','video game']},
  {id:'tech', label:'Tech & making', emoji:'💻', terms:['technology','tech','coding','code','hackathon','robotics','engineering','maker','software','computer','artificial intelligence','ai','analytics','data science','python','cybersecurity']},
  {id:'career', label:'Career & ideas', emoji:'💡', terms:['career','networking','internship','entrepreneur','entrepreneurship','startup','founder','recruiting','resume','résumé','professional','industry','research','lecture','seminar','firm night','office visit','cpa']},
  {id:'volunteering', label:'Giving back', emoji:'🤝', terms:['volunteer','volunteering','service','fundraiser','donation','cleanup','mentoring','tutoring']},
  {id:'film', label:'Film & theatre', emoji:'🎬', terms:['film','movie','cinema','theatre','theater','screening','comedy','improv','performance']},
  {id:'dance', label:'Dance', emoji:'🪩', terms:['dance','dancing','salsa','bachata','ballet','ballroom','swing','garba','raas','kpop']},
  {id:'social', label:'Meeting people', emoji:'✨', terms:['social','mixer','meetup','meet-up','hangout','welcome','meet and greet','open house','community gathering']},
];
export const INTEREST_IDS = INTERESTS.map(i => i.id);
export const TAGGER_VERSION = 1;
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rules = INTERESTS.map(i => [i.id, new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${i.terms.map(escape).join('|')})(?=$|[^\\p{L}\\p{N}])`, 'iu')]);

export function classifyEvent(event) {
  // Public content only. Names, pronouns and account data never enter tagging.
  const text = [event.title, event.organizer, event.description, event.category,
    event.place?.category, ...(event.place?.tags || [])].filter(Boolean).join(' ');
  return rules.filter(([, rule]) => rule.test(text)).map(([id]) => id);
}
export function tagEvent(event) {
  return {...event, interestIds:classifyEvent(event), interestTaggerVersion:TAGGER_VERSION};
}
export function rankEvents(events, interests, now = new Date()) {
  const selected = new Set(interests.filter(id => INTEREST_IDS.includes(id)));
  if (!selected.size) return [];
  const seen = new Set();
  return events.flatMap(event => {
    const key = event.id || `${event.place?.id || ''}:${event.title}:${event.start}`;
    if (seen.has(key)) return [];
    seen.add(key);
    // Venue exhibitions use inclusive Chicago dates; campus events use timestamps.
    const end = String(event.end || event.endAt || '');
    const today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    if (!end || (/^\d{4}-\d{2}-\d{2}$/.test(end) ? end < today : !Number.isFinite(Date.parse(end)) || Date.parse(end) <= +now)) return [];
    const matched = classifyEvent(event).filter(id => selected.has(id));
    return matched.length ? [{event, matched, score:matched.length}] : [];
  }).sort((a,b) => b.score-a.score || String(a.event.start || '').localeCompare(String(b.event.start || '')) || a.event.title.localeCompare(b.event.title));
}
