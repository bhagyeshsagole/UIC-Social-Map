import React, {useEffect, useRef, useState} from 'react';
import {ArrowRight, ArrowLeft, Check, Compass, Eye, EyeOff, KeyRound, LoaderCircle, Lock, Mail, ShieldCheck, Trash2, X} from 'lucide-react';
import {PASSWORD_MIN, useAuth} from './AuthProvider.jsx';
import {AVATARS, PRONOUNS, isUicEmail, validateProfile} from './profile.js';
import {INTERESTS} from '../interests.js';
import './account.css';

export function Avatar({id, size=44}) {
  const avatar = AVATARS.find(a=>a.id===id) || AVATARS[0];
  return <span className="account-avatar" style={{'--avatar-color':avatar.color,width:size,height:size,fontSize:size*.5}} aria-hidden="true">{avatar.symbol}</span>;
}
function PasswordField({id,label,value,onChange,autoComplete,hint,autoFocus}){
 const [show,setShow]=useState(false);
 return <>
  <div className="account-label"><label htmlFor={id}>{label}</label>{hint&&<span id={`${id}-hint`}>{hint}</span>}</div>
  <div className="account-input-icon account-password"><Lock size={18}/><input id={id} aria-describedby={hint?`${id}-hint`:undefined} type={show?'text':'password'} autoComplete={autoComplete} required minLength={PASSWORD_MIN} maxLength={72} value={value} onChange={e=>onChange(e.target.value)} autoFocus={autoFocus}/>
   <button type="button" className="account-reveal" aria-label={show?'Hide password':'Show password'} aria-pressed={show} onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
 </>;
}
// Immediate signup · Email/password sign-in · Password reset link.
function SignIn(){
 const auth=useAuth(),[mode,setMode]=useState('choose'),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [sent,setSent]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(null),[cooldown,setCooldown]=useState(0);
 useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(v=>v-1),1000);return()=>clearTimeout(timer);},[cooldown]);
 const run=async action=>{setBusy(true);setError(null);try{await action();}catch(e){setError(e);}finally{setBusy(false);}};
 const go=next=>{setMode(next);setError(null);setSent('');setPassword('');};
 const submit=e=>{e.preventDefault();run(async()=>{
  if(mode==='signup'){await auth.signUp(email,password);}
  else if(mode==='signin'){await auth.signIn(email,password);}
  else{await auth.requestPasswordReset(email);setSent('reset');setCooldown(60);}
 });};
 const resend=()=>run(async()=>{await auth.requestPasswordReset(email);setCooldown(60);});
 const address=email.trim().toLowerCase();
 const heading={choose:<>Find plans<br/>around UIC.</>,signup:'Create your account.',signin:'Welcome back.',forgot:'Reset your password.'}[mode];
 const intro={choose:'Sign in with your UIC account to see who’s going and save your plans.',signup:'Create an account with your UIC email and password. You’ll be signed in right away.',signin:'Sign in with your UIC email and password.',forgot:'Enter your UIC email and we’ll send you a link to choose a new password.'}[mode];
 return <>
  <h1 id="account-title">{sent?'Check your inbox.':heading}</h1>
  {mode==='choose'&&!sent?<>
   <p className="account-intro">{intro}</p>
   <button className="account-primary account-choice" onClick={()=>go('signup')}>Create an account <ArrowRight size={18}/></button>
   <button className="account-secondary account-choice" onClick={()=>go('signin')}>Sign in</button>
   <p className="account-caption">Use your @uic.edu email to join.</p>
  </>:sent?<>
   <div className="account-sent"><Mail size={22}/><div><strong>Check your UIC inbox</strong><span>If an account uses {address}, we sent it a link to choose a new password.</span></div></div>
   <p className="account-caption account-caption-left">Open the button in your email to return to Kampuscape. Links work once and expire after 10 minutes. Can’t find it? Check Junk and the Other tab in Outlook.</p>
   <div className="account-inline-actions"><button disabled={busy||cooldown>0} onClick={resend}>{cooldown?`Resend in ${cooldown}s`:'Resend email'}</button><button disabled={busy} onClick={()=>go('signin')}>Back to sign in</button></div>
  </>:<>
   <button className="account-back" onClick={()=>go(mode==='forgot'?'signin':'choose')}><ArrowLeft size={15}/> Back</button>
   <p className="account-intro">{intro}</p>
   <form onSubmit={submit}>
    <label className="account-label" htmlFor="uic-email">UIC email</label>
    <div className="account-input-icon"><Mail size={18}/><input id="uic-email" type="email" autoComplete={mode==='signup'?'email':'username'} placeholder="you@uic.edu" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></div>
    {mode!=='forgot'&&<PasswordField id="account-password" label="Password" hint={mode==='signup'?`At least ${PASSWORD_MIN} characters`:null} value={password} onChange={setPassword} autoComplete={mode==='signup'?'new-password':'current-password'}/>}
    {mode==='signin'&&<button type="button" className="account-forgot" onClick={()=>go('forgot')}>Forgot password?</button>}
    <button className="account-primary" disabled={busy||!auth.configured}>{busy?<LoaderCircle className="spin" size={18}/>:<>{{signup:'Create account',signin:'Sign in',forgot:'Email me a reset link'}[mode]} <ArrowRight size={18}/></>}</button>
   </form>
   <p className="account-caption">Use your @uic.edu email to join.</p>
  </>}
  {auth.notice&&<p className="account-notice" role="status"><ShieldCheck size={17}/>{auth.notice}</p>}
  {(error||auth.error)&&<p className="account-error" role="alert">{error?.message||auth.error}
   {error?.existing&&<> <button className="account-error-action" onClick={()=>go('signin')}>Sign in</button></>}

  </p>}
  {!sent&&mode!=='choose'&&<p className="account-switch-mode">{mode==='signup'?<>Already have an account? <button onClick={()=>go('signin')}>Sign in</button></>:mode==='signin'?<>New to Kampuscape? <button onClick={()=>go('signup')}>Create an account</button></>:<>Remembered it? <button onClick={()=>go('signin')}>Back to sign in</button></>}</p>}
  {!auth.configured&&<p className="account-error" role="status">Sign-in is being set up. You can explore the map in the meantime.</p>}
  <button className="account-text" onClick={auth.close}>Explore the map first</button>
 </>;
}
// After a reset link, or "Change password" in the profile.
function SetPassword(){
 const auth=useAuth(),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async e=>{e.preventDefault();setBusy(true);setError('');try{await auth.updatePassword(password);}catch(x){setError(x.message);}finally{setBusy(false);}};
 return <>
  <span className="account-danger-icon account-key-icon"><KeyRound size={24}/></span>
  <h1 id="account-title">{auth.recovering?'Choose a new password.':'Change your password.'}</h1>
  <p className="account-intro">You’ll use it with {auth.user.email} to sign in.</p>
  <form onSubmit={save}>
   <PasswordField id="new-password" label="New password" hint={`At least ${PASSWORD_MIN} characters`} value={password} onChange={setPassword} autoComplete="new-password" autoFocus/>
   {error&&<p className="account-error" role="alert">{error}</p>}
   <button className="account-primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={18}/>:<>Save password <ArrowRight size={18}/></>}</button>
  </form>
  {!auth.recovering&&<button className="account-text" disabled={busy} onClick={()=>auth.setChangingPassword(false)}>Cancel</button>}
 </>;
}
function ProfileForm(){
 const auth=useAuth(), p=auth.profile;
 const [step,setStep]=useState(0),[form,setForm]=useState({display_name:p?.display_name||'',pronouns:p?.pronouns||'',avatar_id:p?.avatar_id||'orbit',interests:p?.interests||[]});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const set=(key,value)=>setForm(v=>({...v,[key]:value}));
 const toggle=id=>{setError('');setForm(v=>({...v,interests:v.interests.includes(id)?v.interests.filter(x=>x!==id):v.interests.length<8?[...v.interests,id]:v.interests}));};
 const next=async e=>{
  e.preventDefault();setError('');
  if(step===0){try{validateProfile({...form,interests:['social']});setStep(1);}catch(e){setError(e.message);}return;}
  setBusy(true);try{await auth.saveProfile(form);}catch(e){setError(e.message);}finally{setBusy(false);}
 };
 return <>
  <div className="account-progress" aria-label={`Step ${step+1} of 2`}><span className="complete"/><span className={step===1?'complete':''}/></div>
  <span className="account-kicker">{auth.editing?'MAKE IT YOURS':`A LITTLE ABOUT YOU · ${step+1} OF 2`}</span>
  <h1 id="account-title">{step===0?'Nice to meet you.':'What pulls you in?'}</h1>
  <p className="account-intro">{step===0?'Choose how you’ll show up on Kampuscape.':'Pick 1–8 interests. We’ll use these to suggest events you might enjoy.'}</p>
  {auth.notice&&<p className="account-notice" role="status">{auth.notice}</p>}
  <form onSubmit={next}>
   {step===0?<>
    <div className="account-avatar-preview"><Avatar id={form.avatar_id} size={76}/><span>{form.display_name.trim()||'Your name'}<small>{form.pronouns||'Your pronouns'}</small></span></div>
    <label className="account-label" htmlFor="profile-name">What should we call you?</label><input id="profile-name" autoComplete="nickname" placeholder="Your name" required minLength={2} maxLength={60} value={form.display_name} onChange={e=>set('display_name',e.target.value)} autoFocus/>
    <label className="account-label" htmlFor="profile-pronouns">Pronouns <span>Optional</span></label>
    <input id="profile-pronouns" list="pronoun-options" placeholder="Add yours, or leave blank" maxLength={40} value={form.pronouns} onChange={e=>set('pronouns',e.target.value)}/><datalist id="pronoun-options">{PRONOUNS.filter(Boolean).map(x=><option key={x} value={x}/>)}</datalist>
    <fieldset className="avatar-choices"><legend>Pick your avatar</legend>{AVATARS.map(a=><button type="button" key={a.id} aria-label={a.label} aria-pressed={form.avatar_id===a.id} onClick={()=>set('avatar_id',a.id)}><Avatar id={a.id}/>{form.avatar_id===a.id&&<span className="avatar-check"><Check size={11}/></span>}</button>)}</fieldset>
   </>:<>
    <fieldset className="interest-choices"><legend className="sr-only">Your interests</legend>{INTERESTS.map(i=><button type="button" key={i.id} aria-pressed={form.interests.includes(i.id)} disabled={busy||(!form.interests.includes(i.id)&&form.interests.length>=8)} onClick={()=>toggle(i.id)}><span aria-hidden="true">{i.emoji}</span>{i.label}{form.interests.includes(i.id)&&<Check size={15}/>}</button>)}</fieldset>
    <div className="interest-count" aria-live="polite">{form.interests.length} of 8 selected <span>You can change these anytime.</span></div>
   </>}
   {error&&<p className="account-error" role="alert">{error}</p>}
   <button className="account-primary" disabled={busy||(step===1&&!form.interests.length)}>{busy?'Saving your profile…':step===0?<>Continue <ArrowRight size={18}/></>:auth.editing?'Save profile':<>Find my kind of plans <Compass size={18}/></>}</button>
   {step===1&&<button type="button" className="account-text" disabled={busy} onClick={()=>{setStep(0);setError('');}}><ArrowLeft size={15}/> Back</button>}
  </form>
 </>;
}
// Second check before erasing everything; the first is the Delete account button.
function DeleteAccount({onCancel}){
 const auth=useAuth(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const erase=async()=>{setBusy(true);setError('');try{await auth.deleteAccount();}catch(e){setError(e.message);setBusy(false);}};
 return <>
  <span className="account-danger-icon"><Trash2 size={24}/></span><span className="account-kicker account-kicker-danger">DELETE ACCOUNT</span>
  <h1 id="account-title">Delete your account?</h1>
  <p className="account-intro">Kampuscape was built with privacy at its heart. Deleting your account permanently erases all of your data: your profile, pronouns, avatar and interests, your sign-in, the events you’re attending (including anonymous names), your conversations and shared event links, any support messages you’ve sent, and the saved places and private plans on this device.</p>
  <p className="account-caption account-caption-left">This can’t be undone. You can always join again later with your UIC email.</p>
  {error&&<p className="account-error" role="alert">{error}</p>}
  <button className="account-primary account-destructive" disabled={busy} onClick={erase}>{busy?<><LoaderCircle className="spin" size={18}/> Erasing your data…</>:<><Trash2 size={17}/> Delete my account and data</>}</button>
  <button className="account-text" disabled={busy} onClick={onCancel}>Keep my account</button>
 </>;
}
function Profile(){
 const auth=useAuth(),[error,setError]=useState(''),[deleting,setDeleting]=useState(false);
 if(deleting)return <DeleteAccount onCancel={()=>setDeleting(false)}/>;
 return <>
  <Avatar id={auth.profile.avatar_id} size={80}/><span className="account-kicker">YOUR CORNER OF CHICAGO</span>
  <h1 id="account-title">Hey, {auth.profile.display_name}.</h1>
  {auth.profile.pronouns&&<p className="account-pronouns">{auth.profile.pronouns}</p>}
  <p className="account-caption">{auth.user.email}</p>
  <div className="profile-interest-list">{auth.profile.interests.map(id=>{const i=INTERESTS.find(i=>i.id===id);return i?<span key={id}>{i.emoji} {i.label}</span>:null;})}</div>
  <p className="account-intro">Your interests shape the For you tab in Live events.</p><p className="account-caption">Your profile syncs across devices. Saved places and private plans stay on this device.</p>
  <button className="account-primary" onClick={()=>auth.setEditing(true)}>Edit profile & interests <ArrowRight size={18}/></button>
  <button className="account-text" onClick={()=>auth.setChangingPassword(true)}><KeyRound size={14}/> Change password</button>
  <button className="account-text" onClick={async()=>{try{await auth.signOut();}catch(e){setError(e.message);}}}>Sign out</button>
  {error&&<p className="account-error" role="alert">{error}</p>}
  <button className="account-text account-delete" onClick={()=>setDeleting(true)}><Trash2 size={14}/> Delete account</button>
 </>;
}
export default function AccountDialog(){
 const auth=useAuth(),ref=useRef(),focus=useRef();
 const mustOnboard=!!auth.user&&!auth.profile?.onboarding_completed_at;
 const visible=auth.open||mustOnboard;
 useEffect(()=>{if(visible){focus.current=document.activeElement;if(!ref.current.open)ref.current.showModal();}else if(ref.current.open){ref.current.close();focus.current?.focus();}},[visible]);
 const cancel=e=>{if(mustOnboard)e.preventDefault();else auth.close();};
 return <dialog ref={ref} className="account-dialog" aria-labelledby="account-title" onCancel={cancel} onClick={e=>{if(e.target===ref.current&&!mustOnboard)auth.close();}}>
  <div className="account-shell"><div className="account-wordmark"><span className="account-logo"><Compass size={19}/></span>Kampuscape<span className="account-beta">UIC</span></div>
   {!mustOnboard&&<button className="account-close" aria-label="Close account" onClick={auth.close}><X size={20}/></button>}
   {visible&&(auth.loading?<div className="account-loading"><LoaderCircle className="spin"/><h1 id="account-title">Getting things ready…</h1></div>:auth.user&&auth.error?<><h1 id="account-title">Let’s reconnect.</h1><p className="account-error" role="alert">{auth.error}</p><button className="account-primary" onClick={auth.retry}>Retry</button><button className="account-text" onClick={()=>auth.signOut().catch(()=>{})}>Sign out</button></>:auth.user?(auth.recovering||auth.changingPassword?<SetPassword/>:mustOnboard||auth.editing?<ProfileForm key={auth.user.id}/>:<Profile/>):<SignIn/>)}
   {mustOnboard&&!auth.error&&!auth.loading&&<button className="account-text account-switch" onClick={()=>auth.signOut().catch(()=>{})}>Use a different account</button>}
  </div>
 </dialog>;
}
