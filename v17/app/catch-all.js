const clean=value=>String(value??'').trim();
const makeId=()=>`capture_${globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`}`;
const titleFor=text=>clean(text).replace(/\s+/g,' ').slice(0,64)||'Quick capture';

/** Catch-All deliberately reuses Brain Dump records instead of creating a second inbox. */
export function quickCapture(store,text){
 const body=clean(text);if(!body)return{ok:false,error:'Write a little something to capture first.'};
 const now=new Date().toISOString(),item={id:makeId(),title:titleFor(body),text:body,createdAt:now,updatedAt:now};
 store.update(state=>({...state,brain:'',brainNotes:[...(Array.isArray(state.brainNotes)?state.brainNotes:[]),item]}));
 return{ok:true,item};
}

export const recentCaptures=(state,limit=3)=>(Array.isArray(state?.brainNotes)?state.brainNotes:[])
 .slice().sort((left,right)=>String(right.updatedAt||right.createdAt||'').localeCompare(String(left.updatedAt||left.createdAt||''))).slice(0,limit);
