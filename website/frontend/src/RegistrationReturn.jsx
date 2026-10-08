import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {CalendarDays,X} from 'lucide-react';
import {registrationSnapshot,readRegistered,readPending,registrationStorageKeys} from './registeredEvents';
const Context=createContext(null);
function read(storage,key){try{return JSON.parse(storage.getItem(key));}catch{return null;}}
export const useRegistration=()=>useContext(Context);
export function RegistrationProvider({children,userId}){
  const keys=registrationStorageKeys(userId);
  const [events,setEvents]=useState(()=>readRegistered(read(localStorage,keys.saved)));
  const [prompt,setPrompt]=useState(null),[error,setError]=useState('');
  const pending=useRef(readPending(read(sessionStorage,keys.pending))),saved=useRef(events);
  saved.current=events;
  const persistPending=()=>{try{if(pending.current)sessionStorage.setItem(keys.pending,JSON.stringify(pending.current));else sessionStorage.removeItem(keys.pending);}catch{/* In-memory return tracking still works. */}};
  const begin=event=>{
    pending.current=null;persistPending();
    const snapshot=registrationSnapshot(event);
    if(!snapshot || saved.current.some(e=>e.registrationKey===snapshot.registrationKey))return;
    pending.current={event:snapshot,at:Date.now(),departed:false};persistPending();
  };
  useEffect(()=>{
    let timer;
    const leave=()=>{if(pending.current){pending.current.departed=true;persistPending();}};
    const check=()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        const current=readPending(pending.current);
        if(document.visibilityState!=='visible'||!document.hasFocus()||!current?.departed)return;
        pending.current=null;persistPending();
        if(!saved.current.some(e=>e.registrationKey===current.event.registrationKey)){setError('');setPrompt(current.event);}
      },150);
    };
    const visibility=()=>document.visibilityState==='hidden'?leave():check();
    window.addEventListener('blur',leave);window.addEventListener('focus',check);
    window.addEventListener('pagehide',leave);window.addEventListener('pageshow',check);
    document.addEventListener('visibilitychange',visibility);check();
    return()=>{clearTimeout(timer);window.removeEventListener('blur',leave);window.removeEventListener('focus',check);window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',check);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  const write=next=>{try{localStorage.setItem(keys.saved,JSON.stringify(next));setEvents(next);setError('');return true;}catch{setError('Couldn’t save on this device. Please try again.');return false;}};
  const add=()=>{if(prompt&&write(readRegistered([...saved.current,prompt]))){setPrompt(null);return true;}return false;};
  const remove=event=>write(saved.current.filter(e=>e.registrationKey!==event.registrationKey));
  return <Context.Provider value={{events,prompt,error,begin,add,remove,dismiss:()=>{setPrompt(null);setError('');}}}>{children}</Context.Provider>;
}
export function RegistrationLink({event,children,...props}){
  const {begin}=useRegistration();
  return <a {...props} href={event.url} target="_blank" rel="noreferrer" onClick={()=>begin(event)} onAuxClick={e=>{if(e.button===1)begin(event);}}>{children}</a>;
}
export function RegistrationPrompt({onAdded}){
  const {prompt,error,add,dismiss}=useRegistration(),dialog=useRef(),previousFocus=useRef();
  useEffect(()=>{
    if(prompt){previousFocus.current=document.activeElement;dialog.current.showModal();}
    else if(dialog.current.open){dialog.current.close();previousFocus.current?.focus();}
  },[prompt]);
  return <dialog ref={dialog} className="registration-dialog" aria-labelledby="registration-heading" aria-describedby="registration-question" onCancel={dismiss} onClick={e=>{if(e.target===dialog.current)dismiss();}} onKeyDown={e=>{if(e.key==='Escape')e.stopPropagation();}}>
    <div className="modal-content"><button className="modal-close icon-button" aria-label="Close registration reminder" onClick={dismiss}><X size={21}/></button>
      <span className="modal-icon"><CalendarDays size={26}/></span>
      <h2 id="registration-heading">Did you register?</h2>
      <p id="registration-question">Add <strong>{prompt?.title}</strong> to My Events so you can find it later.</p>
      <p className="fine-print">Saved on this device. Registration is handled by the event organizer.</p>
      {error&&<p role="alert" className="form-error">{error}</p>}
      <div className="registration-actions"><button className="secondary-button" onClick={dismiss}>Not now</button><button className="primary-button" onClick={()=>{if(add())onAdded?.();}}>Add to My Events</button></div>
    </div>
  </dialog>;
}
