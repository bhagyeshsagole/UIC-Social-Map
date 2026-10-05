import React, {useEffect, useState} from 'react';
import {ArrowUpRight, CalendarDays, MapPin, RefreshCw} from 'lucide-react';
import {CAMPUS_CALENDAR, campusMonth, eventWhen, upcomingCampusEvents} from './campusEvents';

async function readFeed(url, signal) {
  const response = await fetch(url, {signal, cache:'no-store'});
  if (!response.ok) throw new Error('Calendar unavailable');
  const data = await response.json();
  if (data.schemaVersion !== 1 || !Array.isArray(data.events) || !data.fetchedAt) throw new Error('Invalid calendar');
  return data;
}
export function useCampusEvents(now) {
  const [feed, setFeed] = useState(null), [status, setStatus] = useState('loading'), [attempt, setAttempt] = useState(0);
  const month = campusMonth(now);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let active = true;
    setStatus('loading');
    (async () => {
      // The checked snapshot keeps the list usable while the public source loads.
      try {
        const snapshot = await readFeed(`${import.meta.env.BASE_URL}campus-events.json`, controller.signal);
        if (active) setFeed(previous => previous && previous.fetchedAt > snapshot.fetchedAt ? previous : snapshot);
      } catch { /* Try the live endpoint even if no snapshot was bundled. */ }
      try {
        const live = await readFeed(`${import.meta.env.BASE_URL}api/campus-events`, controller.signal);
        if (active) { setFeed(live); setStatus('ready'); }
      } catch { if (active) setStatus('offline'); }
      finally { clearTimeout(timeout); }
    })();
    const interval = setInterval(() => setAttempt(v => v + 1), 15 * 60000);
    return () => { active = false; controller.abort(); clearTimeout(timeout); clearInterval(interval); };
  }, [month, attempt]);
  return {feed, status, events:upcomingCampusEvents(feed?.events || [], now), refresh:() => setAttempt(v => v + 1)};
}

export default function CampusEvents({calendar, now}) {
  const {feed, status, events, refresh} = calendar;
  const [query, setQuery] = useState('');
  const shown = events.filter(e => `${e.title} ${e.organizer} ${e.location}`.toLowerCase().includes(query.toLowerCase()));
  const month = new Intl.DateTimeFormat('en-US', {timeZone:'America/Chicago', month:'long', year:'numeric'}).format(now);
  const checked = feed && new Intl.DateTimeFormat('en-US', {timeZone:'America/Chicago', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}).format(new Date(feed.fetchedAt));
  return <section className="campus-events" aria-label="Upcoming UIC events">
    <div className="campus-heading"><div><h2>{month} at UIC</h2><p>{events.length} upcoming events · Chicago time</p></div><button className="icon-button" onClick={refresh} disabled={status === 'loading'} aria-label="Refresh UIC events"><RefreshCw size={17}/></button></div>
    <div className="campus-feed-status" role="status">{status === 'loading' ? 'Checking UIC Connection…' : status === 'offline' ? (feed ? 'Showing saved listings; live refresh unavailable.' : 'UIC Connection is unavailable. Try again or open the calendar.') : 'From UIC Connection'}{checked && <span>Checked {checked} CT</span>}</div>
    <div className="campus-search"><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find an event, host, or location…" aria-label="Search UIC events"/><a href={CAMPUS_CALENDAR} target="_blank" rel="noreferrer">UIC calendar <ArrowUpRight size={14}/></a></div>
    <div className="campus-event-grid">{shown.map(e => <article className="campus-event-card" key={e.id}>
      <div className="campus-event-date"><CalendarDays size={15}/><time dateTime={e.start}>{eventWhen(e)}</time></div>
      <h3><a href={e.url} target="_blank" rel="noreferrer">{e.title}</a></h3><p className="campus-organizer">{e.organizer}</p>
      <p className="campus-location"><MapPin size={15}/><span>{e.location}</span></p>
      <div className="campus-event-actions"><a className="secondary-button" href={e.url} target="_blank" rel="noreferrer">Details & registration <ArrowUpRight size={14}/></a><a className="text-link" href={e.locationUrl} target="_blank" rel="noreferrer">{e.hasPublicLocation ? 'Maps' : 'View location'} <ArrowUpRight size={14}/></a></div>
      {!e.hasPublicLocation && <small className="campus-location-note">UIC sign-in may be needed for the location.</small>}
    </article>)}</div>
    {!shown.length && status !== 'loading' && <div className="empty"><CalendarDays/><h3>{query ? 'No matching events' : 'No upcoming UIC events to show'}</h3><p>{query ? 'Try another event, host, or location.' : 'Check the UIC calendar for new listings.'}</p></div>}
  </section>;
}
