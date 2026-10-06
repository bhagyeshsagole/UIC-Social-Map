import clipping from 'polygon-clipping';
export function inside(point, ring) {
  const [x,y] = point;
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi,yi] = ring[i], [xj,yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj-xi)*(y-yi)/(yj-yi)+xi) result = !result;
  }
  return result;
}
export function polygonDistance(point, polygon) {
  if (inside(point, polygon[0]) && !polygon.slice(1).some(r => inside(point,r))) return 0;
  const sx = 111320 * Math.cos(point[1] * Math.PI / 180), sy = 111320;
  let best = Infinity;
  for (const ring of polygon) for (let i = 1; i < ring.length; i++) {
    const a = [(ring[i-1][0]-point[0])*sx,(ring[i-1][1]-point[1])*sy], b = [(ring[i][0]-point[0])*sx,(ring[i][1]-point[1])*sy];
    const dx=b[0]-a[0], dy=b[1]-a[1], t=Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/(dx*dx+dy*dy||1)));
    best=Math.min(best,Math.hypot(a[0]+t*dx,a[1]+t*dy));
  }
  return best;
}
export function bounds(polygon) {
  const ring=polygon[0];
  return [Math.min(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[1]))];
}
export const overlaps=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
// Union roofs for matching only. Original stepped solids stay untouched in tiles.
export function matchFootprint(point, polygons) {
  const nearby=polygons.filter(p=>polygonDistance(point,p)<=200);
  if(!nearby.length)return null;
  const united=clipping.union(...nearby);
  const ranked=united.map(p=>({polygon:p,distance:polygonDistance(point,p)})).sort((a,b)=>a.distance-b.distance);
  // A courtyard/stadium may put the official point inside the roof's central hole.
  const enclosed=ranked.find(p=>inside(point,p.polygon[0]));
  return enclosed || (ranked[0].distance<=35 ? ranked[0] : null);
}
