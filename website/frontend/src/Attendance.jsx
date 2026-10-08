import React, {useEffect, useState} from 'react';
import {EyeOff, Users} from 'lucide-react';
import {useAuth} from './auth/AuthProvider.jsx';
import {Avatar} from './auth/AccountDialog.jsx';
import {attend, attendanceKey, eventAttendees, leaveEvent, myAttendance} from './attendance';

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
      <span className="attend-anon-icon"><EyeOff size={18}/></span><span><strong>Anonymously</strong><small>A new random name and picture for this event only. Nobody can tell it’s you.</small></span>
    </button>
  </div>;
}

// Event card: who's going (names and pictures only; members only).
export function WhosGoing({event}) {
  const auth = useAuth(), version = useAttendanceVersion();
  const [state, setState] = useState({loading:true, rows:[]});
  const member = isMember(auth);
  useEffect(() => {
    if (!member) return;
    let live = true;
    setState(s => ({...s, loading:true}));
    const load = () => eventAttendees(event).then(rows => live && setState({loading:false, rows})).catch(() => live && setState({loading:false, rows:[], error:true}));
    load();
    // Live list: refresh while the card is open.
    const timer = setInterval(load, 20000);
    return () => {live = false; clearInterval(timer);};
  }, [member, event.registrationKey, event.id, event.url, version]);
  if (!member) return <section className="whos-going-card" aria-label="Who’s going"><div className="whos-going"><span className="whos-going-icon"><Users size={16}/></span><span><strong>Who’s going?</strong><small>Sign in to see and join</small></span></div><button className="primary-button whos-going-signin" onClick={auth.openProfile}>Sign in</button></section>;
  if (state.loading && !state.rows.length) return null;
  const total = Number(state.rows[0]?.total || 0);
  return <section className="whos-going-card" aria-label="Who’s going">
    {total ? <div className="whos-going" aria-label={`${total} going`}>
      <div className="whos-going-faces">{state.rows.slice(0, 6).map((r, i) => <span key={i} title={r.is_you ? `${r.display_name} (you)` : r.display_name}><Avatar id={r.avatar_id} size={26}/></span>)}</div>
      <span><strong>{total} going</strong><small>{state.rows.slice(0, 2).map(r => r.is_you ? 'You' : r.display_name).join(', ')}{total > 2 ? ` +${total - 2}` : ''}</small></span>
    </div> : <div className="whos-going"><span className="whos-going-icon"><Users size={16}/></span><span><strong>Be the first</strong><small>No one from Kampuscape yet</small></span></div>}
    <GoingAs event={event} compact/>
  </section>;
}

// My Events: switch between showing your name and going anonymously.
let mine = {version:-1, promise:null};
export function GoingAs({event, compact = false}) {
  const auth = useAuth(), version = useAttendanceVersion();
  const [row, setRow] = useState(undefined), [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirming, setConfirming] = useState(null);
  const member = isMember(auth);
  useEffect(() => {
    if (!member) return;
    let live = true;
    if (mine.version !== version || !mine.promise) mine = {version, promise:myAttendance()};
    Promise.all([mine.promise, attendanceKey(event)]).then(([map, key]) => live && setRow(map.get(key) || null)).catch(() => live && setRow(null));
    return () => {live = false;};
  }, [member, event.registrationKey, version]);
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
