import{sanitizePlannerContext}from'./planner-context.js?v=22.1.14-20260817';
import{readSession}from'./storage.js?v=22.1.14-20260817';

const ENDPOINT='https://sigjwmgekmrwehylvuvu.supabase.co/functions/v1/taskbot-ai';
const MAX_MESSAGE_LENGTH=2_000;

const failure=(kind,error)=>({ok:false,kind,error});

/** Sends a read-only, already-sanitized planner snapshot to the Task Bot Edge Function. */
export async function askTaskBot({message,planner,date,signal}={}){
 const text=typeof message==='string'?message.trim():'';
 if(!text||text.length>MAX_MESSAGE_LENGTH)return failure('invalid','Please enter a shorter planner question.');
 const session=readSession();
 if(!session?.access_token)return failure('auth','Please sign in again to ask Task Bot.');
 const context=sanitizePlannerContext(planner,{forDate:date});
 try{
  const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({message:text,context}),signal});
  const payload=await response.json().catch(()=>null);
  if(response.status===401||response.status===403)return failure('auth','Please sign in again to ask Task Bot.');
  if(!response.ok)return failure('provider',typeof payload?.error==='string'?'Task Bot is unavailable right now. Please try again.':'Task Bot is unavailable right now. Please try again.');
  if(!payload||payload.ok!==true||typeof payload.message!=='string'||!payload.message.trim())return failure('malformed','Task Bot returned an unexpected response. Please try again.');
  return{ok:true,message:payload.message.trim()};
 }catch(error){
  if(error?.name==='AbortError')return failure('cancelled','Task Bot took too long. Please try again.');
  return failure('network','Task Bot could not connect right now. Please try again.');
 }
}
