import{updateTask}from'./task-actions.js?v=22.1.27-20260818';

const codesFor=recommendation=>new Set((recommendation?.reasons||[]).map(reason=>reason?.code).filter(Boolean));

/** Returns one conservative, UI-confirmed protection proposal or null. */
export function protectionProposal({intent,recommendation,evaluation,declinedTaskIds=[]}={}){
 const task=recommendation?.task;
 if(!task?.id||task.isProtected===true||task.hardBoundary===true||new Set(declinedTaskIds.map(String)).has(String(task.id)))return null;
 const codes=codesFor(recommendation),explicit=intent==='request_protect_last_recommendation';
 const atRiskDuringFixation=evaluation?.hyperfixation?.active&&(codes.has('deadline_today')||codes.has('overdue')||!codes.has('matches_current_fixation'));
 if(!explicit&&!atRiskDuringFixation)return null;
 return{type:'protect_task',taskId:String(task.id),reason:explicit?'You asked Mochini to keep this recommendation from being casually pushed aside.':'This important task could be displaced while Hyperfixation Mode is active.'};
}

/** Explicitly approved Mochini action: changes only the existing protected flag. */
export function protectTaskFromMochini(store,taskId){
 if(!store||typeof store.get!=='function')return{ok:false,error:'KatOS could not access your planner right now.'};
 const task=(store.get()?.tasks||[]).find(item=>String(item?.id)===String(taskId));
 if(!task)return{ok:false,error:'That task is no longer available, so nothing changed.'};
 if(task.isProtected===true)return{ok:true,task,alreadyProtected:true};
 return updateTask(store,task.id,{isProtected:true});
}
