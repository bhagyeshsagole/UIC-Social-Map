import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Search,ArrowUpRight,ArrowLeft,ArrowRight,Plus,X,Bookmark,Check,MapPin,Clock,SlidersHorizontal,Sun,Moon,CalendarDays,Landmark,User,ChevronDown,Compass,ExternalLink,Ticket,Leaf,GraduationCap} from 'lucide-react';
import Map,{PlaceIcon} from './Map';
import Spotlight from './Spotlight';
import {useCampusEvents} from './CampusEventList.jsx';
import LiveEvents from './LiveEvents.jsx';
import {DIET,DIET_STATUS,servesFood,dietMatches} from './diet';
import {buildIndex,shortDate} from './search';
import {parsePlaces} from './content';
import copy from '../../../added_sites.md?raw';
import {details,CHECKED} from './placeDetails';
import {solarState,clockTime,openingStatus,currentEvents,directions,chicagoDate,chicagoDay,dayHours,weekHours,formatMinutes,DAYS} from './time';
import './styles.css';
const places=parsePlaces(copy).map(p=>({...details[p.id],...p}));
const categories=['All places','Arts & culture','Food & drink','Cafes','Get active','Outdoors'];
function readStore(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return Array.isArray(value)?value:fallback;}catch{return fallback;}}
function External({href,children,...props}) {return <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>;}
function App(){
 const [now,setNow]=useState(new Date()),[tab,setTab]=useState('Explore'),[category,setCategory]=useState('All places'),[query,setQuery]=useState(''),[selected,setSelected]=useState(null),[free,setFree]=useState(false),[diet,setDiet]=useState('All diets'),[filters,setFilters]=useState(false),[saved,setSaved]=useState(()=>readStore('afterclass-saved',[])),[drafts,setDrafts]=useState(()=>readStore('afterclass-drafts',[])),[modal,setModal]=useState(null),[reset,setReset]=useState(0),[notice,setNotice]=useState(''),[storageError,setStorageError]=useState(false),[panelOpen,setPanelOpen]=useState(false),[spotlight,setSpotlight]=useState(false);
 const search=useRef(),dialog=useRef(),lastFocus=useRef();
 const solar=solarState(now);
 const campusCalendar=useCampusEvents(now);
 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(t);},[]);
 useEffect(()=>{try{localStorage.setItem('afterclass-saved',JSON.stringify(saved));localStorage.setItem('afterclass-drafts',JSON.stringify(drafts));}catch{setStorageError(true);}},[saved,drafts]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(t);},[notice]);
 useEffect(()=>{if(modal){lastFocus.current=document.activeElement;dialog.current?.showModal();}else{dialog.current?.close();lastFocus.current?.focus();}},[modal]);
 useEffect(()=>{if(panelOpen&&!selected&&tab==='Explore')search.current?.focus();},[panelOpen,selected,tab]);
 useEffect(()=>{document.documentElement.style.backgroundColor=solar.night?'#292f3b':'#e3e3dc';},[solar.night]);
 useEffect(()=>{const key=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setSpotlight(true);}if(e.key==='Escape'){setSelected(null);setPanelOpen(false);setFilters(false);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const filtered=places.filter(p=>(category==='All places'||p.category===category)&&(!free||p.kind==='free')&&(diet==='All diets'||dietMatches(p,diet))&&(`${p.name} ${p.description} ${p.tags.join(' ')}`).toLowerCase().includes(query.toLowerCase()));
 const visible=tab==='Saved'?places.filter(p=>saved.includes(p.id)):filtered;
 const events=places.flatMap(p=>currentEvents(p,now).map(e=>({...e,place:p})));
 const toggleSave=p=>{setSaved(v=>v.includes(p.id)?v.filter(id=>id!==p.id):[...v,p.id]);};
 const goTab=t=>{setTab(t);setSelected(null);setPanelOpen(t==='Explore'&&tab==='Explore'?!panelOpen:true);if(t==='Explore')setReset(r=>r+1);};
 const closePanel=()=>{setSelected(null);setPanelOpen(false);};
 const openPanel=t=>{setTab(t);setSelected(null);setPanelOpen(true);};
 const clearFilters=()=>{setQuery('');setCategory('All places');setFree(false);setDiet('All diets');};
 const showPlace=p=>{if(!p)return;if(!visible.some(v=>v.id===p.id)){setTab('Explore');clearFilters();}setSelected(p);};
 const searchItems=buildIndex({places,saved,drafts,events:[...events,...campusCalendar.events],categories:categories.slice(1)});
 function pick(item){
  if(item.kind==='campus-event')return window.open(item.event.url,'_blank','noopener,noreferrer');
  if(item.kind==='plan')return openPanel('My Events');
  if(item.kind==='category'){clearFilters();setCategory(item.category);return openPanel('Explore');}
  if(item.kind==='action')return item.action==='create'?setModal('create'):openPanel({explore:'Explore',events:'Live events',saved:'Saved',plans:'My Events'}[item.action]);
  showPlace(item.place);
 }
 function createDraft(e){e.preventDefault();const f=new FormData(e.currentTarget);setDrafts(v=>[...v,{id:crypto.randomUUID(),title:String(f.get('title')).trim(),placeId:f.get('place'),date:f.get('date'),time:f.get('time')}]);setModal(null);setTab('My Events');setPanelOpen(true);setSelected(null);setNotice('Plan saved on this device');}
 return <main className={solar.night?'app night':'app day'}>
  <Map places={visible} selected={selected} onSelect={setSelected} night={solar.night} resetKey={reset}/>
  <header className="topbar">
   <div className="location-chip glass"><MapPin size={16}/><span>Chicago, IL</span><span className="location-line"/>{solar.night?<Moon size={18}/>:<Sun size={18}/>}</div>
   <nav className="nav-pill glass" aria-label="Main navigation">
    <button className={tab==='Explore'?'active':''} onClick={()=>goTab('Explore')}><Compass size={16}/><span>Explore</span></button>
    <button className={tab==='Live events'?'active':''} onClick={()=>goTab('Live events')}><span>Live events</span></button>
    <button className={tab==='My Events'?'active':''} onClick={()=>goTab('My Events')}><CalendarDays size={16}/><span>My Events</span></button>
    <button className={tab==='Saved'?'active':''} onClick={()=>goTab('Saved')}><Bookmark size={16}/><span>Saved</span>{saved.length>0&&<small>{saved.length}</small>}</button>
    <button onClick={()=>setModal('create')}><Plus size={17}/><span>Create event</span></button>
    <span className="nav-divider"/><button className="nav-search" aria-label="Search everything" aria-keyshortcuts="Meta+K Control+K" onClick={()=>setSpotlight(true)}><Search size={19}/></button>
   </nav>
   <button className="profile glass" aria-label="Open profile" onClick={()=>setModal('profile')}><User size={19}/><span>Guest</span><ChevronDown size={13}/></button>
  </header>

  {(selected||panelOpen)&&<aside className={`discovery glass ${selected?'has-detail':tab==='Live events'?'has-live-events':''}`} aria-label={selected?"Place details":"Discover places"}>
   {selected?<>
    <div className="detail-top"><span className="eyebrow">PLACE DETAILS</span><div className="detail-top-actions"><button className={`icon-button ${saved.includes(selected.id)?'is-saved':''}`} aria-label={saved.includes(selected.id)?'Unsave place':'Save place'} onClick={()=>toggleSave(selected)}><Bookmark size={20} fill={saved.includes(selected.id)?'currentColor':'none'}/></button><button className="icon-button close-panel" aria-label="Close place details" onClick={closePanel}><X size={21}/></button></div></div>
    {selected.photo?<figure className={`place-photo ${selected.accent}`}><img src={`${import.meta.env.BASE_URL}places/${selected.photo.file}`} alt={selected.photo.alt} style={{objectPosition:selected.photo.focus}}/><figcaption><span>{selected.category}</span><External href={selected.photo.href} title={`Photo: ${selected.photo.credit}`}>Photo · {selected.photo.credit}</External></figcaption></figure>:<div className={`place-art ${selected.accent}`}><div className="art-lines"/><PlaceIcon place={selected} size={64}/><span>{selected.category}</span><span className="art-number">CHI / {String(places.indexOf(selected)+1).padStart(2,'0')}</span></div>}
    <div className="detail-content"><span className="eyebrow">{selected.neighborhood}</span><h1>{selected.name}</h1><p className="description">{selected.description}</p><div className="tags">{selected.tags.map(t=><span key={t}>{t}</span>)}</div>
    {selected.benefit&&<div className="benefit-box">{selected.student?<GraduationCap size={22}/>:<Ticket size={22}/>}<div><strong>{selected.benefit}</strong><p>{selected.condition}</p></div></div>}
    <div className="info-row"><MapPin size={17}/><span>{selected.address}, Chicago</span></div>
    {servesFood(selected)&&<section className="diet-section" aria-label="Dietary options"><h3>Dietary</h3><div className="diet-grid">{DIET.map(([key,label])=>{const v=selected.diet?.[key]||'ask';return <div key={key} className={`diet-cell ${v}`}><span>{label}</span><strong>{DIET_STATUS[v]}</strong></div>;})}</div><p className="fine-print">From the menu and the restaurant’s own site. “Ask staff” means they don’t publish it; check before ordering if it matters to you.</p></section>}
    {selected.menu&&<section className="detail-section"><h3>A taste of the menu <UtensilsIcon/></h3>{selected.menu.map(([name,price,desc,tags])=><div className="menu-item" key={name}><div><strong>{name}</strong><span>{price}</span></div><p>{desc}</p><div className="tags">{tags.map(t=><span key={t}>{t}</span>)}</div></div>)}<External className="text-link" href={selected.menuUrl}>Full menu <ArrowUpRight size={14}/></External><p className="fine-print">Menu highlights, not the full menu. Prices and preparation can change; confirm dietary needs with staff.</p></section>}
    <details className="sources"><summary>Sources · checked {CHECKED}</summary>{selected.sources.map(([label,url])=><External key={url} href={url}>{label}<ExternalLink size={12}/></External>)}</details>
    </div><div className={`detail-actions ${currentEvents(selected,now).length?'':'no-events'}`}><div className="detail-facts"><HoursCard key={selected.id} place={selected} now={now}/>{currentEvents(selected,now).slice(0,1).map(e=><External className="fact-card fact-event" key={e.title} href={e.url} title={e.description}><CalendarDays size={19}/><div><small>On the calendar</small><strong>{e.title}</strong><span>{shortDate(e.start)} → {shortDate(e.end)}</span></div></External>)}</div><div className="detail-buttons"><External className="primary-button" href={directions(selected)}>Google Maps <ArrowUpRight size={17}/></External><button className="secondary-button" onClick={()=>setModal('create')}><Plus size={17}/> Make a plan</button></div></div>
   </>:<>
    <button className="panel-close icon-button" aria-label="Close discovery" onClick={closePanel}><X size={21}/></button>
    {tab!=='Explore'&&<div className="panel-intro"><h1>{tab}</h1></div>}
    {tab==='Explore'&&<><div className="search-field"><input ref={search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="A place, a craving, a plan…" aria-label="Search places"/>{query?<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={15}/></button>:null}</div><div className="category-list">{categories.map(c=><button key={c} className={category===c?'chosen':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="list-toolbar"><span>{visible.length} places to explore</span><button aria-label="Filter places" aria-expanded={filters} onClick={()=>setFilters(!filters)}><SlidersHorizontal size={15}/><span>Filters</span>{(free||diet!=='All diets')&&<i/>}</button></div>{filters&&<div className="filter-panel"><label><input type="checkbox" checked={free} onChange={e=>setFree(e.target.checked)}/> Free places only</label><label>Food preferences<select value={diet} onChange={e=>setDiet(e.target.value)}><option>All diets</option>{DIET.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><button className="text-link" onClick={()=>{setFree(false);setDiet('All diets');setQuery('');setCategory('All places');}}>Reset filters</button></div>}</>}
    <div className={tab==='Live events'?'live-events-body':'places-list'}>
     {tab==='Live events'?<LiveEvents calendar={campusCalendar} now={now} exhibitions={events} onMyEvents={()=>openPanel('My Events')}/>:tab==='My Events'?null:<>{tab==='Saved'&&<div className="subtle-note">Saved on this device · {saved.length} places</div>}{visible.map(p=><PlaceCard key={p.id} place={p} saved={saved.includes(p.id)} onSave={()=>toggleSave(p)} onSelect={()=>setSelected(p)} now={now}/>)}{visible.length===0&&<div className="empty"><Compass size={30}/><h3>{tab==='Saved'?'A city of possibilities.':'No places found'}</h3><p>{tab==='Saved'?'Tap a bookmark to keep a place here.':'Try another search or clear your filters.'}</p><button className="secondary-button" onClick={()=>{setQuery('');setCategory('All places');setFree(false);setDiet('All diets');goTab('Explore');}}>Explore places</button></div>}</>}
     {tab==='My Events'&&<section className="drafts"><h3>{drafts.length?'Your event drafts':'No events yet'}</h3><p className="fine-print">Private drafts on this device. Publishing and invitations will come with accounts.</p>{drafts.map(d=><div className="draft" key={d.id}><CalendarDays size={20}/><div><strong>{d.title}</strong><span>{places.find(p=>p.id===d.placeId)?.name||'Place unavailable'}</span><small>{d.date} · {d.time} Chicago time</small></div><button aria-label={`Delete ${d.title}`} onClick={()=>setDrafts(v=>v.filter(x=>x.id!==d.id))}><X size={16}/></button></div>)}<button className="secondary-button" onClick={()=>setModal('create')}><Plus size={16}/> Make a plan</button></section>}
    </div>
   </>}
  </aside>}
  <Spotlight open={spotlight} items={searchItems} onClose={()=>setSpotlight(false)} onPick={pick}/>
  {(notice||storageError)&&<div className="toast glass" role="status"><Check size={17}/>{storageError?'Device storage unavailable. Changes last for this session.':notice}</div>}
  <dialog ref={dialog} onCancel={()=>setModal(null)} onClick={e=>{if(e.target===dialog.current)setModal(null);}}><div className="modal-content"><button className="modal-close icon-button" aria-label="Close dialog" onClick={()=>setModal(null)}><X size={21}/></button>{modal==='create'?<><span className="modal-icon"><CalendarDays size={25}/></span><span className="eyebrow">SOMETHING TO LOOK FORWARD TO</span><h2>Make a little plan.</h2><p>Keep an event draft for yourself. All times are in Chicago.</p><form onSubmit={createDraft}><label>What’s the plan?<input name="title" required maxLength={80} pattern=".*\S.*" placeholder="An afternoon at the gallery"/></label><label>Where?<select name="place" defaultValue={selected?.id||places[0].id}>{places.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><div className="form-row"><label>Date<input type="date" name="date" min={chicagoDate(now)} required/></label><label>Time<input type="time" name="time" required/></label></div><p className="fine-print">Saved locally. This won’t publish an event or send invitations.</p><button className="primary-button" type="submit">Save draft <ArrowRight size={17}/></button></form></>:<><span className="modal-icon"><User size={26}/></span><span className="eyebrow">YOUR CORNER OF CHICAGO</span><h2>Hey, explorer.</h2><p>You’re browsing as a guest. Your saved places and event drafts stay on this device.</p><div className="profile-stats"><div><strong>{saved.length}</strong><span>saved places</span></div><div><strong>{drafts.length}</strong><span>event drafts</span></div></div><p className="fine-print">UIC sign-in and shared plans are coming in a later build.</p><button className="primary-button" onClick={()=>{setModal(null);goTab('Saved');}}>View Saved <ArrowRight size={17}/></button><button className="secondary-button profile-events" onClick={()=>{setModal(null);goTab('My Events');}}>My Events <ArrowRight size={17}/></button></>}</div></dialog>
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
createRoot(document.getElementById('root')).render(<App/>);
