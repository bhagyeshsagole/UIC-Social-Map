import React, {useState} from 'react';
import {ArrowUpRight, CalendarDays, GraduationCap, MapPin, Users} from 'lucide-react';
import CampusEvents from './CampusEventList.jsx';
import {directions} from './time';
import {shortDate} from './search';

const scopes = [['UIC', GraduationCap], ['Off-campus', MapPin], ['Community', Users]];
// Affiliation follows the host, not distance: UIC Connection outings remain UIC
// even at an external venue. Gallery 400 is UIC's gallery; an admission perk at
// an independent museum does not make that museum a UIC-affiliated organizer.
const uicVenues = new Set(['gallery-400']);

function VenueEvents({events}) {
  return <div className="campus-event-grid">{events.map(e => <article className="campus-event-card venue-event-card" key={`${e.place.id}:${e.title}`}>
    <div className="campus-event-date"><CalendarDays size={16}/><span>Through {shortDate(e.end)}</span></div>
    <h3><a href={e.url} target="_blank" rel="noreferrer">{e.title}</a></h3>
    <p className="campus-organizer">{e.place.name}</p>
    <p className="campus-location"><MapPin size={17}/><span>{e.place.address}, Chicago</span></p>
    <div className="campus-event-actions"><a className="secondary-button" href={e.url} target="_blank" rel="noreferrer">Event details <ArrowUpRight size={15}/></a><a className="text-link" href={directions(e.place)} target="_blank" rel="noreferrer">Maps <ArrowUpRight size={15}/></a></div>
  </article>)}</div>;
}

export default function LiveEvents({calendar, now, exhibitions, onMyEvents}) {
  const [scope, setScope] = useState('UIC');
  const venueEvents = exhibitions.filter(e => uicVenues.has(e.place.id) === (scope === 'UIC'));
  return <>
    <div className="event-scope-tags" role="group" aria-label="Event categories">
      {scopes.map(([label, Icon]) => <button key={label} aria-pressed={scope === label} onClick={() => setScope(label)}><Icon size={17}/>{label}</button>)}
    </div>
    <div className="event-results" key={scope} role="region" aria-label={`${scope} events`}>
      {scope === 'UIC' && <><CampusEvents calendar={calendar} now={now}/>{venueEvents.length > 0 && <section className="venue-events"><h2>UIC exhibitions</h2><VenueEvents events={venueEvents}/></section>}</>}
      {scope === 'Off-campus' && <section className="venue-events"><div className="event-category-intro"><h2>Around the city</h2><p>Events and exhibitions from independent Chicago venues.</p></div>{venueEvents.length ? <VenueEvents events={venueEvents}/> : <div className="empty"><MapPin/><h3>No off-campus listings right now</h3><p>Check back for more events around Chicago.</p></div>}</section>}
      {scope === 'Community' && <section className="community-events empty"><Users size={32}/><h2>Plans start with people.</h2><p>Events shared by members will appear here.</p><p className="community-note">No community events have been published yet. Your private drafts stay in My Events.</p><button className="secondary-button" onClick={onMyEvents}>View My Events <ArrowUpRight size={16}/></button></section>}
    </div>
  </>;
}
