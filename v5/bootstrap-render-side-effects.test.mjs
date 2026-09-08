import assert from'node:assert/strict';

const PLANNER_KEYS=new Set(['sm_v4_beta','sm_v5_data','sm_v5_money_ledger','sm_v5_detailed_daily_notes','sm_v5_room_details','katos-v5-spending-budgets']);
const protectedKey=key=>key==='*'||PLANNER_KEYS.has(String(key))||/(backup|before|restore|recovery|cloud-pull|preimport)/i.test(String(key));
class RecordingStorage{
  constructor(values={}){this.values=new Map(Object.entries(values).map(([key,value])=>[String(key),String(value)]));this.calls=[]}
  get length(){return this.values.size}
  key(index){return[...this.values.keys()][index]??null}
  getItem(key){return this.values.has(String(key))?this.values.get(String(key)):null}
  setItem(key,value){this.calls.push({method:'setItem',key:String(key)});this.values.set(String(key),String(value))}
  removeItem(key){this.calls.push({method:'removeItem',key:String(key)});this.values.delete(String(key))}
  clear(){this.calls.push({method:'clear',key:'*'});this.values.clear()}
}

const fixture={schemaVersion:5,life:{tasks:[{id:'safe-task',title:'Safe task'}],reminders:[],routines:[],routineInstances:[],events:[]},work:{},education:{},money:{},v4:{archive:[]},mochini:{life:{mood:'content',energy:70}}};
globalThis.Storage=RecordingStorage;
globalThis.localStorage=new RecordingStorage({sm_recovery_lock:'1',sm_v4_beta:JSON.stringify({data:fixture}),sm_v5_data:JSON.stringify(fixture),sm_v4_beta_before_restore_1:'keep-me'});
globalThis.sessionStorage=new RecordingStorage();

const listeners=new Map(),timers=[];
const fakeNode=()=>({
  style:{},dataset:{},classList:{add:()=>{},remove:()=>{},toggle:()=>{},contains:()=>false},hidden:false,innerHTML:'',textContent:'',content:{firstElementChild:null},
  append:()=>{},appendChild:()=>{},prepend:()=>{},remove:()=>{},setAttribute:()=>{},getAttribute:()=>null,insertAdjacentHTML:()=>{},insertAdjacentElement:()=>{},insertBefore:()=>{},
  querySelector:()=>null,querySelectorAll:()=>[],closest:()=>null,contains:()=>true,focus:()=>{},click:()=>{},select:()=>{}
});
const app=fakeNode();
app.addEventListener=(type,handler)=>{const rows=listeners.get(type)||[];rows.push(handler);listeners.set(type,rows)};
const body=fakeNode(),head=fakeNode();
globalThis.document={
  body,head,readyState:'complete',hidden:false,visibilityState:'visible',
  getElementById:id=>id==='app'?app:null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>fakeNode(),addEventListener:()=>{},execCommand:()=>true
};
globalThis.window={addEventListener:()=>{},dispatchEvent:()=>{},confirm:()=>false,alert:()=>{},matchMedia:()=>({matches:false})};
globalThis.Event=class{constructor(type){this.type=type}};
globalThis.CustomEvent=class extends Event{constructor(type,options={}){super(type);this.detail=options.detail}};
globalThis.MutationObserver=class{observe(){}disconnect(){}};
globalThis.IntersectionObserver=class{observe(){}disconnect(){}};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
globalThis.CSS={escape:value=>String(value)};
globalThis.Image=class{set src(value){this._src=value;queueMicrotask(()=>this.onload?.())}get src(){return this._src}};
globalThis.requestAnimationFrame=callback=>{timers.push({callback,delay:16});return timers.length};
globalThis.cancelAnimationFrame=()=>{};
globalThis.setTimeout=(callback,delay=0)=>{timers.push({callback,delay:Number(delay)||0});return timers.length};
globalThis.clearTimeout=()=>{};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'iPad',platform:'iPad',maxTouchPoints:5,standalone:true,onLine:true,clipboard:{writeText:async()=>{}},storage:{estimate:async()=>({usage:1000,quota:100000})}}});
globalThis.matchMedia=()=>({matches:false});
globalThis.location={reload:()=>{}};

await import('./bootstrap.js?bootstrap-render-side-effects-test');
await import('./monthly-bills-summary.js?bootstrap-render-side-effects-test');

// Exercise each one-shot startup callback (including the former Mochini
// autonomy write at 1.2 seconds), but do not execute recurring long timers.
for(const timer of timers.filter(item=>item.delay<=1500).slice())await timer.callback();

const protectedCalls=localStorage.calls.filter(call=>protectedKey(call.key));
assert.deepEqual(protectedCalls,[],'the complete recovery bootstrap and one-shot startup callbacks do not write, remove, or clear planner/recovery storage');
assert.equal(localStorage.getItem('sm_v4_beta_before_restore_1'),'keep-me','startup preserves recovery copies');
console.log('V5 recovery bootstrap performs zero planner/recovery writes');
