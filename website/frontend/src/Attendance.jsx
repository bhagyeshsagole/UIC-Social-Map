import React, {useEffect, useMemo, useRef, useState} from 'react';
import {EyeOff, Users, X, MessageCircle} from 'lucide-react';
import {useAuth} from './auth/AuthProvider.jsx';
import {Avatar} from './auth/AccountDialog.jsx';
import {attend, attendanceKey, attendanceResource, ownAttendanceResource, leaveEvent} from './attendance';

import {useMessages} from './Messages.jsx';
import {useResource} from './useResource.js';

// Re-render when anyone on this page changes attendance.
function useAttendanceVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    window.addEventListener('kampuscape-attendance', bump);
    return () => window.removeEventListener('kampuscape-attendance', bump);
  }, []);
  return version;
}
const isMember = auth => !!auth.user && !!auth.profile?.onboarding_completed_at;

// "As yourself" or "Anonymously": used by the return prompt.
export function AttendChoice({value, onChange}) {
  const auth = useAuth();
  return <div className="attend-choice" role="radiogroup" aria-label="How do you want to show up?">
    <button type="button" role="radio" aria-checked={value === 'profile'} className={value === 'profile' ? 'chosen' : ''} onClick={() => onChange('profile')}>
      <Avatar id={auth.profile?.avatar_id} size={38}/><span><strong>As {auth.profile?.display_name}</strong><small>Your profile name and picture</small></span>
    </button>
    <button type="button" role="radio" aria-checked={value === 'anonymous'} className={value === 'anonymous' ? 'chosen' : ''} onClick={() => onChange('anonymous')}>
      <span className="attend-anon-icon"><EyeOff size={18}/></span><span><strong>Anonymously</strong><small>A new random name and picture for this event only. Your account name stays hidden.</small></span>
    </button>
  </div>;
}

// Event card: a small "N going" pill; the popup has the list and join controls.
// Everyone sees the count; names, pictures and joining need sign-in.
export function WhosGoing({event}) {
  const auth = useAuth(), version = useAttendanceVersion(), dialog = useRef();
  const messages=useMessages(),[open,setOpen]=useState(false);
  const resource=useMemo(()=>attendanceResource(event,auth.user?.id),[event.id,event.registrationKey,event.url,auth.user?.id]);
  const loaded=useResource(resource),state={loading:loaded.loading,rows:loaded.data||[],error:loaded.error};
  const member = isMember(auth);
  useEffect(() => {if (open) dialog.current?.showModal(); else if (dialog.current?.open) dialog.current.close();}, [open]);
  if (state.loading && !state.rows.length) return null;
  const total = Number(state.rows[0]?.total || 0), me = state.rows.find(r => r.is_you);
  return <>
    <button className={`going-pill ${me ? 'is-going' : ''}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      {member && total ? <span className="going-pill-faces">{state.rows.slice(0, 3).map((r, i) => <Avatar key={i} id={r.avatar_id} size={20}/>)}</span> : <Users size={14}/>}
      <span><strong>{total}</strong> going</span><em>{me ? 'You’re in' : 'Join'}</em>
    </button>
    <dialog ref={dialog} className="registration-dialog attendees-dialog" aria-labelledby="attendees-heading" onCancel={() => setOpen(false)} onClick={e => {if (e.target === dialog.current) setOpen(false);}}>
      <div className="modal-content">
        <button className="modal-close icon-button" aria-label="Close who’s going" onClick={() => setOpen(false)}><X size={20}/></button>
        <h2 id="attendees-heading">Who’s going</h2>
        <p className="fine-print">{event.title} · {total} {total === 1 ? 'person' : 'people'} from Kampuscape</p>
        {member ? <>
          {total ? <ul className="attendee-list">{state.rows.map((r, i) => <li key={i}><Avatar id={r.avatar_id} size={30}/><span>{r.display_name}{r.is_you && <b> (you)</b>}</span>{r.anonymous && <small>anonymous</small>}{!r.is_you&&r.contact_id&&<button className="text-link attendee-message" aria-label={`Message ${r.display_name}`} onClick={()=>{setOpen(false);messages.request(r,event,me?.display_name||auth.profile.display_name);}}><MessageCircle size={15}/> Message</button>}</li>)}</ul> : <p className="attendee-empty">No one yet. Be the first.</p>}
          {state.error&&<p className="form-error" role="alert">Couldn’t refresh attendees. <button className="text-link" onClick={()=>resource.refresh({force:true})}>Retry</button></p>}
          <GoingAs event={event} compact/>
        </> : <>
          <p className="attendee-empty">Sign in with your UIC account to see who’s going and join, as yourself or anonymously.</p>
          <div className="registration-actions"><button className="primary-button" onClick={() => {setOpen(false); auth.openProfile();}}>Sign in</button></div>
        </>}
      </div>
    </dialog>
  </>;
}

// My Events: switch between showing your name and going anonymously.

export function GoingAs({event, compact = false}) {
  const auth = useAuth(), version = useAttendanceVersion();
  const [row, setRow] = useState(undefined), [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirming, setConfirming] = useState(null);
  const member = isMember(auth);
  const ownResource=useMemo(()=>ownAttendanceResource(auth.user?.id),[auth.user?.id]);
  useEffect(() => {
    if (!member) return;
    let live = true;
    Promise.all([ownResource.refresh({force:version>0}), attendanceKey(event)]).then(([map, key]) => live && setRow(map?.get(key) || null)).catch(() => live && setRow(null));
    return () => {live = false;};
  }, [member, auth.user?.id, event.id, event.registrationKey, version,ownResource]);
  if (!member) return compact ? null : <p className="going-as">Saved on this device. <button className="text-link" onClick={auth.openProfile}>Sign in</button> to join the attendee list.</p>;
  if (row === undefined) return null;
  const current = row ? (row.anonymous ? 'anonymous' : 'profile') : null;
  const save = async mode => {
    setBusy(true); setError('');
    try {await attend(event, mode); setConfirming(null);} catch (e) {setError(e.message);} finally {setBusy(false);}
  };
  // Joining is one tap; switching how you appear asks first.
  const choose = mode => {if (!busy && mode !== current) row ? setConfirming(mode) : save(mode);};
  if (confirming) return <div className="going-as going-as-confirm" role="alertdialog" aria-label="Confirm the change">
    <p>{confirming === 'anonymous'
      ? <>Go anonymous? <strong>{row.display_name}</strong> disappears from the list and you get a new random name and picture.</>
      : <>Show your name? Everyone going will see <strong>{auth.profile?.display_name}</strong> instead of <strong>{row.display_name}</strong>.</>}</p>
    <div className="going-as-confirm-actions"><button className="secondary-button" disabled={busy} onClick={() => setConfirming(null)}>Cancel</button><button className="primary-button" disabled={busy} onClick={() => save(confirming)}>{busy ? 'Saving…' : confirming === 'anonymous' ? 'Go anonymous' : 'Show my name'}</button></div>
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
  return <div className="going-as">
    <span>{row ? <>Going as <Avatar id={row.avatar_id} size={20}/> <strong>{row.display_name}</strong>{row.anonymous ? ' (anonymous)' : ''}</> : compact ? 'Join as' : 'Not on the attendee list yet'}</span>
    <div className={`going-as-switch ${current || 'none'}`} role="radiogroup" aria-label={`Show up at ${event.title} as`}>
      <span className="going-as-thumb" aria-hidden="true"/>
      <button role="radio" aria-checked={current === 'profile'} disabled={busy} onClick={() => choose('profile')}>My name</button>
      <button role="radio" aria-checked={current === 'anonymous'} disabled={busy} onClick={() => choose('anonymous')}>Anonymous</button>
    </div>
    {compact && row && <button className="text-link" disabled={busy} onClick={async () => {setBusy(true);try {await leaveEvent(event);} catch (e) {setError(e.message);} finally {setBusy(false);}}}>Not going</button>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}
