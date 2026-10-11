import React, {useEffect, useRef, useState} from 'react';
import {Share2, Copy, Check, X} from 'lucide-react';
import {eventLink} from './privateEvents';
import {saveEventShare,shareUrl} from './eventShares.js';
import {useAuth} from './auth/AuthProvider.jsx';
import {eventTime} from './search';

export default function ShareEvent({event,owned=false}) {
  const auth=useAuth(),[busy,setBusy]=useState(false);
  const originalTitle = useRef(null);
  const restoreTitle = () => {if(originalTitle.current !== null){document.title=originalTitle.current;originalTitle.current=null;}};
  useEffect(()=>()=>restoreTitle(),[]);
  const dialog = useRef(), [url,setUrl] = useState(''), [status,setStatus] = useState('');
  const open = async () => {
    let link='';
    if(busy)return;
    setBusy(true);
    try {
      if(event.source==='Private event'&&(event.shareToken||owned)){
        const token=event.shareToken||await saveEventShare(event);
        link=shareUrl(token);
      }else link=eventLink(event,window.location.href,eventTime(event));
    } catch(error){setUrl('');setStatus(error.message);dialog.current.showModal();return;}
    finally{setBusy(false);}

    // Phones open their own share sheet; browsers without it (or non-HTTPS pages) get the copy dialog.
    if (typeof navigator.share === 'function') {
      try { await navigator.share({title:event.title,text:`${event.title} · Hosted by ${event.host?.name||(owned&&auth.profile?.display_name)||event.organizer||event.place?.name||'Kampuscape'} · ${eventTime(event)}`,url:link}); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    originalTitle.current=document.title;document.title=event.title;
    setUrl(link); setStatus(''); dialog.current.showModal();
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setStatus('Link copied. Paste it into a message.'); setTimeout(() => setStatus(s => s.startsWith('Link copied') ? '' : s), 2500); }
    catch { setStatus('Select and copy the link below.'); dialog.current.querySelector('input')?.select(); }
  };
  const copied = status.startsWith('Link copied');
  const share = async () => {
    try { await navigator.share({title:event.title,text:`${event.title} · Hosted by ${event.host?.name||(owned&&auth.profile?.display_name)||event.organizer||event.place?.name||'Kampuscape'} · ${eventTime(event)}`,url}); }
    catch (error) { if (error.name !== 'AbortError') setStatus('Sharing is unavailable. Copy the link instead.'); }
  };
  return <>
    <button className="text-link share-event" onClick={open} disabled={busy} aria-label={`Share ${event.title}`}><Share2 size={16}/> {busy?'Preparing…':'Share'}</button>
    <dialog ref={dialog} className="share-dialog" onClose={restoreTitle} onClick={e => {if(e.target === dialog.current) dialog.current.close();}}>
      <div className="modal-content"><button className="modal-close icon-button" aria-label="Close share" onClick={() => dialog.current.close()}><X size={20}/></button>
        <span className="eyebrow">Share event</span>
        <h2>{event.title}</h2><p>{event.host?.name&&<>Hosted by {event.host.name} · </>}{eventTime(event)}</p>
        {url && <><div className="share-row"><input readOnly aria-label="Event link" value={url} onFocus={e => e.target.select()}/><button className="primary-button share-copy" onClick={copy} aria-label="Copy link">{copied ? <Check size={15}/> : <Copy size={15}/>}<span>{copied ? 'Copied' : 'Copy'}</span></button></div>
        {typeof navigator.share === 'function' && <button className="secondary-button share-send" onClick={share}><Share2 size={15}/> Send to…</button>}</>}
        <p role="status" className={copied || !status ? 'share-status visually-hidden' : 'share-status'}>{status}</p>
      </div>
    </dialog>
  </>;
}
