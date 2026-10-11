import {RegistrationLink} from './RegistrationReturn.jsx';
import ShareEvent from './ShareEvent.jsx';
import React, {useEffect, useRef, useState} from 'react';
import {ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, MapPin, X} from 'lucide-react';
import {CAMPUS_CALENDAR, CAMPUS_MONTHS, addMonths, campusDate, campusMonth, dayLabel, eventWhen, monthDates, monthLabel, onCampusDate, upcomingCampusEvents} from './campusEvents';

import {campusFeed,preloadEvents} from './eventFeed.js';
import {useResource} from './useResource.js';
export function useCampusEvents(now) {
 const state=useResource(campusFeed);
 useEffect(()=>{preloadEvents();},[]);
 const feed=state.data;
 return {feed,status:state.error?'offline':feed?'ready':'loading',events:upcomingCampusEvents(feed?.events||[],now),refresh:()=>campusFeed.refresh({force:true})};
}

export function CampusEventCard({event:e, onSelectEvent}) {
  return <article className={`campus-event-card ${e.venue?'has-map-event':''}`} onClick={event=>{if(e.venue&&!event.target.closest('a,button,dialog'))onSelectEvent(e);}}>
    <div className="campus-event-date"><CalendarDays size={15}/><time dateTime={e.start}>{eventWhen(e)}</time></div>
    <h3>{e.venue?<button className="event-map-title" onClick={()=>onSelectEvent(e)} aria-label={`Show ${e.title} on map`}>{e.title}</button>:<RegistrationLink event={e}>{e.title}</RegistrationLink>}</h3><p className="campus-organizer">{e.organizer}</p>
    <p className="campus-location"><MapPin size={15}/><span>{e.venue&&<strong className="event-venue-name">{e.venue.name}</strong>}{e.location}</span></p>
    <div className="campus-event-actions"><ShareEvent event={e}/><RegistrationLink className="secondary-button" event={e}>Details & registration <ArrowUpRight size={14}/></RegistrationLink><a className="text-link" href={e.locationUrl} target="_blank" rel="noreferrer">{e.hasPublicLocation ? 'Maps' : 'View location'} <ArrowUpRight size={14}/></a></div>
    {!e.hasPublicLocation && <small className="campus-location-note">{e.location === 'Online event' ? 'The meeting link is on UIC Connection.' : 'UIC sign-in may be needed for the location.'}</small>}
  </article>;
}

// Month grid starting at the current Chicago month; only days with upcoming events can be picked.
export function DatePicker({now, events, value, onChange}) {
  const [open, setOpen] = useState(false), [view, setView] = useState(''), ref = useRef();
  const today = campusDate(now), first = campusMonth(now);
  // Arrows stop at the last month that still has an event on it.
  const last = events.reduce((max, e) => { const end = (e.endDate || e.end || e.startDate || '').slice(0, 7); return end > max ? end : max; }, first);
  const final = last < addMonths(first, CAMPUS_MONTHS - 1) ? last : addMonths(first, CAMPUS_MONTHS - 1);
  const month = view && view >= first && view <= final ? view : first;
  const {lead, dates} = monthDates(now, month);
  const counts = Object.fromEntries(dates.map(d => [d, events.filter(e => onCampusDate(e, d)).length]));
  useEffect(() => {
    if (!open) return;
    const away = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('pointerdown', away); window.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', esc, true); };
  }, [open]);
  return <div className="date-picker" ref={ref}>
    <button className={`date-picker-toggle ${value ? 'has-date' : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => { if (!open) setView(value ? value.slice(0, 7) : first); setOpen(!open); }}><CalendarDays size={16}/><span>{value ? dayLabel(value) : 'Pick a date'}</span></button>
    {open && <div className="date-picker-pop glass" role="dialog" aria-label="Pick a date">
      <div className="date-picker-month"><span aria-live="polite">{monthLabel(month)}</span><div className="date-picker-nav">
        <button aria-label="Previous month" disabled={month <= first} onClick={() => setView(addMonths(month, -1))}><ChevronLeft size={16}/></button>
        <button aria-label="Next month" disabled={month >= final} onClick={() => setView(addMonths(month, 1))}><ChevronRight size={16}/></button>
      </div></div>
      <div className="date-picker-grid">
        {['S','M','T','W','T','F','S'].map((d, i) => <span key={i} className="date-picker-weekday" aria-hidden="true">{d}</span>)}
        {Array.from({length:lead}, (_, i) => <span key={`lead-${i}`}/>)}
        {dates.map(d => <button key={d} aria-pressed={value === d} disabled={d < today || !counts[d]} className={d === today ? 'is-today' : ''} aria-label={`${dayLabel(d)}, ${counts[d]} ${counts[d] === 1 ? 'event' : 'events'}`} onClick={() => { onChange(d); setOpen(false); }}>{Number(d.slice(8))}{counts[d] > 0 && d >= today && <i/>}</button>)}
      </div>
      {value && <button className="text-link date-picker-all" onClick={() => { onChange(''); setOpen(false); }}>Show all dates</button>}
    </div>}
  </div>;
}

export default function CampusEvents({calendar, onSelectEvent, day}) {
  const {status, events, feed} = calendar;
  const [query, setQuery] = useState('');
  const onDay = day ? events.filter(e => onCampusDate(e, day)) : events;
  const shown = onDay.filter(e => `${e.title} ${e.organizer} ${e.location}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="campus-events" aria-label="Upcoming UIC events">
    <div className="campus-heading"><p>{day ? `${onDay.length} ${onDay.length === 1 ? 'event' : 'events'} on ${dayLabel(day)}` : `${events.length} upcoming events`}</p></div>
    {status !== 'ready' && <div className="campus-feed-status" role="status">{status === 'loading' ? 'Checking UIC Connection…' : feed ? 'Showing saved listings; live refresh unavailable.' : 'UIC Connection is unavailable. Open the UIC calendar for listings.'}</div>}
    <div className="campus-search"><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find an event, host, or location…" aria-label="Search UIC events"/><a href={CAMPUS_CALENDAR} target="_blank" rel="noreferrer">UIC calendar <ArrowUpRight size={14}/></a></div>
    <div className="campus-event-grid">{shown.map(e => <CampusEventCard key={e.id} event={e} onSelectEvent={onSelectEvent}/>)}</div>
    {!shown.length && status !== 'loading' && <div className="empty"><CalendarDays/><h3>{query ? 'No matching events' : day ? 'No UIC events on this date' : 'No upcoming UIC events to show'}</h3><p>{query ? 'Try another event, host, or location.' : day ? 'Pick another date or show all dates.' : 'Check the UIC calendar for new listings.'}</p></div>}
  </section>;
}
