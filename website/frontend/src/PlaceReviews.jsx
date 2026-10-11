import React,{useEffect,useMemo,useState} from 'react';
import {Star,Flag} from 'lucide-react';
import {useAuth} from './auth/AuthProvider.jsx';
import {supabase} from './auth/supabase.js';
import {createResource} from './liveResource.js';
import {useResource} from './useResource.js';
import './reviews.css';
async function call(name,args){if(!supabase)throw new Error('Reviews are unavailable.');const {data,error}=await supabase.rpc(`kampuscape_${name}`,args);if(error)throw new Error(['22023','54000'].includes(error.code)?error.message:'Couldn’t load or save reviews. Please retry.');return data;}
export default function PlaceReviews({place}){
 const auth=useAuth(),uid=auth.user?.id;
 const resource=useMemo(()=>createResource(()=>call('place_reviews',{p_place_id:place.id}),{interval:60000}),[place.id,uid]);
 const state=useResource(resource),data=state.data, mine=data?.mine;
 const [editing,setEditing]=useState(false),[rating,setRating]=useState(5),[body,setBody]=useState(''),[anonymous,setAnonymous]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[older,setOlder]=useState([]),[report,setReport]=useState(null),[reason,setReason]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{setEditing(false);setOlder([]);setError('');setReport(null);return()=>resource.clear();},[resource]);
 const act=async fn=>{setBusy(true);setError('');try{await fn();await resource.refresh({force:true});}catch(e){setError(e.message);}finally{setBusy(false);}};
 const start=()=>{if(!uid||!auth.profile?.onboarding_completed_at){auth.openProfile();return;}setRating(mine?.rating||5);setBody(mine?.body||'');setAnonymous(mine?.anonymous||false);setEditing(true);setNotice('');};
 const rows=[...new Map([...(data?.reviews||[]),...older].map(r=>[r.id,r])).values()];
 return <section className="place-reviews" aria-label="Student reviews">
 <div className="reviews-heading"><div><h3>Student reviews</h3><p>{data?.count?`${data.average} / 5 · ${data.count} ${data.count===1?'review':'reviews'}`:'Be the first to share your experience.'}</p></div><button className="secondary-button" onClick={start}>{mine?'Edit your review':'Write a review'}</button></div>
 <p className="fine-print">Student experiences, shared publicly. Reviews don’t verify student discounts.</p>
 {editing&&<form onSubmit={e=>{e.preventDefault();act(async()=>{await call('save_review',{p_place_id:place.id,p_rating:rating,p_body:body,p_anonymous:anonymous});setEditing(false);setOlder([]);setNotice('Your review is published.');});}}>
 <fieldset><legend>Your rating</legend><div className="review-stars">{[1,2,3,4,5].map(n=><button key={n} type="button" aria-label={`${n} ${n===1?'star':'stars'}`} aria-pressed={rating===n} onClick={()=>setRating(n)}><Star size={25} fill={n<=rating?'currentColor':'none'}/></button>)}</div></fieldset>
 <label>Your experience<textarea required minLength={10} maxLength={2000} rows={3} value={body} onChange={e=>setBody(e.target.value)} placeholder="What should another student know?"/></label>
 <label>Post as<select value={anonymous?'anonymous':'profile'} onChange={e=>setAnonymous(e.target.value==='anonymous')}><option value="profile">{auth.profile?.display_name} (public name)</option><option value="anonymous">Anonymous student</option></select></label>
 <p className="fine-print">{anonymous?'Your profile name is hidden from readers. Your account remains linked privately for moderation.':'Your profile name will appear publicly with this review.'}</p>
 <div className="review-actions"><button className="primary-button" disabled={busy}>{busy?'Saving…':mine?'Save changes':'Publish review'}</button><button type="button" className="text-link" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button>{mine&&<button type="button" className="text-link delete-event" disabled={busy} onClick={()=>act(async()=>{await call('delete_review',{p_review_id:mine.id});setEditing(false);setOlder([]);setNotice('Review deleted.');})}>Delete your review</button>}</div>
 </form>}
 {state.loading&&!data&&<p role="status">Loading reviews…</p>}
 {rows.map(r=><article key={r.id} className="student-review"><div><strong>{r.display_name}{r.is_you?' (you)':''}</strong><span aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span></div><p>{r.body}</p><footer><time dateTime={r.updated_at}>{new Date(r.updated_at).toLocaleDateString()}</time>{uid&&!r.is_you&&<button className="text-link" onClick={()=>{setReport(r.id);setReason('');setNotice('');}}><Flag size={12}/> Report</button>}</footer></article>)}
 {data&&rows.length<data.count&&<button className="text-link" disabled={busy} onClick={()=>act(async()=>{const next=await call('place_reviews',{p_place_id:place.id,p_offset:rows.length});setOlder(v=>[...v,...next.reviews]);})}>Load more reviews</button>}
 {report&&<form onSubmit={e=>{e.preventDefault();act(async()=>{await call('report_review',{p_review_id:report,p_reason:reason});setReport(null);setNotice('Report submitted for review.');});}}><label>Why are you reporting this review?<textarea required minLength={5} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="review-actions"><button className="secondary-button" disabled={busy}>Submit report</button><button type="button" className="text-link" onClick={()=>setReport(null)}>Cancel</button></div></form>}
 {(error||state.error)&&<p role="alert">{error||state.error.message} <button className="text-link" onClick={()=>resource.refresh({force:true})}>Retry</button></p>}{notice&&<p role="status">{notice}</p>}
 </section>;
}
