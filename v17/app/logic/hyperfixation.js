import{hardBoundaryTasks,taskTitle}from'./tasks.js?v=22.1.19-20260817';

const list=value=>Array.isArray(value)?value:[];
const same=(left,right)=>String(left??'')===String(right??'');
const activeSession=state=>state?.hyperfixation?.active?state.hyperfixation:null;

function linkedLabel(state,session){
 if(!session)return null;
 if(session.focusType==='task')return list(state?.tasks).find(item=>same(item.id,session.focusId))?.text||list(state?.tasks).find(item=>same(item.id,session.focusId))?.title||session.focusLabel;
 if(session.focusType==='project')return list(state?.projects).find(item=>same(item.id,session.focusId))?.name||session.focusLabel;
 if(session.focusType==='goal')return list(state?.goals).find(item=>same(item.id,session.focusId))?.name||list(state?.goals).find(item=>same(item.id,session.focusId))?.title||session.focusLabel;
 return session.focusLabel;
}

export function hyperfixationStatus(state={}){
 const session=activeSession(state);if(!session)return{active:false,focus:null,hardBoundaries:[]};
 const project=session.focusType==='project'?list(state.projects).find(item=>same(item.id,session.focusId)):null,goal=session.focusType==='goal'?list(state.goals).find(item=>same(item.id,session.focusId)):null;
 return{active:true,focus:{type:session.focusType,id:session.focusId,label:linkedLabel(state,session)||'Current fixation',intention:session.intention||null,startedAt:session.startedAt||null,nextStep:project?.nextStep||project?.currentObjective||goal?.nextStep||goal?.currentObjective||null},hardBoundaries:hardBoundaryTasks(state).filter(task=>!task.done).map(task=>({id:task.id,title:taskTitle(task),dueDate:task.dueDate||null}))};
}

export function isFocusRelatedTask(task,status){
 if(!status?.active||!task)return false;
 if(status.focus.type==='task')return same(task.id,status.focus.id);
 if(status.focus.type==='project')return same(task.sourceProject,status.focus.id)||same(task.projectId,status.focus.id);
 if(status.focus.type==='goal')return same(task.sourceGoal,status.focus.id)||same(task.goalId,status.focus.id);
 return false;
}

/** Filters only an already-eligible candidate list. It never bypasses safety rules. */
export function focusBiasedCandidates(candidates=[],status={active:false}){const related=list(candidates).filter(task=>isFocusRelatedTask(task,status));return related.length?related:list(candidates)}
