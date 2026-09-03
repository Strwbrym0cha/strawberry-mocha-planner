import assert from'node:assert/strict';

class MemoryStorage{
  #items=new Map();
  get length(){return this.#items.size}
  key(index){return [...this.#items.keys()][index]||null}
  getItem(key){return this.#items.has(String(key))?this.#items.get(String(key)):null}
  setItem(key,value){this.#items.set(String(key),String(value))}
  removeItem(key){this.#items.delete(String(key))}
  clear(){this.#items.clear()}
}

globalThis.localStorage=new MemoryStorage();
localStorage.setItem('sm_v4_beta',JSON.stringify({data:{schemaVersion:4,life:{tasks:[{id:'task-1',title:'Keep me safe'}]},v4:{archive:[]},money:{accounts:[]}}}));

const {archiveV5Record,loadV5Ledger,readV4State,restoreV5Record,runV5DailyAction,runV5WorkAction,saveV5LedgerEntry,selectV5DailyShit,selectV5WorkHQ}=await import('./data.js');

const taskArchive=archiveV5Record('life.tasks','task-1');
assert.equal(taskArchive.ok,true);
let state=readV4State();
let archived=state.v4.archive.find(entry=>entry.originalId==='task-1');
assert.equal(state.life.tasks.length,0);
assert.ok(archived);
assert.equal(restoreV5Record(archived.id).ok,true);
state=readV4State();
assert.equal(state.life.tasks.length,1);

assert.equal(runV5DailyAction({type:'quick-add',kind:'task',title:'Persist through V5'}).ok,true);
state=readV4State();
assert.equal(state.life.tasks.some(item=>item.text==='Persist through V5'),true,'Daily Shit writes through the existing V5 planner envelope');
assert.equal(selectV5DailyShit().open.some(item=>item.title==='Persist through V5'),true,'Daily Shit selectors read the same V5 planner state');

let work=selectV5WorkHQ('2026-09-03');
assert.equal(work.hq.career.currentStage,'bt-rlt','Work HQ initializes the protected career baseline');
assert.equal(runV5WorkAction({type:'client-save',alias:'TEST-01',active:true,monday:true,tuesday:true,wednesday:true,thursday:true,sameStart:'09:00',sameEnd:'12:00'}).ok,true);
work=selectV5WorkHQ('2026-09-03');
assert.equal(work.hq.clients.filter(row=>row.alias==='TEST-01').length,1,'Work HQ saves through the existing planner envelope');
selectV5WorkHQ('2026-09-03');
assert.equal(readV4State().work.hq.clients.filter(row=>row.alias==='TEST-01').length,1,'repeated Work HQ initialization stays idempotent');

const savedLedger=saveV5LedgerEntry({kind:'expense',label:'Safe test entry',amount:12,date:'2026-09-03'});
assert.equal(savedLedger.ok,true);
assert.equal(archiveV5Record('v5.ledger',savedLedger.entry.id).ok,true);
assert.equal(loadV5Ledger().entries.length,0);
state=readV4State();
archived=state.v4.archive.find(entry=>entry.originalId===savedLedger.entry.id);
assert.ok(archived);
assert.equal(restoreV5Record(archived.id).ok,true);
assert.equal(loadV5Ledger().entries.length,1);

console.log('V5 reversible archive tests passed');
