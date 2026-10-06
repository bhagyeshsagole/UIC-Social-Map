// iOS 26 Safari only draws page pixels behind its status bar and toolbar when the page has
// scrolled. On phones the app sits below a small top margin and the page is held scrolled
// to that margin, so the map (which bleeds above and below the screen) shows through both bars.
const readPx = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
export const safariBleed = () => ({top: readPx('--safari-top-bleed'), bottom: readPx('--safari-bottom-bleed')});

export function keepSafariRunway() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  let frame, tries = 0;
  // A resize can fire before the taller phone layout exists, which clamps the scroll; retry for a few frames.
  const settle = () => {
    const offset = readPx('--safari-top-bleed');
    if (!offset) return;
    const active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
    if (Math.abs(window.scrollY - offset) > 0.5 || window.scrollX) window.scrollTo({top: offset, left: 0, behavior: 'instant'});
    if (Math.abs(window.scrollY - offset) > 0.5 && tries++ < 20) frame = requestAnimationFrame(settle);
  };
  const schedule = () => { cancelAnimationFrame(frame); tries = 0; frame = requestAnimationFrame(settle); };
  const grow = new ResizeObserver(schedule); grow.observe(document.body);
  settle(); schedule(); const late = setTimeout(settle, 400);
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  document.addEventListener('focusout', schedule);
  return () => { grow.disconnect(); cancelAnimationFrame(frame); clearTimeout(late); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); window.removeEventListener('orientationchange', schedule); document.removeEventListener('focusout', schedule); };
}
