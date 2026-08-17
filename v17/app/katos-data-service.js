import{CURRENT_SCHEMA_VERSION,getLocalBackup,listLocalBackups,loadLocalData,moneyTotals,saveLocalData,validateState}from'./data.js?v=22.1.16-20260817';
import{evaluateToday}from'./logic/evaluate-today.js?v=22.1.16-20260817';

/**
 * Compatibility-first state gateway. It deliberately wraps the current snapshot
 * store instead of requiring each tab to change during Sprint 0.1.
 */
export function createKatOSDataService({storage=localStorage,onPersist=()=>{}}={}){
 let state=loadLocalData(storage);const listeners=new Set();
 const publish=()=>listeners.forEach(listener=>listener(state));
 const persist=next=>{
  const checked=validateState(next);
  if(!checked.ok)return{ok:false,error:'KatOS state must be an object.',issues:checked.issues};
  state={...checked.state,__smUpdatedAt:new Date().toISOString()};
  saveLocalData(state,storage);onPersist(state);publish();return{ok:true,state,issues:checked.issues};
 };
 const dateMatches=(value,date)=>String(value||'')===String(date||'');
 return{
  schemaVersion:CURRENT_SCHEMA_VERSION,
  getState:()=>state,
  validate:input=>validateState(input),
  setState:next=>persist(next),
  updateState:updater=>persist((typeof updater==='function'?updater(state):updater)||state),
  reload:()=>{state=loadLocalData(storage);publish();return state},
  subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener)},
  listBackups:()=>listLocalBackups(storage),
  getBackup:index=>getLocalBackup(storage,index),
  getTasksForDate:date=>(state.tasks||[]).filter(task=>dateMatches(task.date,date)),
  getEventsForDate:date=>(state.events||[]).filter(event=>dateMatches(event.date,date)),
  getCurrentTaskbotState:()=>state.taskbot||{},
  getRoutines:()=>state.routines||[],
  getFinanceSummary:()=>moneyTotals(state.money),
  evaluateToday:context=>evaluateToday(state,context)
 };
}
