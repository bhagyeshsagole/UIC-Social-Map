import {sharedEvent,shareHtml,shareGoneHtml,shareHeaders,tokenFrom} from '../../../server/eventShare.js';
export async function onRequestGet({request,env,params}){
 const token=tokenFrom(params.token),origin=new URL(request.url).origin;
 if(!token)return new Response(shareGoneHtml(origin),{status:404,headers:{...shareHeaders,'Content-Type':'text/html; charset=utf-8'}});
 // A link with text glued onto it goes to the clean link, so previews and the address bar stay canonical.
 if(token!==params.token)return new Response(null,{status:301,headers:{...shareHeaders,Location:`${origin}/uic/share/${token}`}});
 try{const event=await sharedEvent(token,env);if(!event)return new Response(shareGoneHtml(origin),{status:404,headers:{...shareHeaders,'Content-Type':'text/html; charset=utf-8'}});
 return new Response(shareHtml(event,origin,token),{headers:{...shareHeaders,'Content-Type':'text/html; charset=utf-8'}});
 }catch{return new Response('This event is temporarily unavailable. Please try again.',{status:503,headers:shareHeaders});}
}
