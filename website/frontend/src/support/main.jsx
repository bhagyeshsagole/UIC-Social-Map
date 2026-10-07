import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowLeft, ArrowRight, Bug, CheckCircle2, Flag, LifeBuoy, LoaderCircle, MessageCircle} from 'lucide-react';
import {supabase} from '../auth/supabase.js';
import './support.css';

// kampuscape.com/support. Submissions land in the private kampuscape_support_requests
// table; the database normalizes input, links signed-in members and rate-limits.
const KINDS = [
  ['help', 'Get help', 'Signing in, your account or using the map', LifeBuoy],
  ['reach_out', 'Reach out', 'Feedback, ideas, clubs and partnerships', MessageCircle],
  ['bug', 'Report a problem', 'Something broken, wrong hours or a bad location', Bug],
  ['report', 'Report content or safety', 'An event, place or person that shouldn’t be here', Flag],
];
const PLACEHOLDER = {
  help: 'What were you trying to do, and what happened?',
  reach_out: 'Tell us what you have in mind.',
  bug: 'What went wrong? Include the page, device and browser if you can.',
  report: 'What should we look at, and why?',
};
// Production map lives at /uic (no trailing slash); local dev serves it at /.
const MAP = import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '');
const initialKind = () => {
  const type = new URLSearchParams(window.location.search).get('type');
  return KINDS.some(([id]) => id === type) ? type : 'help';
};

function validate({email, message}) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return 'Enter an email address so we can reply.';
  const length = message.trim().length;
  if (length < 10) return 'Add a little more detail (at least 10 characters).';
  if (length > 4000) return 'Keep your message under 4,000 characters.';
  return '';
}

function SupportPage() {
  const [kind, setKind] = useState(initialKind);
  const [form, setForm] = useState(() => ({name: '', email: '', message: '', related_url: new URLSearchParams(window.location.search).get('ref') || '', website: ''}));
  const [state, setState] = useState('idle'), [error, setError] = useState('');
  useEffect(() => { // Signed-in members get their UIC address prefilled.
    supabase?.auth.getSession().then(({data}) => {
      const email = data.session?.user?.email;
      if (email) setForm(f => f.email ? f : {...f, email});
    }).catch(() => {});
  }, []);
  const set = key => e => setForm(f => ({...f, [key]: e.target.value}));
  const submit = async e => {
    e.preventDefault();
    const problem = validate(form);
    if (problem) { setError(problem); return; }
    if (form.website) { setState('sent'); return; } // Honeypot: bots fill hidden fields.
    if (!supabase) { setError('Support is temporarily unavailable. Please try again later.'); return; }
    setState('sending'); setError('');
    const {error: failure} = await supabase.from('kampuscape_support_requests').insert({
      kind, name: form.name.trim(), email: form.email.trim(), message: form.message.trim(), related_url: form.related_url.trim(),
    });
    if (failure) {
      setState('idle');
      setError(failure.code === '54000' ? failure.message : 'We couldn’t send that. Check your connection and try again.');
      return;
    }
    setState('sent');
  };
  const again = () => { setForm(f => ({...f, message: '', related_url: ''})); setState('idle'); };

  return <main className="support">
    <header className="support-header">
      <a className="support-brand" href={MAP}><img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="32" height="32"/>Kampuscape</a>
      <a className="support-back" href={MAP}><ArrowLeft size={16}/> Back to map</a>
    </header>
    {state === 'sent' ? <section className="support-card support-done" aria-live="polite">
      <CheckCircle2 size={38}/>
      <h1>Thanks, we got it.</h1>
      <p>A real person reads every message. We’ll reply to <strong>{form.email.trim()}</strong> if we need anything else.</p>
      <div className="support-actions"><a className="support-primary" href={MAP}>Back to the map</a><button className="support-secondary" onClick={again}>Send another</button></div>
    </section> : <section className="support-card">
      <span className="support-kicker">SUPPORT</span>
      <h1>How can we help?</h1>
      <p className="support-intro">Questions, ideas, or something that doesn’t look right. Send it here and the Kampuscape team will take a look.</p>
      <form onSubmit={submit} noValidate>
        <fieldset className="support-kinds"><legend>What’s this about?</legend>
          {KINDS.map(([id, title, hint, Icon]) => <label key={id} className={`support-kind ${kind === id ? 'selected' : ''}`}>
            <input type="radio" name="kind" value={id} checked={kind === id} onChange={() => setKind(id)}/>
            <span className="support-kind-icon"><Icon size={18}/></span><span><strong>{title}</strong><small>{hint}</small></span>
          </label>)}
        </fieldset>
        {kind === 'report' && <p className="support-note">If someone is in immediate danger, call 911 first.</p>}
        <div className="support-row">
          <label>Name <span>optional</span><input value={form.name} onChange={set('name')} maxLength={80} autoComplete="name"/></label>
          <label>Email<input type="email" value={form.email} onChange={set('email')} maxLength={254} autoComplete="email" required placeholder="you@uic.edu"/></label>
        </div>
        <label>{kind === 'report' ? 'What are you reporting?' : 'Link or event'} <span>optional</span><input value={form.related_url} onChange={set('related_url')} maxLength={500} placeholder="Paste a link, or name the event or place"/></label>
        <label>Message<textarea value={form.message} onChange={set('message')} maxLength={4000} rows={6} required placeholder={PLACEHOLDER[kind]}/><span className="support-count">{form.message.trim().length}/4000</span></label>
        <input className="support-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set('website')} name="website"/>
        {error && <p className="support-error" role="alert">{error}</p>}
        <button className="support-primary" disabled={state === 'sending'}>{state === 'sending' ? <LoaderCircle className="support-spin" size={18}/> : <>Send message <ArrowRight size={18}/></>}</button>
        <p className="support-caption">We only use your details to reply. Messages aren’t public.</p>
      </form>
    </section>}
  </main>;
}

createRoot(document.getElementById('root')).render(<SupportPage/>);
