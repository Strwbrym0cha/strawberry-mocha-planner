const endpoint=process.env.KATOS_CDP||'http://127.0.0.1:9222';
const targets=await(await fetch(`${endpoint}/json`)).json();
const target=targets.find(row=>row.type==='page'&&row.url.includes('/v6/'))||targets.find(row=>row.type==='page');
if(!target)throw new Error('No Chrome page target is available.');
const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map;let sequence=0;
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const entry=pending.get(message.id);pending.delete(message.id);message.error?entry.reject(new Error(message.error.message)):entry.resolve(message.result)}});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(new Error(`CDP timeout: ${method}`)),15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});ws.send(JSON.stringify({id,method,params}))});
const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await send('Emulation.setDeviceMetricsOverride',{width:1180,height:820,deviceScaleFactor:1,mobile:true,screenWidth:1180,screenHeight:820});
await evaluate('location.reload()');await wait(1800);

async function point(selector){
 const value=await evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)return null;node.scrollIntoView({block:'center',inline:'center'});const r=node.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return{x,y,text:(node.textContent||node.getAttribute('aria-label')||'').trim(),hit:hit?.tagName+'.'+String(hit?.className||''),clear:!!hit&&(node===hit||node.contains(hit))}})()`);
 if(!value)throw new Error(`Missing control: ${selector}`);
 if(!value.clear)throw new Error(`Control is blocked: ${selector} (${value.text}) by ${value.hit}`);
 return value;
}
async function tap(selector){const value=await point(selector);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:value.x,y:value.y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(180);return value}
async function tapThroughBlocker(selector){const value=await evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)return null;const r=node.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);if(!value)throw new Error(`Missing blocked control: ${selector}`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:value.x,y:value.y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(220)}
async function expect(expression,message){if(!await evaluate(expression))throw new Error(message)}

await tap('[data-palace-dock] [data-v6-nav="daily"]');
await expect(`document.querySelector('.v6-command-room')?.dataset.v6Room==='daily'`,'Duties did not open from a real touch.');
await tap('[data-v6-duty-open="task-new"]');
await expect(`!!document.querySelector('[data-v6-native-modal]')`,'Duties modal did not open.');
await tap('[data-v6-native-close]');
await expect(`!document.querySelector('[data-v6-native-modal]')`,'Duties modal backdrop remained after close.');

await evaluate(`(()=>{const stale=document.createElement('div');stale.className='detail-modal-backdrop';stale.dataset.qaStale='';stale.style.position='fixed';stale.style.inset='0';stale.style.zIndex='9999';document.body.append(stale);window.dispatchEvent(new Event('pageshow'))})()`);await wait(180);
await expect(`!document.querySelector('[data-qa-stale]')`,'Orphan body-level backdrop was not recovered.');

await tap('[data-palace-dock] [data-v6-nav="time"]');
await expect(`document.querySelector('.v6-command-room')?.dataset.v6Room==='time'`,'Calendar did not open after modal cleanup.');
await tap('[data-v6-calendar-open="event-new"]');
await expect(`!!document.querySelector('[data-v6-native-modal]')`,'Calendar modal did not open.');
await tap('[data-v6-native-close]');
await evaluate(`(()=>{const leftover=document.createElement('div');leftover.className='detail-modal-backdrop';leftover.dataset.qaLeftover='';leftover.style.zIndex='1000';leftover.innerHTML='<section class="detail-modal" role="dialog"><button>Old popup</button></section>';document.body.append(leftover)})()`);await wait(100);
await tapThroughBlocker('[data-palace-dock] [data-v6-nav="boss"]');
await expect(`document.querySelector('.v6-command-room')?.dataset.v6Room==='boss'`,'Career did not open.');
await expect(`!document.querySelector('[data-qa-leftover]')`,'Room navigation left an old modal over Career.');
await tap('[data-v6-career-open="session-new"]');
await expect(`!!document.querySelector('[data-v6-native-modal]')`,'Career modal did not open.');
await tap('[data-v6-native-close]');
await evaluate(`document.body.style.pointerEvents='none';document.dispatchEvent(new Event('touchstart',{bubbles:true}))`);await wait(100);
await expect(`getComputedStyle(document.body).pointerEvents!=='none'`,'Touch-start recovery did not release a global pointer lock.');
await tap('[data-palace-dock] [data-v6-nav="carriage-house"]');
await expect(`document.querySelector('.v6-command-room')?.dataset.v6Room==='carriage'`,'Carriage House did not open.');
await tap('[data-palace-rooms]');
await expect(`!!document.querySelector('[data-palace-drawer]:not([hidden])')`,'Rooms drawer did not open.');
await tap('[data-palace-rooms-close]');
await expect(`!document.querySelector('[data-palace-drawer]:not([hidden])')`,'Rooms drawer remained after close.');

const final=await evaluate(`({build:document.querySelector('meta[name="sm-build"]')?.content,modalCount:document.querySelectorAll('.detail-modal-backdrop:not([hidden])').length,bodyPointer:getComputedStyle(document.body).pointerEvents,appPointer:getComputedStyle(document.querySelector('#app')).pointerEvents,dockPointer:getComputedStyle(document.querySelector('[data-palace-dock]')).pointerEvents})`);
if(final.modalCount||final.bodyPointer==='none'||final.appPointer==='none'||final.dockPointer==='none')throw new Error(`Interaction locks remain: ${JSON.stringify(final)}`);
console.log(JSON.stringify({checks:22,rooms:['daily','time','boss','carriage'],orphanBackdropRecovered:true,navigationBackdropRecovered:true,touchLockRecovered:true,final},null,2));
ws.close();
