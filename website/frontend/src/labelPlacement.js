// Fit one active name box beside its pin, preferring space clear of other pins.
export function placeLabel(anchor,size,view,obstacles=[],gaps=[10,36,64]){
 const width=size.width,height=size.height,centerX=(anchor.left+anchor.right)/2,centerY=(anchor.top+anchor.bottom)/2;
 const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
 const candidates=gaps.flatMap(gap=>[
  [anchor.right+gap,centerY-height/2],[anchor.left-gap-width,centerY-height/2],
  [centerX-width/2,anchor.top-gap-height],[centerX-width/2,anchor.bottom+gap]
 ]).map(([x,y],index)=>{
  const left=clamp(x,view.left+8,view.right-width-8),top=clamp(y,view.top+8,view.bottom-height-8);
  const right=left+width,bottom=top+height;
  const area=obstacles.reduce((sum,b)=>sum+Math.max(0,Math.min(right,b.right+5)-Math.max(left,b.left-5))*Math.max(0,Math.min(bottom,b.bottom+5)-Math.max(top,b.top-5)),0);
  return {left,top,score:area*100+index};
 });
 candidates.sort((a,b)=>a.score-b.score);return candidates[0];
}
