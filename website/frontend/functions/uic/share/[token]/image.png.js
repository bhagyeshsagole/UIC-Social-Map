import {Resvg,initWasm} from '@resvg/resvg-wasm';
import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import {sharedEvent,shareSvg,shareHeaders,tokenFrom} from '../../../../server/eventShare.js';
let ready;
export async function onRequestGet({request,env,params}){
 try{
  const event=await sharedEvent(tokenFrom(params.token)||'',env);if(!event)return new Response('Event unavailable',{status:404,headers:shareHeaders});
  if(!ready)ready=initWasm(wasm).catch(e=>{ready=null;throw e;});await ready;
  const font=await env.ASSETS.fetch(new Request(new URL('/uic/fonts/inter-share.ttf',request.url)));
  if(!font.ok)throw new Error('Font unavailable');
  const renderer=new Resvg(shareSvg(event),{font:{fontBuffers:[new Uint8Array(await font.arrayBuffer())],defaultFontFamily:'Inter'}});
  let rendered;try{rendered=renderer.render();return new Response(rendered.asPng(),{headers:{...shareHeaders,'Content-Type':'image/png'}});}finally{rendered?.free();renderer.free();}
 }catch{return new Response('Preview temporarily unavailable',{status:503,headers:shareHeaders});}
}
