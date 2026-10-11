import React,{useEffect,useRef} from 'react';
import {Compass,Radio,Plus,Bookmark,Users,Move,Search,User,MessageCircle,X,Sparkles,ArrowUpRight,CalendarDays} from 'lucide-react';
import {eventTime} from './search.js';
import {INTERESTS} from './interests.js';
import './welcome.css';
const guide=[
 ['Explore',Compass,'Find your next spot','Browse food, coffee, and music around Chicago. Tap a place to see its hours and get directions.','explore'],
 ['Live events',Radio,'See what’s happening','Browse UIC, off-campus, and community events. For you matches your interests; the date picker narrows the day.','events'],
 ['Create event',Plus,'Make your own plan','Tap a building, add a date and time, then choose Public or Private. Share your event link with friends.','create'],
 ['Who’s going & messages',Users,'Meet people before you go','Open an event, tap Who’s going, and join with your name or an event nickname. Send a message request; chat starts after acceptance.','messages'],
 ['Saved & My Events',Bookmark,'Keep your favorites close','Saved holds bookmarked places. My Events holds your plans and events you saved after registration.','plans'],
 ['Map controls',Move,'Find your bearings','Drag to pan and pinch or scroll to zoom. UIC brings you back to campus, and 2D/3D changes the view. Red is UIC; purple is off-campus; yellow is a member event.','map'],
 ['Search',Search,'Jump straight there','Search places, events, and actions. On a keyboard, press ⌘K or Ctrl+K.','search'],
 ['Your profile',User,'Make it yours','Sign in, choose interests for recommendations, and edit your name and avatar. Open Messages to manage requests and blocked conversations.','profile'],
];
export function WelcomeGuide({open,onClose,onAction}){
 const dialog=useRef(),focus=useRef();
 useEffect(()=>{if(open){focus.current=document.activeElement;dialog.current.showModal();}else if(dialog.current.open){dialog.current.close();focus.current?.focus();}},[open]);
 return <dialog ref={dialog} className="social-dialog guide-dialog" aria-labelledby="guide-title" onCancel={onClose} onClick={e=>{if(e.target===dialog.current)onClose();}}>
 <button className="modal-close icon-button" aria-label="Close guide" onClick={onClose}><X size={22}/></button>
 <span className="social-kicker"><Compass size={17}/> WELCOME TO KAMPUSCAPE</span><h2 id="guide-title">A map for your next plan.</h2><p>Find something to do and see who’s going. Tap any card to try it.</p>
 <div className="guide-grid">{guide.map(([label,Icon,title,description,action])=><button key={action} className="guide-card" onClick={()=>{onClose();onAction(action);}}><span className="guide-icon"><Icon size={22}/></span><span className="guide-label">{label}</span><strong>{title}</strong><span>{description}</span><ArrowUpRight size={16} className="guide-arrow"/></button>)}</div>
 <div className="social-actions"><button className="primary-button" onClick={onClose}>Got it. Let’s explore <Compass size={16}/></button><span>Reopen this anytime with “How it works”.</span></div>
 </dialog>;
}
export function WhatsHappening({open,onClose,recommendations,onSelect,onBrowse,name,offline}){
 const dialog=useRef();
 useEffect(()=>{if(open)dialog.current.showModal();else if(dialog.current.open)dialog.current.close();},[open]);
 return <dialog ref={dialog} className="social-dialog happening-dialog" aria-labelledby="happening-title" onCancel={onClose} onClick={e=>{if(e.target===dialog.current)onClose();}}>
 <button className="modal-close icon-button" aria-label="Close recommendations" onClick={onClose}><X size={22}/></button>
 <span className="social-kicker"><Sparkles size={16}/> PICKED FOR YOU</span><h2 id="happening-title">What’s happening around you.</h2><p>{name?`Welcome back, ${name}. `:''}A few plans from Live events, picked for this visit.</p>
 {offline&&<p className="social-offline" role="status">Showing saved event data while we reconnect.</p>}
 <div className="happening-list">{recommendations.map(({event,matched},i)=><button key={event.id||i} onClick={()=>{onClose();onSelect(event);}}><span className="happening-number">0{i+1}</span><span><strong>{event.title}</strong><small><CalendarDays size={14}/>{eventTime(event)}</small><small>{event.venue?.name||event.organizer||event.place?.name||'See event for location'}</small><span className="happening-tags">{matched.length?matched.map(id=><em key={id}>{INTERESTS.find(x=>x.id===id)?.label}</em>):<em>Coming up around UIC</em>}</span></span><ArrowUpRight size={19}/></button>)}</div>
 {!recommendations.length&&<div className="message-state"><CalendarDays size={30}/><p>No upcoming events are available right now. Check Live events for updates.</p></div>}
 <div className="social-actions"><button className="primary-button" onClick={()=>{onClose();onBrowse();}}>See all live events <ArrowUpRight size={16}/></button><button className="text-link" onClick={onClose}>Explore the map</button></div>
 </dialog>;
}
