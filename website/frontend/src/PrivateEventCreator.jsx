import React, {useEffect, useRef, useState} from 'react';
import {ArrowRight, ArrowLeft, MapPin, LockKeyhole, Check, X, CalendarDays} from 'lucide-react';
import {chicagoDate,clockTime} from './time';
import {privateWhen} from './privateEvents';
import {eventTime} from './search';

export default function PrivateEventCreator({pickedVenue, picking, venueGroups, onSelectExisting, onPickMap, onCancel, onCreate, now}) {
  const dialog = useRef(), firstFocus = useRef(document.activeElement);
  const [step,setStep] = useState(0), [title,setTitle] = useState(''), [date,setDate] = useState(''), [time,setTime] = useState(''), [description,setDescription] = useState(''), [venue,setVenue] = useState(null), [error,setError] = useState('');
  useEffect(() => {if(picking) dialog.current.close(); else dialog.current.showModal();}, [picking]);
  useEffect(() => {if(pickedVenue) {setVenue(pickedVenue); setStep(0); setError('');}}, [pickedVenue]);
  useEffect(() => () => firstFocus.current?.focus(), []);
  useEffect(()=>{if(!picking)return;const cancel=e=>{if(e.key==='Escape')onCancel();};window.addEventListener('keydown',cancel);return()=>window.removeEventListener('keydown',cancel);},[picking,onCancel]);
  useEffect(() => {dialog.current.querySelector('h2')?.focus();}, [step]);
  const validate = () => {
    const currentDate = chicagoDate(now), currentTime = new Intl.DateTimeFormat('en-GB',{timeZone:'America/Chicago',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
    if (!title.trim()) {setError('Give your event a name.'); return false;}
    if (!date || !time || date < currentDate || (date === currentDate && time <= currentTime)) {setError('Choose a future date and time in Chicago.'); return false;}
    setError(''); return true;
  };
  const submit = e => {
    e.preventDefault();
    if(step === 0 && venue?.name.trim()) setStep(1);
    else if(step === 1 && validate()) setStep(2);
    else if(step === 2 && validate()) onCreate({id:crypto.randomUUID(),source:'Private event',title:title.trim(),date,time,description:description.trim(),venue});
  };
  const existing = venue ? (venueGroups[venue.id]?.events || []).filter(e => e.source !== 'Private event' || e.date >= chicagoDate(now)) : [];
  return <>
    {picking && <section className="pin-instructions glass" aria-label="Pin event location"><MapPin size={16} className="pin-instructions-icon" aria-hidden="true"/><p>{pickedVenue?<><strong>{pickedVenue.name}</strong><span>Pinned</span></>:'Tap a building to pin your event'}</p><div className="pin-setup-actions">{pickedVenue&&<button className="primary-button" onClick={()=>onPickMap(false)}>Continue <ArrowRight size={14}/></button>}<button className="secondary-button" onClick={onCancel}>Cancel</button></div></section>}
    <dialog ref={dialog} className="create-event-dialog" onCancel={onCancel} onClick={e => {if(e.target === dialog.current) onCancel();}}>
      <div className="modal-content"><button className="modal-close icon-button" aria-label="Close event setup" onClick={onCancel}><X size={21}/></button>
        <span className="modal-icon private-icon">{step === 0 ? <MapPin size={26}/> : <LockKeyhole size={26}/>}</span>
        <h2 tabIndex={-1}>{['Your building is pinned.','What’s the plan?','Everything look good?'][step]}</h2>
        <p>{['Choose an existing event here, or host something of your own.','Add the details for your private event.','Your building is highlighted. Save your event to keep it on the map.'][step]}</p>
        <form onSubmit={submit}>
          {step === 0 && <>
            {venue ? <>
              <div className="chosen-building"><Check size={19}/><div><strong>{venue.name}</strong><small>{venue.address || `${venue.coords[1].toFixed(5)}, ${venue.coords[0].toFixed(5)}`}</small></div><button type="button" className="text-link" onClick={()=>onPickMap(true)}>Change building</button></div>
              {venue.footprint && <label>Building name<input required maxLength={120} value={venue.name} onChange={e=>setVenue({...venue,name:e.target.value})}/></label>}
              <section className="building-existing-events" aria-label="Existing events in this building">
                <h3>{existing.length ? 'Already happening here' : 'Start something here.'}</h3>
                <p>{existing.length ? 'Choose an event below, or create a new one.' : 'No upcoming events are listed here yet. Create your own private event.'}</p>
                {existing.length > 0 && <div className="existing-event-options">{existing.map(e => <button type="button" key={e.id || `${e.title}:${e.start}`} onClick={()=>onSelectExisting(e)} aria-label={`Choose ${e.title}`}><CalendarDays size={18}/><span><strong>{e.title}</strong><small>{eventTime(e)}</small></span><ArrowRight size={16}/></button>)}</div>}
              </section>
            </> : null}
          </>}
          {step === 1 && <>
            <div className="event-at-building"><MapPin size={16}/>{venue.name}</div>
            <label>Event name<input autoFocus required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Dinner with the crew"/></label>
            <div className="form-row"><label>Date<input type="date" required min={chicagoDate(now)} value={date} onChange={e=>setDate(e.target.value)}/></label><label>Time<input type="time" required value={time} onChange={e=>setTime(e.target.value)}/></label></div>
            <p className="fine-print">All times are in Chicago. It’s {clockTime(now)} there now.</p>
            <label>A little more detail <span className="optional">(optional)</span><textarea maxLength={500} rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Where to meet, what to bring…"/></label>
          </>}
          {step === 2 && <><div className="event-review"><span className="eyebrow">PRIVATE EVENT</span><h3>{title}</h3><p>{privateWhen({date,time})}</p><p><MapPin size={17}/>{venue.name}</p>{description && <p>{description}</p>}</div><p className="fine-print">Saved on this device and kept out of public listings. Anyone you send the link to can view it.</p></>}
          {error && <p role="alert" className="form-error">{error}</p>}
          <div className="wizard-actions">{step > 0 && <button className="secondary-button" type="button" onClick={() => {setStep(step-1);setError('');}}><ArrowLeft size={16}/> Back</button>}<button className="primary-button" type="submit" disabled={step === 0 && !venue}>{step === 2 ? 'Create private event' : step === 0 ? 'Create a new event' : 'Continue'}<ArrowRight size={17}/></button></div>
        </form>
      </div>
    </dialog>
  </>;
}
