// Fit one active name box beside its pin, preferring space clear of other pins and, when a building
// mask is given, street or open ground over rooftops. Returns the box and how much of it covers buildings.
export function placeLabel(anchor,size,view,obstacles=[],gaps=[10,36,64],cover=null){
 const width=size.width,height=size.height,centerX=(anchor.left+anchor.right)/2,centerY=(anchor.top+anchor.bottom)/2;
 const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
 const candidates=gaps.flatMap(gap=>[
  [anchor.right+gap,centerY-height/2],[anchor.left-gap-width,centerY-height/2],
  [centerX-width/2,anchor.top-gap-height],[centerX-width/2,anchor.bottom+gap],
  // Corners come last: still touching the dot, they find street room when every side is a rooftop.
  [anchor.right+gap/2,anchor.top-height+4],[anchor.right+gap/2,anchor.bottom-4],[anchor.left-gap/2-width,anchor.top-height+4],[anchor.left-gap/2-width,anchor.bottom-4]
 ]).map(([x,y],index)=>{
  const left=clamp(x,view.left+8,view.right-width-8),top=clamp(y,view.top+8,view.bottom-height-8);
  const right=left+width,bottom=top+height;
  const area=obstacles.reduce((sum,b)=>sum+Math.max(0,Math.min(right,b.right+5)-Math.max(left,b.left-5))*Math.max(0,Math.min(bottom,b.bottom+5)-Math.max(top,b.top-5)),0);
  // Other pins and controls always win; then the side with the least rooftop under it; then right, left, above, below.
  const roof=cover?cover({left,top,right,bottom}):0;
  return {left,top,roof,score:area*100+roof*5000+index};
 });
 candidates.sort((a,b)=>a.score-b.score);return candidates[0];
}

// The flat map layers (ground, roads, road casings, parks, water) are drawn in a handful of known colours
// with no lighting; lit 3D buildings never match them. A pixel is ground when it sits on one of those
// colours or on the blend between two of them (anti-aliased edges, faded paths). Anything else is a building.
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
export function groundTest(palette,tolerance=14){
 const colors=palette.map(c=>typeof c==='string'?hex(c):c),segments=[];
 for(let i=0;i<colors.length;i++)for(let j=i+1;j<colors.length;j++)segments.push([colors[i],colors[j]]);
 const limit=tolerance*tolerance;
 return (r,g,b)=>segments.some(([a,c])=>{
  const dx=c[0]-a[0],dy=c[1]-a[1],dz=c[2]-a[2],len=dx*dx+dy*dy+dz*dz;
  const t=len?Math.max(0,Math.min(1,((r-a[0])*dx+(g-a[1])*dy+(b-a[2])*dz)/len)):0;
  const ex=r-a[0]-t*dx,ey=g-a[1]-t*dy,ez=b-a[2]-t*dz;return ex*ex+ey*ey+ez*ez<=limit;
 });
}

// Building mask from a downscaled copy of the map canvas, with a summed-area table so the share of
// building pixels under any screen box is four lookups. `rect` is the canvas's on-screen box.
export function buildingMask(pixels,width,height,rect,isGround){
 const sums=new Uint32Array((width+1)*(height+1)),seen=new globalThis.Map();
 const ground=(r,g,b)=>{const key=(r<<16)|(g<<8)|b;let v=seen.get(key);if(v===undefined){v=isGround(r,g,b);seen.set(key,v);}return v;};
 for(let y=0;y<height;y++){let row=0;for(let x=0;x<width;x++){const i=(y*width+x)*4;if(pixels[i+3]&&!ground(pixels[i],pixels[i+1],pixels[i+2]))row++;sums[(y+1)*(width+1)+x+1]=sums[y*(width+1)+x+1]+row;}}
 const sx=width/rect.width,sy=height/rect.height;
 return box=>{
  const x0=Math.max(0,Math.min(width,Math.floor((box.left-rect.left)*sx))),x1=Math.max(0,Math.min(width,Math.ceil((box.right-rect.left)*sx)));
  const y0=Math.max(0,Math.min(height,Math.floor((box.top-rect.top)*sy))),y1=Math.max(0,Math.min(height,Math.ceil((box.bottom-rect.top)*sy)));
  const cells=(x1-x0)*(y1-y0);if(cells<=0)return 0;
  const at=(x,y)=>sums[y*(width+1)+x];
  return (at(x1,y1)-at(x0,y1)-at(x1,y0)+at(x0,y0))/cells;
 };
}
