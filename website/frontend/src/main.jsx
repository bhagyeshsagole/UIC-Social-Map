import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Radio,Search,ArrowUpRight,ArrowLeft,ArrowRight,Plus,X,Bookmark,Check,MapPin,Clock,SlidersHorizontal,Sun,Moon,CalendarDays,Landmark,User,ChevronDown,Compass,ExternalLink,Ticket,Leaf,GraduationCap} from 'lucide-react';
import Map,{PlaceIcon} from './Map';
import Spotlight from './Spotlight';
import {useCampusEvents,CampusEventCard} from './CampusEventList.jsx';
import LiveEvents,{VenueEventCard} from './LiveEvents.jsx';
import venueRegistry from './event-venues.json';
import {resolveEventVenue,groupByVenue} from './eventLocations';
import {DIET,DIET_STATUS,servesFood,dietMatches} from './diet';
import {buildIndex,shortDate,eventTime} from './search';
import {parsePlaces} from './content';
import copy from '../../../added_sites.md?raw';
import {details,CHECKED} from './placeDetails';
import {solarState,clockTime,openingStatus,currentEvents,directions,chicagoDate,chicagoDay,dayHours,weekHours,formatMinutes,DAYS} from './time';
import {keepSafariRunway} from './safariRunway';
import {readStore,STORAGE_KEYS} from './storage';
import {AuthProvider,useAuth} from './auth/AuthProvider.jsx';
import AccountDialog,{Avatar} from './auth/AccountDialog.jsx';
import './styles.css';
import './private-events.css';
import PrivateEventCreator from './PrivateEventCreator.jsx';
import ShareEvent from './ShareEvent.jsx';
import {readEventLink,cleanEvent} from './privateEvents';
import {lookupBuilding} from './buildingDetails';
const places=parsePlaces(copy).map(p=>({...details[p.id],...p}));
// Every off-campus place's building is purple; UIC buildings stay red and open spaces keep only their pin.
const placeVenues=places.map(p=>resolveEventVenue({place:p},venueRegistry.venues)).filter(v=>v&&v.kind!=='outdoor'&&!v.id.startsWith('uic-'));
const categories=['All places','Food & drink','Cafes','Nightlife','Arts & culture','Sights','Get active','Outdoors'];
function External({href,children,...props}) {return <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>;}
function App(){
 const auth=useAuth();
 const storeKeys=auth.user?{saved:`kampuscape-saved:${auth.user.id}`,drafts:`kampuscape-drafts:${auth.user.id}`}:STORAGE_KEYS;
 const [now,setNow]=useState(new Date()),[tab,setTab]=useState('Explore'),[category,setCategory]=useState('All places'),[query,setQuery]=useState(''),[selected,setSelected]=useState(null),[free,setFree]=useState(false),[diet,setDiet]=useState('All diets'),[filters,setFilters]=useState(false),[saved,setSaved]=useState(()=>readStore(storeKeys.saved,[])),[drafts,setDrafts]=useState(()=>readStore(storeKeys.drafts,[])),[reset,setReset]=useState(0),[notice,setNotice]=useState(''),[storageError,setStorageError]=useState(false),[panelOpen,setPanelOpen]=useState(false),[spotlight,setSpotlight]=useState(false),[focusedEvent,setFocusedEvent]=useState(null),[focusedVenue,setFocusedVenue]=useState(null);
 const [sharedLink,setSharedLink]=useState(()=>readEventLink(window.location.hash)),[creating,setCreating]=useState(false),[pickingBuilding,setPickingBuilding]=useState(false),[pickedBuilding,setPickedBuilding]=useState(null);
 const search=useRef();
 const solar=solarState(now);
 const privateEvents=drafts.filter(d=>d.source==='Private event').map(cleanEvent).filter(Boolean);
 const linkedEvent=sharedLink.event;
 const mapPrivateEvents=[...privateEvents,...(linkedEvent?.source==='Private event'&&!privateEvents.some(e=>e.id===linkedEvent.id)?[linkedEvent]:[])];
 useEffect(()=>{const read=()=>{const link=readEventLink(window.location.hash);setSharedLink(link);setFocusedEvent(link.event);setPanelOpen(false);setSelected(null);if(link.error)setNotice(link.error);};read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);},[]);
 useEffect(()=>{document.title=focusedEvent?.title||'Kampuscape · Chicago, together';},[focusedEvent?.title]);
 const clearEventHash=()=>{if(window.location.hash.startsWith('#event='))history.replaceState(null,'',window.location.pathname+window.location.search);setSharedLink({event:null,error:''});};
 const startCreate=()=>{if(!auth.user||!auth.profile?.onboarding_completed_at){auth.openProfile();return;}setSelected(null);setFocusedVenue(null);setPickedBuilding(null);setPickingBuilding(true);setCreating(true);setSpotlight(false);setPanelOpen(false);setFocusedEvent(null);};
 const cancelCreate=()=>{setCreating(false);setPickingBuilding(false);setPickedBuilding(null);};
 const deleteEvent=event=>{setDrafts(v=>v.filter(d=>d.id!==event.id));if(focusedEvent?.id===event.id)setFocusedEvent(null);if(linkedEvent?.id===event.id)clearEventHash();setNotice('Event deleted from this device');};
 const createPrivateEvent=event=>{setDrafts(v=>[...v,event]);cancelCreate();setSelected(null);setPanelOpen(false);setFocusedEvent(event);setTab('My Events');setNotice('Private event created. Your building is yellow.');};
 const pickBuilding=venue=>{if(!venue){setNotice('Tap a building footprint to place your event pin.');return;}setPickedBuilding({...venue});};

 // Resolve only this selection; cancel on repin, dismissal, save, or unmount.
 useEffect(()=>{
   if(!creating || !pickedBuilding?.needsLookup)return;
   let cancelled=false;
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),12000);
   const id=pickedBuilding.id;
   const finish=details=>setPickedBuilding(current=>current?.id===id?{...current,...details,needsLookup:false,lookupMissing:!details?.name}:current);
   lookupBuilding(pickedBuilding,{signal:controller.signal,endpoint:import.meta.env.VITE_BUILDING_LOOKUP_URL || undefined})
     .then(details=>{if(!controller.signal.aborted)finish(details);})
     .catch(()=>{if(!cancelled)finish(null);}).finally(()=>clearTimeout(timeout));
   return()=>{cancelled=true;clearTimeout(timeout);controller.abort();};
 },[creating,pickedBuilding?.id,pickedBuilding?.needsLookup]);

 const rawCampusCalendar=useCampusEvents(now);
 const campusCalendar={...rawCampusCalendar,events:rawCampusCalendar.events.map(e=>({...e,venue:resolveEventVenue(e,venueRegistry.venues)}))};
 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(t);},[]);
 useEffect(()=>keepSafariRunway(),[]);
 useEffect(()=>{try{localStorage.setItem(storeKeys.saved,JSON.stringify(saved));localStorage.setItem(storeKeys.drafts,JSON.stringify(drafts));}catch{setStorageError(true);}},[saved,drafts]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(t);},[notice]);
 // Touch screens don't get an automatic keyboard when Explore opens.
 useEffect(()=>{if(panelOpen&&!selected&&tab==='Explore'&&!window.matchMedia?.('(pointer: coarse)').matches)search.current?.focus();},[panelOpen,selected,tab]);
 useEffect(()=>{const ground=solar.night?'#292f3b':'#e3e3dc';document.documentElement.style.backgroundColor=ground;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',ground);},[solar.night]);
 useEffect(()=>{const key=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setSpotlight(true);}if(e.key==='Escape'){setFocusedEvent(null);setFocusedVenue(null);setSelected(null);setPanelOpen(false);setFilters(false);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const filtered=places.filter(p=>(category==='All places'||p.category===category)&&(!free||p.kind==='free')&&(diet==='All diets'||dietMatches(p,diet))&&(`${p.name} ${p.description} ${p.tags.join(' ')}`).toLowerCase().includes(query.toLowerCase()));
 const visible=tab==='Saved'?places.filter(p=>saved.includes(p.id)):filtered;
 const events=places.flatMap(p=>currentEvents(p,now).map(e=>({...e,place:p,venue:resolveEventVenue({place:p},venueRegistry.venues)})));
 const mapEvents=[...campusCalendar.events,...events].filter(e=>e.venue);
 const venueGroups=groupByVenue([...mapEvents,...mapPrivateEvents]);
 const venueMatches=focusedVenue&&!selected?focusedVenue.map(id=>venueGroups[id]).filter(Boolean):[],venueView=venueMatches.length?venueMatches:null;
 const venueList=venueView?[...new Set(venueView.flatMap(g=>g.events))].sort((a,b)=>String(a.start).localeCompare(String(b.start))):[];
 useEffect(()=>{if(focusedEvent&&!['Private event','Shared event'].includes(focusedEvent.source)&&!mapEvents.some(e=>e.venue.id===focusedEvent.venue.id&&e.title===focusedEvent.title&&e.start===focusedEvent.start))setFocusedEvent(null);},[focusedEvent,now,rawCampusCalendar.feed]);
 const selectEvent=e=>{if(!e.venue)return;setFocusedVenue(null);setFocusedEvent({...e});setSelected(null);setPanelOpen(false);};
 const pickVenue=ids=>{setFocusedEvent(null);setSelected(null);setFocusedVenue(ids);setPanelOpen(true);};
 // Every event at the selected place: its building's events when it has one, otherwise the place's own calendar.
 const selectedVenue=selected?resolveEventVenue({place:selected},venueRegistry.venues):null;
 const selectedEvents=selected?((selectedVenue&&venueGroups[selectedVenue.id]?.events)||currentEvents(selected,now)):[];
 const openPlaceEvents=()=>selectedVenue&&venueGroups[selectedVenue.id]?pickVenue([selectedVenue.id]):window.open(selectedEvents[0].url,'_blank','noopener,noreferrer');
 const toggleSave=p=>{if(!auth.user||!auth.profile?.onboarding_completed_at){auth.openProfile();return;}setSaved(v=>v.includes(p.id)?v.filter(id=>id!==p.id):[...v,p.id]);};
 const goTab=t=>{setFocusedEvent(null);setFocusedVenue(null);setTab(t);setSelected(null);setPanelOpen(t==='Explore'&&tab==='Explore'?!panelOpen:true);if(t==='Explore')setReset(r=>r+1);};
 const closePanel=()=>{setSelected(null);setFocusedVenue(null);setPanelOpen(false);};
 const openPanel=t=>{setFocusedEvent(null);setFocusedVenue(null);setTab(t);setSelected(null);setPanelOpen(true);};
 const clearFilters=()=>{setQuery('');setCategory('All places');setFree(false);setDiet('All diets');};
 const showPlace=p=>{if(!p)return;setFocusedEvent(null);setFocusedVenue(null);if(!visible.some(v=>v.id===p.id)){setTab('Explore');clearFilters();}setSelected(p);};
 const searchItems=buildIndex({places,saved,drafts,events:[...events,...campusCalendar.events],categories:categories.slice(1)});
 function pick(item){
  if(item.kind==='campus-event')return item.event.venue?selectEvent(item.event):window.open(item.event.url,'_blank','noopener,noreferrer');
  if(item.kind==='event'&&item.event.venue)return selectEvent(item.event);
  if(item.kind==='plan')return item.draft.venue?selectEvent(item.draft):openPanel('My Events');
  if(item.kind==='category'){clearFilters();setCategory(item.category);return openPanel('Explore');}
  if(item.kind==='action')return item.action==='create'?startCreate():openPanel({explore:'Explore',events:'Live events',saved:'Saved',plans:'My Events'}[item.action]);
  showPlace(item.place);
 }
 // On phones an open place, event or building sheet takes the screen; the bottom nav and search step aside.
 const sheetOpen=!!selected||!!venueView||(!!focusedEvent&&!panelOpen);
 return <main className={`${solar.night?'app night':'app day'}${sheetOpen?' sheet-open':''}`}>
  <Map places={visible} selected={selected} onSelect={p=>{setFocusedEvent(null);setFocusedVenue(null);setSelected(p);}} night={solar.night} resetKey={reset} eventVenues={[...placeVenues,...mapEvents.filter(e=>!e.venue.id.startsWith('uic-')).map(e=>e.venue)]} privateEvents={mapPrivateEvents} previewVenue={creating?pickedBuilding:null} pickingBuilding={pickingBuilding} onBuildingPick={pickBuilding} onPrivatePick={selectEvent} focusedEvent={focusedEvent} venueGroups={venueGroups} onVenuePick={pickVenue} focusedVenue={venueView?focusedVenue:null}/>
  <div className="map-legend glass" role="group" aria-label="Map legend"><span><i className="legend-red"/><span className="legend-label">UIC<span className="legend-extra"> Building</span></span></span><span><i className="legend-purple"/><span className="legend-label">Off-campus<span className="legend-extra"> places & events</span></span></span><span><i className="legend-yellow"/><span className="legend-label">Private<span className="legend-extra"> Events</span></span></span></div>
  <header className="topbar" inert={pickingBuilding?true:undefined}>
   <div className="location-status"><div className="location-chip glass"><MapPin size={16}/><span>Chicago, IL</span><span className="location-line"/>{solar.night?<Moon size={18}/>:<Sun size={18}/>}</div><button className="event-count-pill glass" aria-label={`${campusCalendar.events.length+events.length} events available`} onClick={()=>openPanel('Live events')}><CalendarDays size={16}/><span aria-live="polite">{!campusCalendar.feed&&campusCalendar.status==='loading'?'Loading events…':<><strong>{campusCalendar.events.length+events.length}</strong> events <span className="count-available">available</span></>}</span></button></div>
   <nav className="nav-pill glass" aria-label="Main navigation">
    <button className={tab==='Explore'?'active':''} onClick={()=>goTab('Explore')}><Compass size={16}/><span>Explore</span></button>
    <button className={tab==='Live events'?'active':''} onClick={()=>goTab('Live events')}><Radio size={16}/><span>Live events</span></button>
    <button className={tab==='My Events'?'active':''} onClick={()=>goTab('My Events')}><CalendarDays size={16}/><span>My Events</span></button>
    <button className={tab==='Saved'?'active':''} onClick={()=>goTab('Saved')}><Bookmark size={16}/><span>Saved</span>{saved.length>0&&<small>{saved.length}</small>}</button>
    <button onClick={startCreate} aria-label="Create event"><Plus size={17}/><span>Create<span className="nav-extra"> event</span></span></button>
    <span className="nav-divider"/><button className="nav-search" aria-label="Search everything" aria-keyshortcuts="Meta+K Control+K" onClick={()=>setSpotlight(true)}><Search size={19}/></button>
   </nav>
   <button className="search-pill glass" aria-label="Search places and events" onClick={()=>setSpotlight(true)}><Search size={20}/></button>
   <button className="profile glass" aria-label="Open profile" onClick={auth.openProfile}>{auth.profile?<Avatar id={auth.profile.avatar_id} size={27}/>:<User size={19}/>}<span>{auth.profile?.display_name||'Sign in'}</span><ChevronDown size={13}/></button>
  </header>

  {(selected||panelOpen)&&<aside className={`discovery glass ${selected?`has-detail${selected.photo?'':' no-photo'}`:venueView?'has-live-events has-building-events':tab==='Live events'?'has-live-events':''}`} aria-label={selected?"Place details":venueView?"Events in this building":"Discover places"}>
   {selected?<>
    <div className="detail-top"><div className="detail-top-actions"><button className={`icon-button ${saved.includes(selected.id)?'is-saved':''}`} aria-label={saved.includes(selected.id)?'Unsave place':'Save place'} onClick={()=>toggleSave(selected)}><Bookmark size={20} fill={saved.includes(selected.id)?'currentColor':'none'}/></button><button className="icon-button close-panel" aria-label="Close place details" onClick={closePanel}><X size={21}/></button></div></div>
    {selected.photo?<figure className={`place-photo ${selected.accent}`}><img src={`${import.meta.env.BASE_URL}places/${selected.photo.file}`} alt={selected.photo.alt} style={{objectPosition:selected.photo.focus}} onError={e=>{e.currentTarget.style.visibility='hidden';}}/><figcaption><span>{selected.category}</span><External href={selected.photo.href} title={`Photo: ${selected.photo.credit}`}>Photo · {selected.photo.credit}</External></figcaption></figure>:null}
    <div className="detail-content"><span className="eyebrow">{selected.neighborhood}</span><h1>{selected.name}</h1><p className="description">{selected.description}</p><div className="tags">{selected.tags.map(t=><span key={t}>{t}</span>)}</div>
    {selected.benefit&&<div className="benefit-box">{selected.student?<GraduationCap size={22}/>:<Ticket size={22}/>}<div><strong>{selected.benefit}</strong><p>{selected.condition}</p></div></div>}
    <div className="info-row"><MapPin size={17}/><span>{selected.address}, Chicago</span></div>
    {servesFood(selected)&&<section className="diet-section" aria-label="Dietary options"><h3>Dietary</h3><div className="diet-grid">{DIET.map(([key,label])=>{const v=selected.diet?.[key]||'ask';return <div key={key} className={`diet-cell ${v}`}><span>{label}</span><strong>{DIET_STATUS[v]}</strong></div>;})}</div><p className="fine-print">From the menu and the restaurant’s own site. “Ask staff” means they don’t publish it; check before ordering if it matters to you.</p></section>}
    {selected.menu&&<section className="detail-section"><h3>A taste of the menu <UtensilsIcon/></h3>{selected.menu.map(([name,price,desc,tags])=><div className="menu-item" key={name}><div><strong>{name}</strong><span>{price}</span></div><p>{desc}</p><div className="tags">{tags.map(t=><span key={t}>{t}</span>)}</div></div>)}<External className="text-link" href={selected.menuUrl}>Full menu <ArrowUpRight size={14}/></External><p className="fine-print">Menu highlights, not the full menu. Prices and preparation can change; confirm dietary needs with staff.</p></section>}
    <details className="sources"><summary>Sources · checked {CHECKED}</summary>{selected.sources.map(([label,url])=><External key={url} href={url}>{label}<ExternalLink size={12}/></External>)}</details>
    </div><div className={`detail-actions ${selectedEvents.length?'':'no-events'}`}><div className="detail-facts"><HoursCard key={selected.id} place={selected} now={now}/>{selectedEvents.length>0&&<button className="fact-card fact-event" onClick={openPlaceEvents} aria-label={`See ${selectedEvents.length} ${selectedEvents.length===1?'event':'events'} at ${selected.name}`}><CalendarDays size={19}/><div><small>On the calendar</small><strong>{selectedEvents.length===1?selectedEvents[0].title:`${selectedEvents.length} events`}</strong><span>{selectedEvents.length===1?eventTime(selectedEvents[0]):`${selectedEvents[0].title} + ${selectedEvents.length-1} more`}</span><em className="fact-event-more">See {selectedEvents.length===1?'details':'all events'} <ArrowRight size={13}/></em></div></button>}</div><div className="detail-buttons"><External className="primary-button" href={directions(selected)}>Google Maps <ArrowUpRight size={17}/></External><button className="secondary-button" onClick={startCreate}><Plus size={17}/> Make a plan</button></div></div>
   </>:venueView?<>
    <button className="panel-close icon-button" aria-label="Close building events" onClick={closePanel}><X size={21}/></button>
    <div className="panel-intro"><span className="eyebrow">{venueView.map(g=>g.venue.name).join(' · ')}</span><h1>Upcoming events</h1><p>{venueList.length} upcoming {venueList.length===1?'event':'events'}</p></div>
    <div className="event-results">{venueList.length?<div className="campus-event-grid">{venueList.map(e=>e.source==='Private event'?<article className="campus-event-card" key={e.id}><span className="eyebrow">PRIVATE EVENT</span><h3><button className="event-map-title" onClick={()=>selectEvent(e)}>{e.title}</button></h3><p>{eventTime(e)}</p><ShareEvent event={e}/></article>:e.source==='UIC Connection'?<CampusEventCard key={e.id} event={e} onSelectEvent={selectEvent}/>:<VenueEventCard key={`${e.place.id}:${e.title}`} event={e} onSelectEvent={selectEvent}/>)}</div>:<div className="empty"><CalendarDays size={30}/><h3>No upcoming events here</h3><p>Events drop off the map once they end.</p></div>}</div>
   </>:<>
    <button className="panel-close icon-button" aria-label="Close discovery" onClick={closePanel}><X size={21}/></button>
    {tab!=='Explore'&&<div className="panel-intro"><h1>{tab}</h1></div>}
    {tab==='Explore'&&<><div className="search-field"><input ref={search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="A place, a craving, a plan…" aria-label="Search places"/>{query?<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={15}/></button>:null}</div><div className="category-list">{categories.map(c=><button key={c} className={category===c?'chosen':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="list-toolbar"><span>{visible.length} places to explore</span><button aria-label="Filter places" aria-expanded={filters} onClick={()=>setFilters(!filters)}><SlidersHorizontal size={15}/><span>Filters</span>{(free||diet!=='All diets')&&<i/>}</button></div>{filters&&<div className="filter-panel"><label><input type="checkbox" checked={free} onChange={e=>setFree(e.target.checked)}/> Free places only</label><label>Food preferences<select value={diet} onChange={e=>setDiet(e.target.value)}><option>All diets</option>{DIET.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><button className="text-link" onClick={()=>{setFree(false);setDiet('All diets');setQuery('');setCategory('All places');}}>Reset filters</button></div>}</>}
    <div className={tab==='Live events'?'live-events-body':'places-list'}>
     {tab==='Live events'?<LiveEvents calendar={campusCalendar} now={now} exhibitions={events} onSelectEvent={selectEvent} onMyEvents={()=>openPanel('My Events')}/>:tab==='My Events'?null:<>{tab==='Saved'&&<div className="subtle-note">Saved on this device · {saved.length} places</div>}{visible.map(p=><PlaceCard key={p.id} place={p} saved={saved.includes(p.id)} onSave={()=>toggleSave(p)} onSelect={()=>setSelected(p)} now={now}/>)}{visible.length===0&&<div className="empty"><Compass size={30}/><h3>{tab==='Saved'?'A city of possibilities.':'No places found'}</h3><p>{tab==='Saved'?'Tap a bookmark to keep a place here.':'Try another search or clear your filters.'}</p><button className="secondary-button" onClick={()=>{setQuery('');setCategory('All places');setFree(false);setDiet('All diets');goTab('Explore');}}>Explore places</button></div>}</>}
     {tab==='My Events'&&<section className="drafts"><h3>{drafts.length?'Your private events':'Make something happen.'}</h3><p className="fine-print">Saved on this device. Share an event link to invite your people.</p>{drafts.map(d=><div className="draft private-event-card" key={d.id}><CalendarDays size={20}/><div><button className="event-map-title" onClick={()=>d.venue?selectEvent(d):showPlace(places.find(p=>p.id===d.placeId))}>{d.title}</button><span>{d.venue?.name||places.find(p=>p.id===d.placeId)?.name||'Place unavailable'}</span><small>{d.date} · {d.time} Chicago time</small><div className="private-card-actions">{d.venue&&<ShareEvent event={d}/>}<button className="text-link delete-event" aria-label={`Delete ${d.title}`} onClick={()=>deleteEvent(d)}>Delete</button></div></div></div>)}<button className="secondary-button" onClick={startCreate}><Plus size={16}/> Create event</button></section>}
    </div>
   </>}
  </aside>}
  {focusedEvent&&!panelOpen&&!selected&&!creating&&<section className="event-map-detail glass" aria-label="Selected event on map"><button className="icon-button event-map-close" aria-label="Close event on map" onClick={()=>setFocusedEvent(null)}><X size={20}/></button><span className="eyebrow">{focusedEvent.source==='Private event'?'PRIVATE EVENT':focusedEvent.venue?.name||'EVENT DETAILS'}</span><h2>{focusedEvent.title}</h2><p><MapPin size={16}/>{focusedEvent.venue?.name||'Location not published'}</p><p className="event-map-time">{eventTime(focusedEvent)}</p>{focusedEvent.description&&<p className="private-description">{focusedEvent.description}</p>}<div><button className="secondary-button" onClick={()=>openPanel(focusedEvent.source==='Private event'?'My Events':'Live events')}>{focusedEvent.source==='Private event'?'My Events':'Back to events'}</button><ShareEvent event={focusedEvent}/>{focusedEvent.url&&<External className="text-link" href={focusedEvent.url}>Details & registration <ArrowUpRight size={15}/></External>}{privateEvents.some(e=>e.id===focusedEvent.id)&&<button className="text-link delete-event" onClick={()=>deleteEvent(focusedEvent)}>Delete event</button>}{(linkedEvent&&linkedEvent.id===focusedEvent.id)&&!privateEvents.some(e=>e.id===focusedEvent.id)&&<button className="text-link" onClick={()=>{clearEventHash();setFocusedEvent(null);}}>Remove from map</button>}</div>{(linkedEvent&&linkedEvent.id===focusedEvent.id)&&<p className="fine-print">Shared snapshot · check with the sender for updates.</p>}</section>}
  {creating&&<PrivateEventCreator venueGroups={venueGroups} onSelectExisting={e=>{cancelCreate();selectEvent(e);}} pickedVenue={pickedBuilding} picking={pickingBuilding} onPickMap={setPickingBuilding} onCancel={cancelCreate} onCreate={createPrivateEvent} now={now}/>}
  <Spotlight open={spotlight} items={searchItems} onClose={()=>setSpotlight(false)} onPick={pick}/>
  {(notice||storageError)&&<div className="toast glass" role="status"><Check size={17}/>{storageError?'Device storage unavailable. Changes last for this session.':notice}</div>}

 </main>;
}
function HoursCard({place:p,now}){
 const [open,setOpen]=useState(false),ref=useRef(),today=chicagoDay(now),todays=dayHours(p,today),status=openingStatus(p,now);
 const next=todays==='Closed'&&p.schedule?[1,2,3,4,5,6].map(d=>(today+d)%7).find(d=>p.schedule[d]):undefined,note=next!==undefined?`Opens ${DAYS[next]} ${formatMinutes(p.schedule[next][0])}`:status.label;
 useEffect(()=>{if(!open)return;const away=e=>{if(!ref.current?.contains(e.target))setOpen(false);},esc=e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);}};document.addEventListener('pointerdown',away);window.addEventListener('keydown',esc,true);return()=>{document.removeEventListener('pointerdown',away);window.removeEventListener('keydown',esc,true);};},[open]);
 return <div className="hours-wrap" ref={ref}>
  <button className="fact-card hours-card" aria-expanded={open} aria-controls="week-hours" onClick={()=>setOpen(!open)}><Clock size={19}/><div><small>Hours <ChevronDown size={13} className="hours-chevron"/></small><strong>{todays?`Today · ${todays}`:p.hours}</strong><span className={`status-pill ${status.open?'open':''}`}>{note}</span></div></button>
  {open&&<div className="hours-pop glass" id="week-hours" role="region" aria-label="Hours this week">{weekHours(p).map(d=><div key={d.day} className={d.index===today?'today':''}><span>{d.day}</span><span>{d.hours??'—'}</span></div>)}<p>Regular hours; holiday schedules may differ.</p></div>}
 </div>;
}
function UtensilsIcon(){return <Leaf size={16}/>;}
function PlaceCard({place:p,saved,onSave,onSelect,now}){const status=openingStatus(p,now);return <article className="place-card"><button className="place-main" onClick={onSelect}><span className={`mini-art ${p.accent}`}><PlaceIcon place={p} size={25}/></span><span className="card-copy"><span className="card-category">{p.neighborhood}</span><strong>{p.name}</strong>{p.benefit&&<span className={`benefit-label ${p.kind==='free'?'free':''}`}>{p.student?<GraduationCap size={12}/>:p.kind==='free'?<Ticket size={12}/>:<span className="percent">%</span>}{p.benefit}</span>}<span className="card-meta"><i className={status.open?'open':''}/>{status.label}</span></span></button><button className={`save-button ${saved?'is-saved':''}`} onClick={onSave} aria-label={`${saved?'Unsave':'Save'} ${p.name}`}><Bookmark size={17} fill={saved?'currentColor':'none'}/></button></article>;}
function SessionApp(){const auth=useAuth();if(auth.loading&&!auth.profile)return <div className="session-loading" role="status"><Compass size={30}/><strong>Kampuscape</strong><span>Getting your account ready…</span></div>;return <><App key={auth.user?.id||'guest'}/><AccountDialog/></>;}
createRoot(document.getElementById('root')).render(<AuthProvider><SessionApp/></AuthProvider>);
