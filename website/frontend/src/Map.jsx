import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
maplibregl.setWorkerUrl(workerUrl);
import { createRoot } from 'react-dom/client';
import { Coffee, Utensils, Landmark, Footprints, Mountain, Trees, GraduationCap } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import base from './base-style.json';
import uicTiles from './uic-tile-index.json';
import { UIC } from './time';
import {touchFrame,touchCamera} from './gestures';
import {placeLabel} from './labelPlacement';
// Label sits in the courtyard between the six Lecture Center buildings.
const UIC_LABEL = [-87.64927, 41.87191];
// Pins get the student badge for UIC/student perks and for places that are always free.
export const hasPerk=place=>!!place.student||place.kind==='free';
export function PlaceIcon({place, size=19}) { const Icon=place.id==='three-run-two'?Footprints:place.category==='Outdoors'?Trees:place.category==='Get active'?Mountain:place.category==='Cafes'?Coffee:place.category==='Food & drink'?Utensils:Landmark; return <Icon size={size} strokeWidth={1.8}/>; }
export function styledMap(night) {
  const style=structuredClone(base);
  const c=night?{ground:'#292f3b',park:'#394a48',water:'#1d3544',road:'#626b7e',casing:'#343e50',building:'#817568',label:'#c0c6d0',halo:'#303744'}:{ground:'#e3e3dc',park:'#b9c8af',water:'#acc6cf',road:'#faf8ee',casing:'#c5c8c6',building:'#c7b9a6',label:'#5f696d',halo:'#e6e8e3'};
  style.layers=style.layers.filter(l=>l.type!=='symbol'&&!l.id.includes('hatching')&&l.id!=='road_area_pattern');
  style.layers.forEach(l=>{
    l.paint ||= {};
    if(l.type==='background') l.paint['background-color']=c.ground;
    if(l.type==='fill') { l.paint['fill-color']=/water/.test(l.id)?c.water:/park|wood|grass|cemetery|pitch/.test(l.id)?c.park:c.ground; }
    if(l.type==='line') { l.paint['line-color']=/water/.test(l.id)?c.water:/casing/.test(l.id)?c.casing:c.road; if(/boundary|rail|path|track/.test(l.id)) l.paint['line-opacity']=0.2; }
    if(l.type==='symbol') { l.paint['text-color']=c.label;l.paint['text-halo-color']=c.halo;l.paint['text-halo-width']=1; }
    if(l.type==='fill-extrusion') { l.minzoom=12;l.paint={'fill-extrusion-color':['case',['==',['get','uic'],true],['interpolate',['linear'],['coalesce',['get','render_height'],7],0,night?'#9f263b':'#b5263b',25,night?'#da4256':'#e84658',80,night?'#ff7982':'#ff7d85'],c.building],'fill-extrusion-vertical-gradient':true,'fill-extrusion-height':['max',7,['coalesce',['get','render_height'],7]],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':1}; }
  });
  style.light={anchor:'viewport',color:night?'#b7bedf':'#fff2d8',intensity:night?0.35:0.45,position:[1.5,210,45]};
  return style;
}
export default function Map({places,selected,onSelect,night,resetKey}) {
  const container=useRef(), map=useRef(), markers=useRef([]), callback=useRef(onSelect);
  const [status,setStatus]=useState('loading'), [retry,setRetry]=useState(0), [flat,setFlat]=useState(false);
  callback.current=onSelect;
  useEffect(()=>{
    let m; let stopped=false; const cleanups=[];
    setStatus('loading');
    try {
      m=new maplibregl.Map({container:container.current,style:styledMap(night),transformRequest:url=>{const match=url.match(/tiles\.openfreemap\.org\/planet\/[^/]+\/(14\/\d+\/\d+)\.pbf/);return {url:match&&uicTiles.tiles.includes(match[1])?new URL(`${import.meta.env.BASE_URL}uic-tiles/${match[1].replaceAll('/','-')}.pbf?v=${uicTiles.revision}`,window.location.href).href:url};},center:UIC,zoom:15.3,pitch:54,bearing:-22,minPitch:0,maxPitch:80,minZoom:1,maxZoom:19,renderWorldCopies:true,attributionControl:false,dragPan:true,dragRotate:true,pitchWithRotate:true,rollEnabled:true,touchZoomRotate:true,touchPitch:false,keyboard:true});
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
          if(e.shiftKey)m.jumpTo({roll:m.getRoll()-e.deltaX*.3});
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
      const resize=new ResizeObserver(()=>m.resize());resize.observe(container.current);
      cleanups.push(()=>{resize.disconnect();surface.removeEventListener('wheel',wheel,true);surface.removeEventListener('gesturestart',gestureStart);surface.removeEventListener('gesturechange',gestureChange);surface.removeEventListener('gestureend',gestureEnd);for(const name of ['touchstart','touchmove','touchend','touchcancel'])surface.removeEventListener(name,touch,true);});
      // Expose camera readings for regression checks without a global map instance.
      const syncPose=()=>{setFlat(m.getPitch()<1);container.current.dataset.camera=JSON.stringify({center:m.getCenter().toArray(),bearing:m.getBearing(),pitch:m.getPitch(),roll:m.getRoll(),zoom:m.getZoom()});};
      m.on('move',syncPose);syncPose();
      m.getCanvas().setAttribute('aria-label','World 3D map. Drag to pan; right-drag to rotate and tilt; two-finger swipe to pan; use the 2D and 3D buttons to change tilt; Shift-horizontal scroll to roll; pinch to zoom.');
      m.on('load',()=>!stopped&&setStatus('ready'));
      m.easeTo({center:UIC,offset:[0,0],duration:0});
      map.current=m;
    } catch { setStatus('error'); }
    const timeout=setTimeout(()=>{if(!stopped&&m&&!m.isStyleLoaded())setStatus('error');},18000);
    return ()=>{stopped=true;clearTimeout(timeout);cleanups.forEach(fn=>fn());m?.remove();map.current=null;};
  },[retry,uicTiles.revision]);
  useEffect(()=>{if(map.current)map.current.setStyle(styledMap(night));},[night]);
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
  useEffect(()=>{if(map.current)map.current.flyTo({center:UIC,zoom:15.3,pitch:54,bearing:-22,offset:[0,0],duration:900});},[resetKey]);
  return <>
    <div ref={container} className="map" aria-label="Interactive 3D world map, starting at UIC"/>
    <div className="map-vignette"/>
    {status!=='ready'&&<div className="map-status glass" role="status">{status==='loading'?'Loading Chicago…':<>Map unavailable. You can still browse every place.<button onClick={()=>setRetry(v=>v+1)}>Retry map</button></>}</div>}

    <button className="align-map glass" aria-label="Align map north up, east right" title="Align north up · 45° 3D tilt" onClick={()=>map.current?.easeTo({bearing:0,roll:0,pitch:flat?0:45,duration:450})}>N</button>
    <div className="view-toggle glass" role="group" aria-label="Map perspective">
      <button aria-pressed={flat} onClick={()=>map.current?.easeTo({pitch:0,roll:0,duration:450})}>2D</button>
      <button aria-pressed={!flat} onClick={()=>map.current?.easeTo({pitch:45,roll:0,duration:450})}>3D</button>
    </div>
  </>;
}
