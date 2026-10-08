import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
maplibregl.setWorkerUrl(workerUrl);
import { createRoot } from 'react-dom/client';
import { Coffee, Utensils, Landmark, Footprints, Mountain, Trees, GraduationCap, Beer, Music, Binoculars, Martini } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import base from './base-style.json';
import uicTiles from './uic-tile-index.json';
import eventTiles from './event-tile-index.json';
import {eventBuildingColor,buildingVenues} from './eventLocations';
import {eventTime} from './search';
import Credits from './Credits.jsx';
import registry from './event-venues.json';
import {cleanVenue,footprintId,buildingArea} from './privateEvents';
import { UIC } from './time';
import {buildingLabel} from './buildingDetails';
import {touchFrame,touchCamera} from './gestures';
import {placeLabel} from './labelPlacement';
import {safariBleed} from './safariRunway';
// Label sits in the courtyard between the six Lecture Center buildings.
const UIC_LABEL = [-87.64927, 41.87191];
// One home view for page load and the UIC button.
const HOME = {center:UIC,zoom:15.3,pitch:54,bearing:0,roll:0};
const EXTRUSIONS = base.layers.filter(l=>l.type==='fill-extrusion').map(l=>l.id);
// Hover preview for a purple building. Feed text goes in through textContent only.
function peekContent(groups){
  const el=document.createElement('div'),add=(parent,tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;parent.append(node);return node;};
  const events=[...new Set(groups.flatMap(g=>g.events))].sort((a,b)=>String(a.start).localeCompare(String(b.start)));
  add(el,'strong',groups.map(g=>g.venue.name).join(' · '));
  add(el,'small',`${events.length} upcoming ${events.length===1?'event':'events'}`);
  const list=add(el,'ul');
  for(const e of events.slice(0,3)){const item=add(list,'li');add(item,'b',e.title);add(item,'span',eventTime(e));}
  if(events.length>3)add(list,'li',`+${events.length-3} more`,'peek-more');
  add(el,'em','Click to explore');
  return el;
}
// Pins get the student badge only for documented UIC/student perks; free-for-everyone places show their benefit label instead.
export const hasPerk=place=>!!place.student;
export function PlaceIcon({place, size=19}) { const Icon=place.id==='three-run-two'?Footprints:place.category==='Nightlife'?(place.tags.some(t=>t==='Live music'||t==='Comedy')?Music:place.tags.includes('Cocktails')?Martini:Beer):place.category==='Sights'?Binoculars:place.category==='Outdoors'?Trees:place.category==='Get active'?Mountain:place.category==='Cafes'?Coffee:place.category==='Food & drink'?Utensils:Landmark; return <Icon size={size} strokeWidth={1.8}/>; }
export function styledMap(night, eventVenueIds = [], privateVenues = []) {
  const style=structuredClone(base);
  const c=night?{ground:'#292f3b',park:'#394a48',water:'#1d3544',road:'#626b7e',casing:'#343e50',building:'#817568',label:'#c0c6d0',halo:'#303744'}:{ground:'#e3e3dc',park:'#b9c8af',water:'#acc6cf',road:'#faf8ee',casing:'#c5c8c6',building:'#c7b9a6',label:'#5f696d',halo:'#e6e8e3'};
  style.layers=style.layers.filter(l=>l.type!=='symbol'&&!l.id.includes('hatching')&&l.id!=='road_area_pattern');
  style.layers.forEach(l=>{
    l.paint ||= {};
    if(l.type==='background') l.paint['background-color']=c.ground;
    if(l.type==='fill') { l.paint['fill-color']=/water/.test(l.id)?c.water:/park|wood|grass|cemetery|pitch/.test(l.id)?c.park:c.ground; }
    if(l.type==='line') { l.paint['line-color']=/water/.test(l.id)?c.water:/casing/.test(l.id)?c.casing:c.road; if(/boundary|rail|path|track/.test(l.id)) l.paint['line-opacity']=0.2; }
    if(l.type==='symbol') { l.paint['text-color']=c.label;l.paint['text-halo-color']=c.halo;l.paint['text-halo-width']=1; }
    if(l.type==='fill-extrusion') { l.minzoom=12;l.paint={'fill-extrusion-color':eventBuildingColor(night,eventVenueIds,privateVenues),'fill-extrusion-vertical-gradient':true,'fill-extrusion-height':['max',7,['coalesce',['get','render_height'],7]],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':1}; }
  });
  style.light={anchor:'viewport',color:night?'#b7bedf':'#fff2d8',intensity:night?0.35:0.45,position:[1.5,210,45]};
  return style;
}
export default function Map({places,selected,onSelect,night,resetKey,eventVenues=[],focusedEvent,venueGroups={},onVenuePick,focusedVenue,privateEvents=[],previewVenue=null,pickingBuilding=false,onBuildingPick,onPrivatePick}) {
  const container=useRef(), map=useRef(), markers=useRef([]), callback=useRef(onSelect), groupsRef=useRef(venueGroups), venueCallback=useRef(onVenuePick);
  groupsRef.current=venueGroups;venueCallback.current=onVenuePick;
  const privateRef=useRef(privateEvents), pickingRef=useRef(pickingBuilding), buildingCallback=useRef(onBuildingPick), privateCallback=useRef(onPrivatePick);
  privateRef.current=privateEvents;pickingRef.current=pickingBuilding;buildingCallback.current=onBuildingPick;privateCallback.current=onPrivatePick;
  const privateKey=JSON.stringify(privateEvents.map(e=>e.venue));
  const colorVenues=useRef([]);colorVenues.current=[...privateEvents.map(e=>e.venue),...(previewVenue?[previewVenue]:[])];
  const colorKey=JSON.stringify(colorVenues.current);
  const [status,setStatus]=useState('loading'), [retry,setRetry]=useState(0), [flat,setFlat]=useState(false);
  callback.current=onSelect;
  const venueKey=JSON.stringify([...new Set(eventVenues.map(v=>v.id))].sort());
  const activeVenues=useRef([]);activeVenues.current=JSON.parse(venueKey);
  useEffect(()=>{
    let m; let stopped=false; const cleanups=[];
    setStatus('loading');
    try {
      m=new maplibregl.Map({container:container.current,style:styledMap(night,activeVenues.current,colorVenues.current),transformRequest:url=>{const match=url.match(/tiles\.openfreemap\.org\/planet\/[^/]+\/(14\/\d+\/\d+)\.pbf/);if(match&&eventTiles.campusRevision===uicTiles.revision&&eventTiles.tiles.includes(match[1]))return {url:new URL(`${import.meta.env.BASE_URL}event-tiles/${match[1].replaceAll('/','-')}.pbf?v=${eventTiles.revision}`,window.location.href).href};return {url:match&&uicTiles.tiles.includes(match[1])?new URL(`${import.meta.env.BASE_URL}uic-tiles/${match[1].replaceAll('/','-')}.pbf?v=${uicTiles.revision}`,window.location.href).href:url};},...HOME,minPitch:0,maxPitch:80,minZoom:1,maxZoom:19,renderWorldCopies:true,attributionControl:false,dragPan:true,dragRotate:true,pitchWithRotate:true,rollEnabled:true,touchZoomRotate:true,touchPitch:false,keyboard:true});
      m.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
      // MapLibre opens compact attribution once data arrives; keep it collapsed until the (i) button is pressed.
      const collapseAttribution=()=>{const el=container.current?.querySelector('.maplibregl-ctrl-attrib.maplibregl-compact');if(!el)return;el.classList.remove('maplibregl-compact-show');el.removeAttribute('open');m.off('data',collapseAttribution);};
      m.on('data',collapseAttribution);
      m.touchZoomRotate.enableRotation();
      m.touchPitch.disable();
      const surface=m.getCanvasContainer();
      const camera=()=>({bearing:m.getBearing(),pitch:m.getPitch(),roll:m.getRoll(),zoom:m.getZoom()});
      // Two-finger scrolling pans. Shift-horizontal scroll banks around the third axis.
      // Mouse dragging pans; native mouse wheels and Ctrl/pinch gestures zoom.
      const wheel=e=>{
        if(e.ctrlKey)return;
        if((e.deltaMode===0&&(Math.abs(e.deltaY)<50||e.deltaX!==0))||e.shiftKey){
          e.preventDefault();e.stopImmediatePropagation();
          // Two-finger swipes pan. Twist-to-rotate arrives as Safari gesture events (below); Chrome never exposes
          // trackpad rotation to web pages, so Option/Alt + swipe rotates there instead.
          if(e.shiftKey)m.jumpTo({roll:m.getRoll()-e.deltaX*.3});
          else if(e.altKey)m.jumpTo({bearing:m.getBearing()+(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*.35});
          else m.panBy([e.deltaX,e.deltaY],{duration:0});
        }
      };
      surface.addEventListener('wheel',wheel,{passive:false,capture:true});
      let pair;
      const touch=e=>{
        if(e.touches.length===2){
          e.preventDefault();e.stopImmediatePropagation();
          const next=touchFrame(e.touches);
          if(pair&&e.type==='touchmove'){m.jumpTo(touchCamera(camera(),pair,next));m.panBy([pair.x-next.x,pair.y-next.y],{duration:0});}
          pair=next;
        }else if(pair){
          e.preventDefault();e.stopImmediatePropagation();pair=null;
          m.dragPan.disable();m.dragPan.enable();
        }
      };
      for(const name of ['touchstart','touchmove','touchend','touchcancel'])surface.addEventListener(name,touch,{passive:false,capture:true});
      let gesture;
      const gestureStart=e=>{e.preventDefault();gesture={bearing:m.getBearing(),zoom:m.getZoom()};};
      const gestureChange=e=>{e.preventDefault();if(gesture)m.jumpTo({bearing:gesture.bearing-(e.rotation||0),zoom:gesture.zoom+Math.log2(e.scale||1)});};
      const gestureEnd=()=>{gesture=null;};
      surface.addEventListener('gesturestart',gestureStart,{passive:false});
      surface.addEventListener('gesturechange',gestureChange,{passive:false});
      surface.addEventListener('gestureend',gestureEnd);
      // The canvas bleeds behind Safari's bars on phones; padding keeps the camera centred on the visible screen.
      const pad=()=>{const b=safariBleed();m.setPadding({top:b.top,bottom:b.bottom,left:0,right:0});};pad();
      const resize=new ResizeObserver(()=>{m.resize();pad();});resize.observe(container.current);
      cleanups.push(()=>{resize.disconnect();surface.removeEventListener('wheel',wheel,true);surface.removeEventListener('gesturestart',gestureStart);surface.removeEventListener('gesturechange',gestureChange);surface.removeEventListener('gestureend',gestureEnd);for(const name of ['touchstart','touchmove','touchend','touchcancel'])surface.removeEventListener(name,touch,true);});
      // Expose camera readings for regression checks without a global map instance.
      const syncPose=()=>{if(stopped||!container.current)return;setFlat(m.getPitch()<1);container.current.dataset.camera=JSON.stringify({center:m.getCenter().toArray(),bearing:m.getBearing(),pitch:m.getPitch(),roll:m.getRoll(),zoom:m.getZoom()});};
      m.on('move',syncPose);syncPose();
      m.getCanvas().setAttribute('aria-label','World 3D map. Drag to pan; right-drag to rotate and tilt; two-finger swipe to pan; two-finger twist to rotate in Safari and on touchscreens; Option or Alt plus two-finger swipe to rotate in other browsers; two-finger twist rotates on touchscreens and in Safari; use the 2D and 3D buttons to change tilt; Shift-horizontal scroll to roll; pinch to zoom.');
      // Purple buildings preview their events on hover; a click or tap opens that venue's events.
      const peek=new maplibregl.Popup({closeButton:false,closeOnClick:false,className:'building-peek',offset:18,maxWidth:'300px'});
      let peekKey='';
      const venuesAt=e=>{
        if(e.originalEvent?.target!==m.getCanvas()||!m.isStyleLoaded())return [];
        const [top]=m.queryRenderedFeatures(e.point,{layers:EXTRUSIONS.filter(id=>m.getLayer(id))});
        if(!top)return [];
        const ids=buildingVenues(top.properties.event_venues,groupsRef.current),customId=footprintId(top.toJSON().geometry);
        if(groupsRef.current[customId])ids.push(customId);
        return [...new Set(ids)];
      };
      const hidePeek=()=>{peek.remove();peekKey='';m.getCanvas().style.cursor='';};
      const hover=e=>{
        if(pickingRef.current){hidePeek();m.getCanvas().style.cursor='crosshair';return;}
        const ids=venuesAt(e);if(!ids.length)return hidePeek();
        const key=ids.join('|')+':'+ids.map(id=>groupsRef.current[id].events.length).join(',');
        if(key!==peekKey){peek.setDOMContent(peekContent(ids.map(id=>groupsRef.current[id])));peekKey=key;}
        peek.setLngLat(e.lngLat);if(!peek.isOpen())peek.addTo(m);
        m.getCanvas().style.cursor='pointer';
      };
      const pick=e=>{
        if(pickingRef.current){
          if(e.originalEvent?.target!==m.getCanvas()||!m.isStyleLoaded())return;
          const [feature]=m.queryRenderedFeatures(e.point,{layers:EXTRUSIONS.filter(id=>m.getLayer(id))});
          if(!feature){buildingCallback.current?.(null);return;}
          const candidates=String(feature.properties.event_venues||'').split('|').map(id=>registry.venues.find(v=>v.id===id)).filter(Boolean);
          const distance=v=>Math.hypot((v.coords[0]-e.lngLat.lng)*Math.cos(e.lngLat.lat*Math.PI/180),v.coords[1]-e.lngLat.lat);
          const known=candidates.sort((a,b)=>distance(a)-distance(b))[0];
          const footprint=feature.toJSON().geometry,customId=footprintId(footprint);
          const previous=privateRef.current.find(event=>event.venue.id===customId)?.venue;
          const area=buildingArea({footprint}).coordinates[0],center=[(area[0][0]+area[2][0])/2,(area[0][1]+area[2][1])/2];
          const label=buildingLabel(feature.properties);
          const saved=previous?.name==='Pinned building'?null:previous;
          const custom=cleanVenue({id:customId,...label,name:label.name||'Selected building',coords:center,footprint,featureId:feature.id});
          // tap: the exact point clicked (tile footprints often merge neighbouring houses).
          const venue=known || saved || (custom?{...custom,tap:[e.lngLat.lng,e.lngLat.lat],needsLookup:!label.name}:null);
          hidePeek();buildingCallback.current?.(venue);return;
        }
        const ids=venuesAt(e);if(ids.length){hidePeek();venueCallback.current?.(ids);}
      };
      m.on('mousemove',hover);m.on('mouseout',hidePeek);m.on('dragstart',hidePeek);m.on('click',pick);
      cleanups.push(()=>peek.remove());
      m.on('load',()=>!stopped&&setStatus('ready'));
      m.easeTo({center:UIC,offset:[0,0],duration:0});
      map.current=m;
    } catch { setStatus('error'); }
    const timeout=setTimeout(()=>{if(!stopped&&m&&!m.isStyleLoaded())setStatus('error');},18000);
    return ()=>{stopped=true;clearTimeout(timeout);cleanups.forEach(fn=>fn());m?.remove();map.current=null;};
  },[retry,uicTiles.revision,eventTiles.revision]);
  useEffect(()=>{if(map.current)map.current.setStyle(styledMap(night,activeVenues.current,colorVenues.current));},[night]);
  useEffect(()=>{
    const m=map.current;if(!m)return;
    let applied=false;
    const update=()=>{
      // Map events can fire after the container unmounts (e.g. a re-render during sign-in).
      if(applied||!container.current||!m.isStyleLoaded())return;
      for(const layer of m.getStyle().layers.filter(l=>l.type==='fill-extrusion'))m.setPaintProperty(layer.id,'fill-extrusion-color',eventBuildingColor(night,activeVenues.current,colorVenues.current));
      container.current.dataset.eventVenues=venueKey;container.current.dataset.privateVenues=privateKey;container.current.dataset.previewVenue=previewVenue?.id||'';applied=true;
    };
    const inspect=()=>{
      if(!container.current||!m.isStyleLoaded())return;
      update();
      const layers=m.getStyle().layers.filter(l=>l.type==='fill-extrusion').map(l=>l.id);
      const rendered=m.queryRenderedFeatures({layers}).filter(f=>activeVenues.current.some(id=>String(f.properties.event_venues||'').includes(`|${id}|`)));
      container.current.dataset.eventBuildings=JSON.stringify([...new Set(rendered.map(f=>f.properties.event_venues))]);
    };
    const restyle=()=>{applied=false;update();};
    m.on('style.load',restyle);m.on('idle',inspect);update();
    return()=>{m.off('style.load',restyle);m.off('idle',inspect);};
  },[venueKey,privateKey,colorKey,night,retry]);
  useEffect(()=>{
    const m=map.current;if(!m||!focusedEvent?.venue)return;
    const venue=focusedEvent.venue,el=document.createElement('div');el.className=`event-building-marker ${focusedEvent.source==='Private event'?'private-building-marker':''}`;
    const dot=document.createElement('i'),label=document.createElement('span');label.textContent=venue.name;el.append(dot,label);
    const marker=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat(venue.coords).addTo(m);
    m.flyTo({center:venue.coords,zoom:venue.kind==='outdoor'?16:17.2,pitch:54,bearing:0,roll:0,offset:[0,0],duration:1000});
    container.current.dataset.focusedEventVenue=venue.id;
    return()=>{marker.remove();delete container.current?.dataset.focusedEventVenue;};
  },[focusedEvent,retry]);
  useEffect(()=>{
    const m=map.current,venues=(focusedVenue||[]).map(id=>groupsRef.current[id]?.venue).filter(Boolean);if(!m||!venues.length)return;
    const el=document.createElement('div');el.className='event-building-marker';
    const dot=document.createElement('i'),label=document.createElement('span');label.textContent=venues.map(v=>v.name).join(' · ');el.append(dot,label);
    const marker=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat(venues[0].coords).addTo(m);
    m.flyTo({center:venues[0].coords,zoom:Math.max(m.getZoom(),16.6),pitch:54,offset:window.innerWidth>760?[0,-230]:[0,-150],duration:900});
    container.current.dataset.focusedVenue=venues.map(v=>v.id).join('|');
    return()=>{marker.remove();delete container.current?.dataset.focusedVenue;};
  },[focusedVenue?.join('|'),retry]);
  useEffect(()=>{
    markers.current.forEach(({marker,root})=>{marker.remove();setTimeout(()=>root.unmount(),0);});
    markers.current=[];
    if(!map.current)return;
    const entries=[];
    places.forEach(p=>{
      const el=document.createElement('div');el.dataset.labelActive='false';const root=createRoot(el);
      root.render(<button className={`map-pin ${p.accent} ${selected?.id===p.id?'selected':''}`} onClick={()=>callback.current(p)} aria-label={`View ${p.name}${hasPerk(p)?', student perk':''}`}><span className="pin-circle"><PlaceIcon place={p}/>{hasPerk(p)&&<span className="pin-badge" aria-hidden="true"><GraduationCap size={12} strokeWidth={2.4}/></span>}</span><span className="pin-label">{p.name}</span></button>);
      const marker=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat(p.coords).addTo(map.current);
      markers.current.push({marker,root});entries.push({id:p.id,el,selected:selected?.id===p.id});
    });
    const el=document.createElement('div');el.className='campus-pin';el.innerHTML='<b>UIC</b>';
    const marker=new maplibregl.Marker({element:el}).setLngLat(UIC_LABEL).addTo(map.current);markers.current.push({marker,root:{unmount(){}}});
    const m=map.current;let frame;
    const union=(a,b)=>({left:Math.min(a.left,b.left),top:Math.min(a.top,b.top),right:Math.max(a.right,b.right),bottom:Math.max(a.bottom,b.bottom)});
    const layout=()=>{
      const view=container.current?.getBoundingClientRect();if(!view)return;
      const ready=entries.map(entry=>({...entry,button:entry.el.querySelector('button'),circle:entry.el.querySelector('.pin-circle')})).filter(entry=>entry.button&&entry.circle);
      const active=ready.find(entry=>entry.button.matches(':hover'))||ready.find(entry=>entry.button.matches(':focus-visible'))||ready.find(entry=>entry.selected);
      for(const entry of ready){entry.el.dataset.labelActive=String(entry===active);entry.el.style.zIndex=entry===active?'2':'0';}
      if(!active)return;
      const label=active.el.querySelector('.pin-label'),anchor=active.button.getBoundingClientRect(),size=label.getBoundingClientRect();
      const obstacles=ready.filter(entry=>entry!==active).map(entry=>{let box=entry.circle.getBoundingClientRect();const badge=entry.el.querySelector('.pin-badge');return badge?union(box,badge.getBoundingClientRect()):box;});
      obstacles.push(el.getBoundingClientRect());
      const position=placeLabel(anchor,size,view,obstacles);
      label.style.left=`${position.left-anchor.left}px`;label.style.top=`${position.top-anchor.top}px`;
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(layout);};
    const sizes=new ResizeObserver(schedule);entries.forEach(entry=>sizes.observe(entry.el));
    m.on('render',layout);m.on('resize',schedule);
    const surface=container.current;
    for(const name of ['pointerover','pointerout','focusin','focusout'])surface.addEventListener(name,schedule);
    schedule();
    return ()=>{cancelAnimationFrame(frame);sizes.disconnect();m.off('render',layout);m.off('resize',schedule);for(const name of ['pointerover','pointerout','focusin','focusout'])surface.removeEventListener(name,schedule);markers.current.forEach(({marker,root})=>{marker.remove();setTimeout(()=>root.unmount(),0);});markers.current=[];};
  },[places,selected,retry]);
  useEffect(()=>{if(selected&&map.current)map.current.flyTo({center:selected.coords,zoom:15.8,pitch:54,offset:window.innerWidth>760?[0,-220]:[0,-130],duration:900});},[selected]);
  useEffect(()=>{if(map.current&&resetKey>0)map.current.flyTo({center:UIC,zoom:15.3,pitch:54,bearing:-22,offset:[0,0],duration:900});},[resetKey]);
  useEffect(()=>{
    const m=map.current;if(!m)return;
    const pins=privateRef.current.filter(event=>event.id!==focusedEvent?.id).map(event=>{
      const el=document.createElement('button');el.className='private-event-pin';el.type='button';el.setAttribute('aria-label',`Show ${event.visibility==='public'?'public':'private'} event ${event.title}`);el.title=event.title;
      const dot=document.createElement('i'),label=document.createElement('span');label.textContent=event.title;el.append(dot,label);
      el.addEventListener('click',()=>{if(!pickingRef.current)privateCallback.current?.(event);});
      return new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat(event.venue.coords).addTo(m);
    });
    return()=>pins.forEach(pin=>pin.remove());
  },[privateKey,JSON.stringify(privateEvents.map(e=>[e.id,e.title])),focusedEvent?.id,retry]);
  useEffect(()=>{
    const m=map.current;if(!m||!previewVenue)return;
    const el=document.createElement('div');el.className='event-building-marker private-building-marker event-pin-preview';
    const dot=document.createElement('i'),label=document.createElement('span');label.textContent=previewVenue.name;el.append(dot,label);
    const marker=new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat(previewVenue.coords).addTo(m);
    return()=>marker.remove();
  },[previewVenue,retry]);
  return <>
    <div ref={container} className={`map ${pickingBuilding?'picking-building':''}`} aria-label="Interactive 3D world map, starting at UIC"/>
    <div className="map-vignette"/>
    {status!=='ready'&&<div className="map-status glass" role="status">{status==='loading'?'Loading Chicago…':<>Map unavailable. You can still browse every place.<button onClick={()=>setRetry(v=>v+1)}>Retry map</button></>}</div>}

    <button className="uic-home" aria-label="Back to UIC main campus" title="Back to UIC main campus" onClick={()=>map.current?.flyTo({...HOME,offset:[0,0],duration:900})}>UIC</button><button className="align-map glass" aria-label="Align map north up, east right" title="Align north up · 45° 3D tilt" onClick={()=>map.current?.easeTo({bearing:0,roll:0,pitch:flat?0:45,duration:450})}>N</button>
    <div className="view-toggle glass" role="group" aria-label="Map perspective">
      <button aria-pressed={flat} onClick={()=>map.current?.easeTo({pitch:0,roll:0,duration:450})}>2D</button>
      <button aria-pressed={!flat} onClick={()=>map.current?.easeTo({pitch:45,roll:0,duration:450})}>3D</button>
    </div>
    <Credits/>
  </>;
}
