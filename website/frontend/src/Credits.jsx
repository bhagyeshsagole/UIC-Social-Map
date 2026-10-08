import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LifeBuoy, Linkedin } from 'lucide-react';
import './credits.css';

const CREATORS = [
  ['Bhagyesh Sagole', 'https://www.linkedin.com/in/bhagyeshsagole/'],
  ['Syed Hassaan Adnan', 'https://www.linkedin.com/in/syed-hassaan-adnan/'],
  ['Pawan Kumar', 'https://www.linkedin.com/in/pawan-kumar-uic/'],
];

// "i" map control: who made Kampuscape and where to get help. Map data
// attribution was removed at the owner's request (OSM licence risk noted in A27).
// Closes on Escape or an outside tap.
export default function Credits() {
  const [open, setOpen] = useState(false), root = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = e => { if (!root.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return <div className="credits" ref={root}>
    <button className="credits-button glass" aria-expanded={open} aria-controls="credits-card" aria-label="About Kampuscape's creators" title="Creators" onClick={() => setOpen(v => !v)}>i</button>
    {open && <section id="credits-card" className="credits-card glass" aria-label="Creators">
      <h2>Made by</h2>
      <ul>{CREATORS.map(([name, href]) => <li key={href}>
        <a href={href} target="_blank" rel="noopener noreferrer"><Linkedin size={15} aria-hidden="true"/><span>{name}</span><ArrowUpRight size={14} aria-hidden="true"/></a>
      </li>)}</ul>
      <a className="credits-support" href={import.meta.env.BASE_URL === '/' ? '/support.html' : '/support'}><LifeBuoy size={15} aria-hidden="true"/><span>Help &amp; reports</span><ArrowUpRight size={14} aria-hidden="true"/></a>
    </section>}
  </div>;
}
