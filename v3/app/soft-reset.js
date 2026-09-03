export const SOFT_RESET_VERSION=1;
const list=v=>Array.isArray(v)?v:[];const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};const text=v=>String(v??'').trim();const makeId=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const snapshot=c=>{c=object(c);return{brain:text(c.brain),energy:text(c.energy),capacity:text(c.capacity),pressure:text(c.pressure),socialBattery:text(c.socialBattery),mode:text(c.mode)}};
export const RESET_ACTIONS={
  water:{id:'water',icon:'💧',label:'Drink some water',minutes:2},
  surface:{id:'surface',icon:'🧺',label:'Clear one tiny surface',minutes:5},
  sit:{id:'sit',icon:'🌙',label:'Sit somewhere comfortable',minutes:3},
  stretch:{id:'stretch',icon:'🌷',label:'Do a tiny stretch',minutes:5},
  tabs:{id:'tabs',icon:'🫧',label:'Close one source of noise',minutes:2},
  snack:{id:'snack',icon:'🍱',label:'Get an easy Nom',minutes:5},
  breathe:{id:'breathe',icon:'☁️',label:'One quiet minute with no new input',minutes:1}
};
export function buildSoftResetPlan(state={}){const c=object(state.context),chosen=[];const add=id=>{if(!chosen.some(x=>x.id===id))chosen.push(RESET_ACTIONS[id])};if(c.brain==='scattered'){add('tabs');add('surface')}if(c.energy==='drained'){add('sit');add('water')}if(c.capacity==='soft'){add('breathe')}if(c.pressure==='urgent'){add('water');add('tabs')}if(c.mode==='bedtime'){add('stretch');add('sit')}const today=new Date().toISOString().slice(0,10),noms=list(state?.nourish?.noms?.history).filter(x=>x.date===today||String(x.loggedAt||'').startsWith(today));if(!noms.length)add('snack');if(chosen.length<3)add('water');if(chosen.length<3)add('stretch');return chosen.slice(0,3)}
export function normalizeResetSession(v,i=0){v=object(v);return{id:text(v.id)||`reset-${i}`,startedAt:text(v.startedAt)||new Date().toISOString(),before:object(v.before),suggestions:list(v.suggestions).map(String),completedActions:list(v.completedActions).map(String),after:object(v.after),note:text(v.note),completedAt:text(v.completedAt)}}
export function normalizeResetSessions(value){return list(value).map(normalizeResetSession)}
export function startSoftReset(state={}){const suggestions=buildSoftResetPlan(state),session=normalizeResetSession({id:makeId('reset'),startedAt:new Date().toISOString(),before:snapshot(state.context),suggestions:suggestions.map(x=>x.id),completedActions:[]});return session}
export function toggleResetAction(session,id){const s=normalizeResetSession(session),current=new Set(s.completedActions);current.has(id)?current.delete(id):current.add(id);return{...s,completedActions:[...current]}}
export function finishSoftReset(session,afterContext={},note=''){const s=normalizeResetSession(session);return{...s,after:snapshot(afterContext),note:text(note),completedAt:new Date().toISOString()}}
export function resetImproved(session){const s=normalizeResetSession(session),score=v=>({scattered:0,steady:1,'locked-in':2,drained:0,okay:1,energized:2,soft:0,normal:1,big:2,chill:2,some:1,urgent:0}[v]??1);return score(s.after.brain)>score(s.before.brain)||score(s.after.energy)>score(s.before.energy)||score(s.after.pressure)>score(s.before.pressure)}
