import ShareEvent from './ShareEvent.jsx';
import React, {useEffect, useState} from 'react';
import {ArrowUpRight, CalendarDays, GraduationCap, MapPin, Users, X, Sparkles} from 'lucide-react';
import CampusEvents, {DatePicker, CampusEventCard} from './CampusEventList.jsx';
import {campusMonth, onCampusDate} from './campusEvents';
import {directions} from './time';
import {venueDates} from './search';

import {useAuth} from './auth/AuthProvider.jsx';
import {INTERESTS,rankEvents} from './interests.js';

const scopes = [['For you', Sparkles], ['UIC', GraduationCap], ['Off-campus', MapPin], ['Community', Users]];
// Affiliation follows the host, not distance: UIC Connection outings remain UIC
// even at an external venue. Gallery 400 is UIC's gallery; an admission perk at
// an independent museum does not make that museum a UIC-affiliated organizer.
const uicVenues = new Set(['gallery-400']);

export function VenueEventCard({event:e, onSelectEvent}) {
  return <article className={`campus-event-card venue-event-card ${e.venue?'has-map-event':''}`} onClick={event=>{if(e.venue&&!event.target.closest('a,button,dialog'))onSelectEvent(e);}}>
    <div className="campus-event-date"><CalendarDays size={16}/><span>{venueDates(e)}</span></div>
    <h3>{e.venue?<button className="event-map-title" onClick={()=>onSelectEvent(e)} aria-label={`Show ${e.title} on map`}>{e.title}</button>:<a href={e.url} target="_blank" rel="noreferrer">{e.title}</a>}</h3>
    <p className="campus-organizer">{e.place.name}</p>
    <p className="campus-location"><MapPin size={17}/><span>{e.place.address}, Chicago</span></p>
    <div className="campus-event-actions"><ShareEvent event={e}/><a className="secondary-button" href={e.url} target="_blank" rel="noreferrer">Event details <ArrowUpRight size={15}/></a><a className="text-link" href={directions(e.place)} target="_blank" rel="noreferrer">Maps <ArrowUpRight size={15}/></a></div>
  </article>;
}

function VenueEvents({events, onSelectEvent}) {
  return <div className="campus-event-grid">{events.map(e => <VenueEventCard key={`${e.place.id}:${e.title}`} event={e} onSelectEvent={onSelectEvent}/>)}</div>;
}

export default function LiveEvents({calendar, now, exhibitions, onMyEvents, onSelectEvent}) {
  const auth=useAuth();
  const [scope, setScope] = useState(auth.profile?.interests?.length?'For you':'UIC'), [day, setDay] = useState('');
  const month = campusMonth(now);
  const recommendations=rankEvents([...calendar.events,...exhibitions],auth.profile?.interests||[],now);
  const suggested=day?recommendations.filter(r=>onCampusDate(r.event,day)):recommendations;
  useEffect(() => setDay(''), [month]);
  const scopeVenueEvents = exhibitions.filter(e => uicVenues.has(e.place.id) === (scope === 'UIC'));
  const venueEvents = day ? scopeVenueEvents.filter(e => onCampusDate(e, day)) : scopeVenueEvents;
  // One date filter for every tab; its calendar only offers days with events in the open tab.
  const pickable = scope === 'For you' ? recommendations.map(r=>r.event) : scope === 'UIC' ? [...calendar.events, ...scopeVenueEvents] : scope === 'Off-campus' ? scopeVenueEvents : [];
  return <>
    <div className="event-scope-tags" role="group" aria-label="Event categories">
      {scopes.map(([label, Icon]) => <button key={label} aria-pressed={scope === label} onClick={() => setScope(label)}><Icon size={17}/>{label}</button>)}
      <div className="scope-date"><DatePicker now={now} events={pickable} value={day} onChange={setDay}/>{day && <button className="date-clear" onClick={() => setDay('')} aria-label="Clear date"><X size={15}/></button>}</div>
    </div>
    <div className="event-results" key={scope} role="region" aria-label={`${scope} events`}>
      {scope === 'For you' && <section className="venue-events"><div className="event-category-intro for-you-intro"><div><h2>{auth.profile?`Picked for ${auth.profile.display_name}`:'Find your kind of plans'}</h2><p>{auth.profile?'Based on the interests you chose.':'Sign in and choose your interests to get personal event suggestions.'}</p></div><button className="text-link" onClick={()=>{auth.openProfile();if(auth.profile)auth.setEditing(true);}}>{auth.profile?'Edit interests':'Sign in'} <ArrowUpRight size={15}/></button></div>{suggested.length?<div className="campus-event-grid recommendation-grid">{suggested.map(({event,matched})=><div className="recommendation-card" key={event.id||`${event.place?.id}:${event.title}`}><div className="recommendation-reasons">{matched.map(id=><span key={id}>{INTERESTS.find(i=>i.id===id)?.label}</span>)}</div>{event.place?<VenueEventCard event={event} onSelectEvent={onSelectEvent}/>:<CampusEventCard event={event} onSelectEvent={onSelectEvent}/>}</div>)}</div>:<div className="empty"><Sparkles size={28}/><h3>{auth.profile?'More plans are on the way.':'Make discovery yours.'}</h3><p>{auth.profile?'No matches right now. Try another date, update your interests, or browse all UIC events.':'Add your interests to see what’s happening around you.'}</p></div>}</section>}
      {scope === 'UIC' && <><CampusEvents calendar={calendar} day={day} onSelectEvent={onSelectEvent}/>{venueEvents.length > 0 && <section className="venue-events"><h2>UIC exhibitions</h2><VenueEvents events={venueEvents} onSelectEvent={onSelectEvent}/></section>}</>}
      {scope === 'Off-campus' && <section className="venue-events"><div className="event-category-intro"><h2>Around the city</h2><p>{day ? `${venueEvents.length} ${venueEvents.length === 1 ? 'event' : 'events'} on this date from independent Chicago venues.` : 'Events and exhibitions from independent Chicago venues.'}</p></div>{venueEvents.length ? <VenueEvents events={venueEvents} onSelectEvent={onSelectEvent}/> : <div className="empty"><MapPin/><h3>{day ? 'No off-campus events on this date' : 'No off-campus listings right now'}</h3><p>{day ? 'Pick another date or show all dates.' : 'Check back for more events around Chicago.'}</p></div>}</section>}
      {scope === 'Community' && <section className="community-events empty"><Users size={32}/><h2>Plans start with people.</h2><p>Events shared by members will appear here.</p><p className="community-note">No community events have been published yet. Your private drafts stay in My Events.</p><button className="secondary-button" onClick={onMyEvents}>View My Events <ArrowUpRight size={16}/></button></section>}
    </div>
  </>;
}
