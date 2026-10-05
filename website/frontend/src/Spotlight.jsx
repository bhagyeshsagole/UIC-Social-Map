import {useEffect, useMemo, useRef, useState} from 'react';
import {Search, X, Bookmark, CalendarDays, Utensils, Compass, CornerDownLeft, ArrowRight, Shapes} from 'lucide-react';
import {PlaceIcon} from './Map';
import {searchIndex} from './search';
const kindIcon = {event:CalendarDays, plan:CalendarDays, menu:Utensils, category:Shapes, action:ArrowRight};
export default function Spotlight({open, items, onClose, onPick}) {
  const dialog = useRef(), input = useRef(), list = useRef();
  const [query, setQuery] = useState(''), [active, setActive] = useState(0);
  const groups = useMemo(() => searchIndex(items, query), [items, query]);
  const flat = groups.flatMap(g => g.items);
  useEffect(() => { if (open) { setQuery(''); setActive(0); dialog.current?.showModal(); requestAnimationFrame(() => input.current?.focus()); } else dialog.current?.close(); }, [open]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => { list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'}); }, [active]);
  const choose = item => { if (item) { onClose(); onPick(item); } };
  function onKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (flat.length) setActive(a => (a + (e.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(flat[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
  }
  let n = -1;
  return <dialog ref={dialog} className="spotlight" aria-label="Search everything" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === dialog.current) onClose(); }}>
    {open && <>
    <div className="spotlight-field"><Search size={21}/><input ref={input} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKey} placeholder="Search places, events, plans, menus…" aria-label="Search everything" role="combobox" aria-expanded="true" aria-controls="spotlight-results" aria-activedescendant={flat[active] ? `sl-${active}` : undefined} autoComplete="off" spellCheck="false"/>{query ? <button className="spotlight-clear" aria-label="Clear search" onClick={() => { setQuery(''); input.current?.focus(); }}><X size={16}/></button> : <kbd>esc</kbd>}</div>
    <div className="spotlight-results" id="spotlight-results" role="listbox" ref={list}>
      {groups.map(g => <section key={g.group} role="group" aria-label={g.group}><h4>{g.group}</h4>{g.items.map(item => { n++; const i = n, Icon = kindIcon[item.kind]; return <button key={item.id} id={`sl-${i}`} role="option" aria-selected={i === active} className={`spotlight-item ${i === active ? 'active' : ''}`} onMouseMove={() => setActive(i)} onClick={() => choose(item)} tabIndex={-1}>
        <span className={`spotlight-icon ${item.place?.accent || ''}`}>{item.kind === 'place' && item.place.photo ? <img src={`${import.meta.env.BASE_URL}places/${item.place.photo.file}`} alt=""/> : item.kind === 'place' ? <PlaceIcon place={item.place} size={18}/> : <Icon size={18}/>}</span>
        <span className="spotlight-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span>
        {item.group === 'Saved' && <Bookmark size={15} fill="currentColor" className="spotlight-saved"/>}
        {i === active && <CornerDownLeft size={15} className="spotlight-enter"/>}
      </button>; })}</section>)}
      {flat.length === 0 && <div className="spotlight-empty"><Compass size={26}/><strong>Nothing matches “{query}”</strong><span>Try a place, a food, a neighborhood, or an event.</span></div>}
    </div>
    </>}
  </dialog>;
}
