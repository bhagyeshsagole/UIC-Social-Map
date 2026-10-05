import clipping from 'polygon-clipping';
const bounds = rings => {
 const points=rings.flat();return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
};
const overlap=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
function sharedWall(a,b){
 let length=0;
 for(const ar of a)for(let i=1;i<ar.length;i++){
  const [x,y]=ar[i-1],dx=ar[i][0]-x,dy=ar[i][1]-y,len=Math.hypot(dx,dy);if(!len)continue;
  for(const br of b)for(let j=1;j<br.length;j++){
   const p=br[j-1],q=br[j];
   if(Math.abs(dx*(p[1]-y)-dy*(p[0]-x))/len>0.1||Math.abs(dx*(q[1]-y)-dy*(q[0]-x))/len>0.1)continue;
   const u=((p[0]-x)*dx+(p[1]-y)*dy)/len,v=((q[0]-x)*dx+(q[1]-y)*dy)/len;
   length+=Math.max(0,Math.min(len,Math.max(u,v))-Math.max(0,Math.min(u,v)));
  }
 }
 return length>2;
}
export const area=polygons=>polygons.reduce((total,polygon)=>total+polygon.reduce((sum,ring,i)=>sum+(i?-1:1)*Math.abs(ring.reduce((a,p,j)=>{const q=ring[(j+1)%ring.length];return a+p[0]*q[1]-q[0]*p[1];},0)/2),0),0);
export function cleanCampusParts(parts){
 // An official map point often hits only one roof of a multipart building.
 // Propagate affiliation through overlapping parts or shared walls, never across a gap.
 const indexed=parts.map(p=>({...p,bounds:bounds(p.rings)}));
 const queue=indexed.filter(p=>p.uic);
 for(let i=0;i<queue.length;i++)for(const p of indexed){
  if(p.uic||!overlap(p.bounds,queue[i].bounds))continue;
  if(area(clipping.intersection(p.rings,queue[i].rings))>0.5||sharedWall(p.rings,queue[i].rings)){p.uic=true;queue.push(p);}
 }
 const heights=new Map();
 for(const p of queue){const height=Math.max(7,p.properties.render_height||7);if(!heights.has(height))heights.set(height,[]);heights.get(height).push(p.rings);}
 // Merge coplanar roofs and subtract taller volumes from lower ones. This
 // creates one non-overlapping stepped solid instead of interleaved shells.
 const result=indexed.filter(p=>!p.uic);let occupied=[];
 for(const height of [...heights.keys()].sort((a,b)=>b-a)){
  const merged=clipping.union(...heights.get(height));
  const exposed=occupied.length?clipping.difference(merged,occupied):merged;
  for(const rings of exposed)result.push({rings,uic:true,properties:{render_height:height,render_min_height:0}});
  occupied=occupied.length?clipping.union(occupied,merged):merged;
 }
 return result;
}
