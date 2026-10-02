const endpoint=process.env.KATOS_CDP||'http://127.0.0.1:9222';
const targets=await(await fetch(`${endpoint}/json`)).json();
const target=targets.find(row=>row.type==='page'&&row.url.includes('/v6/'))||targets.find(row=>row.type==='page');
if(!target)throw new Error('No Chrome page target is available.');
const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map;let sequence=0;
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
const exceptions=[];
ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails?.text||'Uncaught browser exception');if(message.id&&pending.has(message.id)){const entry=pending.get(message.id);pending.delete(message.id);message.error?entry.reject(new Error(message.error.message)):entry.resolve(message.result)}});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(new Error(`CDP timeout: ${method}`)),15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});ws.send(JSON.stringify({id,method,params}))});
const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1180,height:820,deviceScaleFactor:1,mobile:true,screenWidth:1180,screenHeight:820});
await evaluate('location.reload()');await wait(2000);

async function point(selector){
 const value=await evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)return null;node.scrollIntoView({block:'center',inline:'center'});const r=node.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return{x,y,text:(node.textContent||node.getAttribute('aria-label')||'').trim(),hit:hit?.tagName+'.'+String(hit?.className||''),clear:!!hit&&(node===hit||node.contains(hit))}})()`);
 if(!value)throw new Error(`Missing Career control: ${selector}`);
 if(!value.clear)throw new Error(`Career control is blocked: ${selector} (${value.text}) by ${value.hit}`);
 return value;
}
async function tap(selector){const value=await point(selector);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:value.x,y:value.y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(220);return value}
async function expect(expression,message){if(!await evaluate(expression))throw new Error(message)}
async function expectUnlocked(label){
 const state=await evaluate(`(()=>{const app=document.querySelector('#app'),dock=document.querySelector('[data-palace-dock]');return{body:getComputedStyle(document.body).pointerEvents,app:getComputedStyle(app).pointerEvents,dock:getComputedStyle(dock).pointerEvents,inert:app?.hasAttribute('inert'),native:document.querySelectorAll('[data-v6-native-modal]').length,smart:document.querySelectorAll('[data-smart-modal]').length}})()`);
 if(state.body==='none'||state.app==='none'||state.dock==='none'||state.inert||state.native||state.smart)throw new Error(`${label} left an interaction lock: ${JSON.stringify(state)}`);
}

await tap('[data-palace-dock] [data-v6-nav="boss"]');
await expect(`document.querySelector('.v6-command-room')?.dataset.v6Room==='boss'`,'Crown & Career did not open.');

const nativeCases=[
 ['[data-v6-career-open="session-new"]','career-session'],
 ['[data-v6-career-open="clients"]','career-clients'],
 ['[data-v6-career-open="history"]','career-history'],
 ['[data-v6-career-open="resources"]','career-resources']
];
let nativeChecks=0;
for(const[selector,id]of nativeCases){
 await tap(selector);
 await expect(`document.querySelector('[data-v6-native-modal]')?.dataset.v6NativeModal===${JSON.stringify(id)}`,`${id} did not open from a real touch.`);
 await expect(`(()=>{const d=document.querySelector('[data-v6-native-modal] [role="dialog"]'),r=d?.getBoundingClientRect();return !!r&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()`,`${id} is outside the iPad viewport.`);
 await tap('[data-v6-native-modal] .v6-native-action-body');
 await expect(`!!document.querySelector('[data-v6-native-modal]')`,`${id} disappeared or froze when its popup body was touched.`);
 if(id==='career-session'&&await evaluate(`!!document.querySelector('[data-v6-career-open="client-new"]')`)){
  await tap('[data-v6-career-open="client-new"]');
  await expect(`document.querySelector('[data-v6-native-modal]')?.dataset.v6NativeModal==='career-client'`,'Client alias transition froze inside the session popup.');
  await tap('[data-v6-career-form="client"] input[name="alias"]');
  await send('Input.insertText',{text:`T${Date.now().toString().slice(-4)}`});
  await expect(`document.activeElement?.matches('[data-v6-career-form="client"] input[name="alias"]')`,'The client popup field did not accept touch focus.');
 }
 await tap('[data-v6-native-close]');
 await expectUnlocked(id);
 nativeChecks++;
}

const smartCases=['loop-add','pack-manager','skill-manager'];
let smartChecks=0;
for(const action of smartCases){
 await tap(`[data-smart-action="${action}"]`);
 await expect(`!!document.querySelector('[data-smart-modal]')`,`${action} did not open its Palace popup.`);
 await tap('[data-smart-modal] .v6-smart-modal-body');
 await expect(`!!document.querySelector('[data-smart-modal]')`,`${action} froze when the popup body was touched.`);
 if(action==='loop-add'){
  await tap('[data-smart-modal] input[name="title"]');
  await send('Input.insertText',{text:'Touch QA'});
  await expect(`document.activeElement?.matches('[data-smart-modal] input[name="title"]')`,'The Palace popup field did not accept touch focus.');
 }
 await tap('[data-smart-close]');
 await expectUnlocked(action);
 smartChecks++;
}

await tap('[data-palace-dock] [data-v6-nav="home"]');
await expect(`document.querySelector('.v6-command-room')?.dataset.v6Room==='home'`,'The Dock froze after Career interactions.');
await expectUnlocked('Career exit');
if(exceptions.length)throw new Error(`Browser exceptions during Career touch QA: ${exceptions.join(' | ')}`);
const final=await evaluate(`({build:document.querySelector('meta[name="sm-build"]')?.content,room:document.querySelector('.v6-command-room')?.dataset.v6Room,bodyPointer:getComputedStyle(document.body).pointerEvents,dockPointer:getComputedStyle(document.querySelector('[data-palace-dock]')).pointerEvents})`);
console.log(JSON.stringify({checks:49,nativeChecks,smartChecks,exceptions:exceptions.length,final},null,2));
ws.close();
