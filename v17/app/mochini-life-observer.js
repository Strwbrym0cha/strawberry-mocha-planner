import{reactToMochiniEvent}from'./mochini-life.js?v=22.3.0-20260823';
const list=value=>Array.isArray(value)?value:[];
const completedTasks=state=>new Set(list(state?.tasks).filter(task=>task?.done).map(task=>String(task.id)));
const completedRoutineSteps=state=>list(state?.routines).reduce((sum,routine)=>sum+Object.values(routine?.checks||{}).reduce((dayTotal,checks)=>dayTotal+Object.values(checks||{}).filter(value=>value===true||value==='complete').length,0),0);
const remainingTasks=state=>list(state?.tasks).filter(task=>!task?.done).length;
/** Observes completed work after the owning task/routine action has persisted it. */
export function installMochiniLifeObserver(store){let previous=store.get(),writing=false;return store.subscribe(next=>{if(writing){previous=next;writing=false;return}const beforeTasks=completedTasks(previous),afterTasks=completedTasks(next),newTask=[...afterTasks].some(id=>!beforeTasks.has(id)),newRoutine=completedRoutineSteps(next)>completedRoutineSteps(previous);previous=next;if(!newTask&&!newRoutine)return;const event=newRoutine?'routineComplete':'taskComplete',reaction=reactToMochiniEvent(next.mochini?.life,event,{allTasksComplete:newTask&&remainingTasks(next)===0});writing=true;store.update(state=>({...state,mochini:{...(state.mochini||{}),life:reaction.life}}))})}
