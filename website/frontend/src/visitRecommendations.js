import {classifyEvent} from './interests.js';
import {chicagoDate} from './time.js';
export function visitRecommendations(events,interests,now=new Date(),limit=4){
 const today=chicagoDate(now),seen=new Set(),selected=new Set(interests||[]);
 return events.flatMap(event=>{
  const id=event.id||`${event.place?.id}:${event.title}:${event.start}`;
  if(seen.has(id))return [];seen.add(id);
  const end=String(event.end||event.endAt||event.date||'');
  if(!end||(/^\d{4}-\d{2}-\d{2}$/.test(end)?end<today:!Number.isFinite(Date.parse(end))||Date.parse(end)<=+now))return [];
  const matched=classifyEvent(event).filter(i=>selected.has(i));
  const start=String(event.start||event.date||today),date=start.slice(0,10);
  const days=(Date.parse(`${date}T12:00:00Z`)-Date.parse(`${today}T12:00:00Z`))/86400000;
  return [{event,matched,score:matched.length+(days<=7?2:days<=14?1:0),start}];
 }).sort((a,b)=>b.score-a.score||a.start.localeCompare(b.start)||a.event.title.localeCompare(b.event.title)).slice(0,limit);
}
