import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {MessageCircle,ArrowLeft,Send,ShieldBan,X,LoaderCircle} from 'lucide-react';
import {useAuth} from './auth/AuthProvider.jsx';
import {Avatar} from './auth/AccountDialog.jsx';
import {useResource} from './useResource.js';
import {createResource} from './liveResource.js';
import {inboxResource,messageCall,clearMessages} from './messaging.js';
import './welcome.css';
const Context=createContext(null);
export const useMessages=()=>useContext(Context);
export function MessagingProvider({children}){
 const auth=useAuth(),uid=auth.profile?.onboarding_completed_at?auth.user?.id:null;
 const resource=useMemo(()=>inboxResource(uid),[uid]),state=useResource(resource);
 const [open,setOpen]=useState(false),[request,setRequest]=useState(null),[selected,setSelected]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const dialog=useRef(),priorFocus=useRef(),activeUser=useRef(uid);activeUser.current=uid;
 useEffect(()=>{setOpen(false);setRequest(null);setSelected(null);setError('');setBusy(false);return()=>clearMessages(uid);},[uid]);
 useEffect(()=>{if(open){priorFocus.current=document.activeElement;dialog.current?.showModal();}else if(dialog.current?.open){dialog.current.close();priorFocus.current?.focus();}},[open]);
 const threads=state.data||[],thread=threads.find(t=>t.id===selected);
 const unread=threads.reduce((n,t)=>n+(t.blocked?0:Number(t.unread||0)+(t.incoming&&t.status==='pending'?1:0)),0);
 const action=async(fn)=>{const owner=uid;setBusy(true);setError('');try{await fn();if(activeUser.current===owner)await resource.refresh({force:true});}catch(e){if(activeUser.current===owner)setError(e.message);}finally{if(activeUser.current===owner)setBusy(false);}};
 const close=()=>{setOpen(false);setError('');setRequest(null);};
 return <Context.Provider value={{unread,open:()=>{if(!uid){auth.openProfile();return;}setRequest(null);setSelected(null);setOpen(true);resource.refresh({force:true});},request:(person,event,yourName)=>{setRequest({person,event,yourName});setSelected(null);setError('');setOpen(true);}}}>
 {children}
 <dialog ref={dialog} className="social-dialog messages-dialog" aria-labelledby="messages-title" onCancel={close} onClick={e=>{if(e.target===dialog.current)close();}}>
 <button className="modal-close icon-button" aria-label="Close messages" onClick={close}><X size={21}/></button>
 <span className="social-kicker"><MessageCircle size={16}/> YOUR CONVERSATIONS</span>
 <h2 id="messages-title">{request?'Say hello.':thread?thread.display_name:'Messages'}</h2>
 {request?<>
  <div className="message-person"><Avatar id={request.person.avatar_id} size={48}/><div><strong>{request.person.display_name}</strong><span>{request.event.title}</span></div></div>
  <p>Send a request as <strong>{request.yourName}</strong>. They can accept, decline, or block. You can chat after they accept.</p>
  <button className="primary-button" disabled={busy} onClick={()=>action(async()=>{const id=await messageCall('request_message',{p_contact_id:request.person.contact_id});if(activeUser.current!==uid)return;setRequest(null);setSelected(id);})}>{busy?<LoaderCircle className="spin" size={18}/>:<><Send size={16}/> Send message request</>}</button>
 </>:thread?<>
  <button className="text-link" onClick={()=>{setSelected(null);setError('');}}><ArrowLeft size={15}/> All messages</button>
  <p className="message-context">{thread.event_title} · You appear as {thread.your_name}</p>
  {thread.blocked?<div className="message-state"><ShieldBan size={24}/><p>{thread.blocked_by_you?'You blocked this person. They can’t send you messages or new requests, even at other events.':'This conversation is unavailable.'}</p>{thread.blocked_by_you&&<button className="secondary-button" disabled={busy} onClick={()=>action(()=>messageCall('message_action',{p_thread_id:thread.id,p_action:'unblock'}))}>Unblock person</button>}</div>:thread.status==='pending'?<div className="message-state"><MessageCircle size={28}/><h3>{thread.incoming?'Wants to chat with you':'Request sent'}</h3><p>{thread.incoming?'Choose whether to start this conversation. No messages can be sent until you accept.':'You can send messages once they accept your request.'}</p>{thread.incoming&&<div className="social-actions"><button className="primary-button" disabled={busy} onClick={()=>action(()=>messageCall('message_action',{p_thread_id:thread.id,p_action:'accept'}))}>Accept request</button><button className="secondary-button" disabled={busy} onClick={()=>action(()=>messageCall('message_action',{p_thread_id:thread.id,p_action:'decline'}))}>Decline</button></div>}</div>:thread.status==='declined'?<p className="message-state">This request was declined. No messages can be sent.</p>:open&&<Conversation key={`${uid}:${thread.id}`} thread={thread} refreshInbox={()=>resource.refresh({force:true})}/>}
  {!thread.blocked_by_you&&<button className="text-link message-block" disabled={busy} onClick={()=>action(()=>messageCall('message_action',{p_thread_id:thread.id,p_action:'block'}))}><ShieldBan size={15}/> Block this person</button>}
 </>:<>
  <p>Requests and conversations with people you’ve found through events.</p>
  {state.loading&&!state.data?<p role="status">Loading messages…</p>:threads.length?<ul className="message-inbox">{threads.map(t=><li key={t.id}><button onClick={()=>{setSelected(t.id);setError('');}}><Avatar id={t.avatar_id} size={40}/><span><strong>{t.display_name}</strong><small>{t.event_title}</small><small>{t.blocked?'Blocked':t.status==='pending'?(t.incoming?'Message request · Accept or decline':'Waiting for acceptance'):t.status==='declined'?'Request declined':'Conversation'}</small></span>{!t.blocked&&(Number(t.unread)>0||(t.incoming&&t.status==='pending'))&&<b className="unread-dot" aria-label="Unread"/>}</button></li>)}</ul>:<div className="message-state"><MessageCircle size={30}/><h3>Your next hello starts at an event.</h3><p>Open “Who’s going” on an event and tap Message beside someone’s name.</p></div>}
  {state.error&&<p className="form-error" role="alert">{state.error.message} <button className="text-link" onClick={()=>resource.refresh({force:true})}>Retry</button></p>}
 </>}
 {error&&<p className="form-error" role="alert">{error}</p>}
 </dialog>
 </Context.Provider>;
}
function Conversation({thread,refreshInbox}){
 const resource=useMemo(()=>createResource(()=>messageCall('message_history',{p_thread_id:thread.id}),{interval:8000}),[thread.id]);
 const state=useResource(resource),[older,setOlder]=useState([]),[text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[more,setMore]=useState(true);
 const retry=useRef(null),bottom=useRef();
 const rows=[...new Map([...older,...(state.data||[])].map(m=>[String(m.id),m])).values()].sort((a,b)=>Number(a.id)-Number(b.id));
 const newest=rows.at(-1)?.id;
 useEffect(()=>{if(!newest)return;bottom.current?.scrollIntoView({block:'nearest'});messageCall('message_action',{p_thread_id:thread.id,p_action:'read'}).then(refreshInbox).catch(()=>{});},[newest,thread.id]);
 const send=async e=>{e.preventDefault();if(!text.trim()||busy)return;setBusy(true);setError('');if(!retry.current||retry.current.body!==text)retry.current={body:text,id:crypto.randomUUID()};try{await messageCall('send_message',{p_thread_id:thread.id,p_body:text,p_client_id:retry.current.id});setText('');retry.current=null;await resource.refresh({force:true});await refreshInbox();}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <>
 <div className="message-history" role="log" aria-label="Conversation" aria-live="polite">
 {state.loading&&!state.data&&<p>Loading conversation…</p>}
 {rows.length>=50&&more&&<button className="text-link" onClick={async()=>{try{const list=await messageCall('message_history',{p_thread_id:thread.id,p_before:rows[0].id});setOlder(v=>[...v,...list]);if(list.length<50)setMore(false);}catch(e){setError(e.message);}}}>Load earlier messages</button>}
 {!rows.length&&state.data&&<p className="message-empty">Request accepted. Start with a hello.</p>}
 {rows.map(m=><div className={`message-bubble ${m.is_you?'mine':''}`} key={m.id}><p>{m.body}</p><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</time></div>)}<div ref={bottom}/>
 </div>
 <form className="message-compose" onSubmit={send}><label className="sr-only" htmlFor="message-body">Message</label><textarea id="message-body" value={text} maxLength={2000} rows={2} onChange={e=>setText(e.target.value)} placeholder="Write a message…"/><button className="primary-button" aria-label="Send message" disabled={busy||!text.trim()}>{busy?<LoaderCircle size={18} className="spin"/>:<Send size={18}/>}</button></form>
 {(error||state.error)&&<p className="form-error" role="alert">{error||state.error.message} <button className="text-link" onClick={()=>resource.refresh({force:true})}>Refresh</button></p>}
 </>;
}
