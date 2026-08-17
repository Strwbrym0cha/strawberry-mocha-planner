import{localDateKey}from'../data.js?v=22.1.19-20260817';
import{minutesUntil,nextTimedEvent}from'./events.js?v=22.1.19-20260817';

const list=value=>Array.isArray(value)?value:[];
export const taskTitle=task=>task?.text||task?.title||'Untitled task';
export const effortRank=value=>({Low:1,Medium:2,High:3}[value]||1);
export const tasksForDate=(state,date=localDateKey())=>list(state?.tasks).filter(task=>task?.date===date);
export const openTasksForDate=(state,date=localDateKey())=>tasksForDate(state,date).filter(task=>!task?.done);
export const parkedTasks=state=>list(state?.tasks).filter(task=>!!task?.parked);
export const hardBoundaryTasks=state=>list(state?.tasks).filter(task=>!!task?.hardBoundary);
export const unavailableTasksForDate=(state,date=localDateKey())=>list(state?.tasks).filter(task=>Array.isArray(task?.unavailableOn)&&task.unavailableOn.includes(date));

export function taskEligibility(state,task,date=localDateKey(),{now=new Date(),capacity=state?.taskbot?.capacity||'High'}={}){
 const reasons=[];if(task?.date!==date)reasons.push({code:'not_assigned_today'});if(task?.done)reasons.push({code:'completed'});if(task?.parked)reasons.push({code:'parked'});if(task?.hardBoundary)reasons.push({code:'hard_boundary'});if(Array.isArray(task?.unavailableOn)&&task.unavailableOn.includes(date))reasons.push({code:'unavailable_today'});
 if(effortRank(task?.effort)>effortRank(capacity))reasons.push({code:'capacity_incompatible'});
 const next=nextTimedEvent(state,date,{now}),free=next?minutesUntil(next.start,{now}):Infinity,duration=Number(task?.durationMin)||0;
 if(duration>free)reasons.push({code:'does_not_fit_before_fixed_event',eventId:next?.id||null});
 return{eligible:reasons.length===0,reasons,nextFixedEvent:next,availableMinutes:free};
}
export function eligibleTasks(state,date=localDateKey(),context={}){return tasksForDate(state,date).filter(task=>taskEligibility(state,task,date,context).eligible)}
export{minutesUntil,nextTimedEvent as nextFixedEvent};
