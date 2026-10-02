const endpoint=process.env.KATOS_CDP||'http://127.0.0.1:9222';
const targets=await(await fetch(`${endpoint}/json`)).json(),target=targets.find(row=>row.type==='page'&&row.url.includes('/v6/'))||targets.find(row=>row.type==='page');
if(!target)throw new Error('No Chrome page target is available.');
const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map,exceptions=[];let sequence=0;
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails?.exception?.description||message.params.exceptionDetails?.text||'Browser exception');if(message.id&&pending.has(message.id)){const entry=pending.get(message.id);pending.delete(message.id);message.error?entry.reject(new Error(message.error.message)):entry.resolve(message.result)}});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`))},15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});ws.send(JSON.stringify({id,method,params}))});
const evaluate=async expression=>(await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:1180,height:820,deviceScaleFactor:1,mobile:true,screenWidth:1180,screenHeight:820});
await evaluate('location.reload()');await wait(2200);

async function point(selector){
 const value=await evaluate(`(()=>{const visible=node=>{const style=getComputedStyle(node),r=node.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0'&&r.width>0&&r.height>0};const node=[...document.querySelectorAll(${JSON.stringify(selector)})].find(visible);if(!node)return null;node.scrollIntoView({block:'center',inline:'center'});const r=node.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y),style=getComputedStyle(node);return{x,y,label:(node.textContent||node.getAttribute('aria-label')||'').trim().slice(0,80),clear:!!hit&&(node===hit||node.contains(hit)),hit:hit?.tagName+'.'+String(hit?.className||''),pointerEvents:style.pointerEvents,display:style.display,visibility:style.visibility,opacity:style.opacity,connected:node.isConnected,rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom}}})()`);
 if(!value)throw new Error(`Missing control: ${selector}`);
 if(!value.clear)throw new Error(`Blocked control ${selector}: ${JSON.stringify(value)}`);
 return value;
}
async function tap(selector){const value=await point(selector);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:value.x,y:value.y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(180);return value}
async function expect(expression,message){if(!await evaluate(expression))throw new Error(message)}
async function unlocked(label,{allowSurface=false}={}){
 const state=await evaluate(`(()=>{const app=document.querySelector('#app'),dock=document.querySelector('[data-palace-dock]'),surface=document.querySelectorAll('.detail-modal-backdrop:not([hidden]),.v6-room-modal-backdrop:not([hidden]),[data-bell-modal]:not([hidden])').length;return{html:getComputedStyle(document.documentElement).pointerEvents,body:getComputedStyle(document.body).pointerEvents,app:getComputedStyle(app).pointerEvents,dock:getComputedStyle(dock).pointerEvents,inert:app?.hasAttribute('inert'),surface}})()`);
 if(state.html==='none'||state.body==='none'||state.app==='none'||state.dock==='none'||state.inert||(!allowSurface&&state.surface))throw new Error(`${label} interaction state failed: ${JSON.stringify(state)}`);
 return state;
}
async function go(id){
 const direct=await evaluate(`!!document.querySelector('[data-palace-dock] [data-v6-nav="${id}"]')`);
 if(direct)await tap(`[data-palace-dock] [data-v6-nav="${id}"]`);else{await tap('[data-palace-rooms]');await tap(`[data-palace-drawer] [data-v6-nav="${id}"]`)}
}
async function auditButtons(room){
 const result=await evaluate(`(()=>{const root=document.querySelector('.v6-command-room'),buttons=[...root?.querySelectorAll('button:not([disabled])')||[]].filter(node=>{const style=getComputedStyle(node),r=node.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&r.width>0&&r.height>0}),blocked=[],fixedOverlaps=[];for(const button of buttons){const r=button.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;if(r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight)continue;const hit=document.elementFromPoint(x,y);if(hit&&(button===hit||button.contains(hit)))continue;const record={label:(button.textContent||button.getAttribute('aria-label')||'').trim().slice(0,60),hit:hit?.tagName+'.'+String(hit?.className||''),rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom}};(hit?.closest?.('[data-palace-dock],[data-mc-root]')?fixedOverlaps:blocked).push(record)}return{count:buttons.length,blocked,fixedOverlaps,documentWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}})()`);
 if(result.documentWidth>result.viewport+1||result.blocked.length)throw new Error(`${room} button/layout audit failed: ${JSON.stringify(result)}`);
 return result.count;
}

const rooms=[['home','home'],['daily','daily'],['time','time'],['boss','boss'],['carriage-house','carriage'],['hobbies','rose-garden'],['royal-kitchen','royal-kitchen'],['study','study'],['money','money'],['moon-garden','moon-garden'],['love-letters','love-letters'],['wishing-tower','wishing-tower'],['archive','archive'],['royal-archives','royal-archives'],['bell-tower','bell-tower']];
let roomChecks=0,buttonChecks=0;
for(const[id,identity]of rooms){await go(id);await expect(`document.querySelector('.v6-command-room')?.dataset.v6Room===${JSON.stringify(identity)}`,`${id} showed a stale or wrong room.`);await unlocked(id);buttonChecks+=await auditButtons(id);roomChecks++}

await go('settings');await expect(`document.querySelector('[data-v6-native-modal]')?.dataset.v6NativeModal==='palace-settings'`,'Settings is not a working V6 popup.');await tap('[data-v6-native-modal] .v6-palace-settings');await tap('[data-v6-native-close]');await unlocked('Settings close');
await go('mochini');await expect(`document.querySelector('[data-mc-bubble]')?.classList.contains('is-open')`,'Mochini destination did not open the Concierge.');await tap('[data-mc-close]');await unlocked('Mochini close');

const dialogSelector='.detail-modal-backdrop:not([hidden]) [role="dialog"],.v6-room-modal-backdrop:not([hidden]) [role="dialog"],[data-bell-modal]:not([hidden]) [role="dialog"]';
const closeSelector='[data-foyer-win-close],[data-v6-native-close],[data-kitchen-close],[data-room-close],[data-money-close],[data-smart-close],[data-bell-close],[data-flex-shift-close],[data-doordash-shift-close],[data-gig-checkin-close],[data-living-close],.detail-modal-backdrop:not([hidden]) .detail-modal-close';
const modalCases=[
 ['home','[data-foyer-tiny-win]'],['home','[data-smart-action="brain"]'],
 ['daily','[data-v6-duty-open="task-new"]'],['daily','[data-v6-duty-open="routines"]'],['daily','[data-v6-duty-open="medications"]'],
 ['time','[data-v6-calendar-open="event-new"]'],['time','[data-smart-action="calendar-link"]'],
 ['boss','[data-v6-career-open="session-new"]'],['boss','[data-v6-career-open="clients"]'],['boss','[data-v6-career-open="history"]'],['boss','[data-v6-career-open="resources"]'],
 ['carriage-house','[data-money-open="new-gig-goal"]'],['carriage-house','[data-money-open="new-payout"]'],['carriage-house','[data-flex-add]'],['carriage-house','[data-doordash-add]'],
 ...['meal','recipe','build-week','build-meal','batch','prep','leftovers','freezer','use-soon','rotation'].map(kind=>['royal-kitchen',`[data-kitchen-open="${kind}"]`]),
 ['hobbies','[data-room-add]'],['hobbies','[data-bored-open]'],['moon-garden','[data-room-add]'],['love-letters','[data-room-add]'],['wishing-tower','[data-room-add]'],
 ['royal-archives','[data-smart-action="wiki-add"]'],['bell-tower','[data-bell-action="add"]']
];
let popupChecks=0;
for(const[room,opener]of modalCases){
 console.log(`QA popup ${room} ${opener}`);
 await go(room);await tap(opener);await expect(`!!document.querySelector(${JSON.stringify(dialogSelector)})`,`${room} ${opener} did not open a popup.`);await unlocked(`${room} popup`,{allowSurface:true});
 const focusable=await evaluate(`(()=>{const dialog=document.querySelector(${JSON.stringify(dialogSelector)}),node=dialog?.querySelector('input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),select:not([disabled])');if(!node)return'';node.dataset.fullQaFocus='';return'[data-full-qa-focus]'})()`);
 if(focusable){await tap(focusable);await expect(`document.activeElement?.hasAttribute('data-full-qa-focus')`,`${room} ${opener} popup field did not accept touch focus.`)}else await tap(dialogSelector);
 await tap(closeSelector);await unlocked(`${room} ${opener} close`);popupChecks++;
}

await go('home');await unlocked('final Foyer');
if(exceptions.length)throw new Error(`Runtime exceptions found: ${exceptions.join('\n---\n')}`);
const final=await evaluate(`({build:document.querySelector('meta[name="sm-build"]')?.content,room:document.querySelector('.v6-command-room')?.dataset.v6Room,dock:!!document.querySelector('[data-palace-dock]'),modalCount:document.querySelectorAll('.detail-modal-backdrop:not([hidden]),.v6-room-modal-backdrop:not([hidden]),[data-bell-modal]:not([hidden])').length})`);
console.log(JSON.stringify({checks:roomChecks*4+buttonChecks+popupChecks*5+12,rooms:roomChecks,buttons:buttonChecks,popups:popupChecks,exceptions:exceptions.length,final},null,2));
ws.close();
