import {sharedEvent,shareHtml,shareHeaders} from '../../../server/eventShare.js';
export async function onRequestGet({request,env,params}){
 try{const event=await sharedEvent(params.token,env);if(!event)return new Response('This event link has expired or was removed.',{status:404,headers:shareHeaders});
 return new Response(shareHtml(event,new URL(request.url).origin,params.token),{headers:{...shareHeaders,'Content-Type':'text/html; charset=utf-8'}});
 }catch{return new Response('This event is temporarily unavailable. Please try again.',{status:503,headers:shareHeaders});}
}
