import{mkdir,writeFile}from'node:fs/promises';
import{join}from'node:path';
import{tmpdir}from'node:os';

const endpoint=process.env.KATOS_CDP||'http://127.0.0.1:9333',out=join(tmpdir(),'katos-v6-room-layout-qa');
await mkdir(out,{recursive:true});
const targets=await(await fetch(`${endpoint}/json`)).json(),target=targets.find(row=>row.type==='page');
if(!target)throw new Error('No Chrome page target is available.');
const ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map;let sequence=0;
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const{resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result)}});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`))},15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});ws.send(JSON.stringify({id,method,params}))});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const evaluate=async expression=>(await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
await wait(1200);
const ready=await evaluate(`document.querySelector('#app')&&!document.querySelector('#app').classList.contains('loading')`);if(!ready)throw new Error('V6 did not finish loading.');
await evaluate(`localStorage.removeItem('katos_v6_new_rooms_v1');location.reload()`);await wait(3500);

const rooms=[
 ['home','.v6-foyer-primary'],['daily','.v6-duty-main'],['time','.v6-calendar-primary'],['bell-tower','.v6-bell-layout'],['boss','.v6-career-layout'],['carriage-house','.v6-carriage-layout'],['study','.v6-scholar-columns'],['money','.v6-treasury-band'],['hobbies','.v6-rose-board'],['moon-garden','.v6-moon-flow'],['love-letters','.v6-love-home'],['wishing-tower','.v6-wish-horizon'],['archive','.v6-memory-shelf'],['royal-archives','.v6-archive-library']
];
const sizes=[['landscape',1180,820],['portrait',820,1180]],results=[];
for(const[size,width,height]of sizes){
 console.log(`QA ${size} ${width}x${height}`);
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 for(const[id,selector]of rooms){
  console.log(`  ${id}`);
  const opened=await evaluate(`(()=>{let button=document.querySelector('[data-palace-dock] [data-v6-nav="${id}"]');if(!button){document.querySelector('[data-palace-rooms]')?.click();button=document.querySelector('[data-palace-drawer] [data-v6-nav="${id}"]')}if(!button)return false;button.click();return true})()`);if(!opened)throw new Error(`Missing navigation button: ${id}`);await wait(300);
  const metrics=await evaluate(`(()=>{const room=document.querySelector('.v6-command-room'),region=document.querySelector('${selector}'),main=document.querySelector('.main'),dock=document.querySelector('[data-palace-dock]'),sidebar=document.querySelector('.sidebar'),viewport=document.documentElement.clientWidth,offenders=[...document.querySelectorAll('body *')].map(node=>{const r=node.getBoundingClientRect();return{node:node.tagName+'.'+String(node.className||'').split(' ').slice(0,2).join('.'),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),scroll:node.scrollWidth,client:node.clientWidth}}).filter(row=>row.right>viewport+1||row.left<-1||row.scroll>row.client+4).sort((a,b)=>Math.max(b.right-viewport,b.scroll-b.client)-Math.max(a.right-viewport,a.scroll-a.client)).slice(0,8);return{room:room?.dataset.v6Room||'',region:!!region,documentWidth:document.documentElement.scrollWidth,viewport,mainWidth:Math.round(main?.getBoundingClientRect().width||0),roomWidth:Math.round(room?.getBoundingClientRect().width||0),regionWidth:Math.round(region?.getBoundingClientRect().width||0),dockVisible:!!dock&&getComputedStyle(dock).display!=='none',sidebarHidden:!!sidebar&&getComputedStyle(sidebar).display==='none',offenders}})()`);
  results.push({size,id,...metrics});
  if(!metrics.region)throw new Error(`${size} ${id}: missing ${selector}`);
  if(metrics.documentWidth>metrics.viewport+1)throw new Error(`${size} ${id}: horizontal overflow ${metrics.documentWidth}/${metrics.viewport} ${JSON.stringify(metrics.offenders)}`);
  if(!metrics.dockVisible||!metrics.sidebarHidden)throw new Error(`${size} ${id}: dock/sidebar navigation state is wrong.`);
  if(metrics.roomWidth<Math.min(480,metrics.mainWidth*.78))throw new Error(`${size} ${id}: room does not use the content canvas (${metrics.roomWidth}/${metrics.mainWidth})`);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(out,`${size}-${id}.png`),Buffer.from(shot.data,'base64'));
 }
}

await send('Emulation.setDeviceMetricsOverride',{width:1180,height:820,deviceScaleFactor:1,mobile:false});
await evaluate(`document.querySelector('[data-palace-rooms]')?.click()`);await wait(100);
const drawerState=await evaluate(`(()=>{const drawer=document.querySelector('.palace-rooms-drawer'),r=drawer?.getBoundingClientRect(),labels=[...drawer?.querySelectorAll('[data-v6-nav]')||[]].map(node=>node.dataset.v6Nav);return{exists:!!drawer&&!drawer.closest('[hidden]'),inside:!!r&&r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,labels}})()`);
if(!drawerState.exists||!drawerState.inside||!['study','money','moon-garden','love-letters','wishing-tower','archive','royal-archives','bell-tower','mochini','settings'].every(id=>drawerState.labels.includes(id)))throw new Error(`Palace Rooms drawer failed: ${JSON.stringify(drawerState)}`);
const drawerShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(out,'landscape-rooms-drawer.png'),Buffer.from(drawerShot.data,'base64'));
await evaluate(`document.querySelector('[data-palace-rooms-close]')?.click()`);await wait(60);
for(const id of['hobbies','moon-garden','love-letters','wishing-tower']){
 await evaluate(`(()=>{let button=document.querySelector('[data-palace-dock] [data-v6-nav="${id}"]');if(!button){document.querySelector('[data-palace-rooms]')?.click();button=document.querySelector('[data-palace-drawer] [data-v6-nav="${id}"]')}button?.click()})()`);await wait(150);
 await evaluate(`document.querySelector('[data-room-add]')?.click()`);await wait(80);
 const roomPopup=await evaluate(`(()=>{const modal=document.querySelector('.v6-room-modal'),r=modal?.getBoundingClientRect();return{exists:!!modal,inside:!!r&&r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,scrollable:!!modal&&modal.scrollHeight>=modal.clientHeight,rect:r?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null,viewport:{width:innerWidth,height:innerHeight}}})()`);
 if(!roomPopup.exists||!roomPopup.inside)throw new Error(`${id}: V6 popup does not fit the landscape viewport: ${JSON.stringify(roomPopup)}`);
 await evaluate(`document.querySelector('[data-room-close]')?.click()`);await wait(40);
}
await evaluate(`document.querySelector('[data-palace-dock] [data-v6-nav="daily"]').click()`);await wait(250);
const dutyIdentity=await evaluate(`({room:document.querySelector('.v6-command-room')?.dataset.v6Room,now:!!document.querySelector('.v6-duty-now'),next:!!document.querySelector('.v6-duty-next'),laterClosed:!document.querySelector('[data-duty-later]')?.open,doneClosed:!document.querySelector('[data-duty-done]')?.open,rhythm:!!document.querySelector('.v6-rhythm-ribbon'),medication:!!document.querySelector('.v6-medication-summary'),bell:!!document.querySelector('.v6-bell-layout')})`);
const externalBefore=await evaluate(`Object.fromEntries(Object.keys(localStorage).filter(key=>key!=='katos_v6_new_rooms_v1').map(key=>[key,localStorage.getItem(key)]))`);
await evaluate(`document.querySelector('[data-palace-rooms]').click();document.querySelector('[data-palace-drawer] [data-v6-nav="bell-tower"]').click()`);await wait(250);
const bellIdentity=await evaluate(`({room:document.querySelector('.v6-command-room')?.dataset.v6Room,timeline:!!document.querySelector('.v6-bell-timeline'),duties:!!document.querySelector('.v6-duty-main')})`);
await evaluate(`document.querySelector('[data-bell-action="add"]').click()`);await wait(100);
const popup=await evaluate(`(()=>{const modal=document.querySelector('.v6-bell-modal'),r=modal?.getBoundingClientRect();return{exists:!!modal,inside:!!r&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}})()`);
await evaluate(`(()=>{const form=document.querySelector('[data-bell-form]');form.title.value='Browser QA chime';form.remindDate.value=new Date().toISOString().slice(0,10);form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))})()`);await wait(200);
const reminderState=await evaluate(`(()=>{const state=JSON.parse(localStorage.getItem('katos_v6_new_rooms_v1'));return{count:state.bell.reminders.length,status:state.bell.reminders[0].status,title:state.bell.reminders[0].title}})()`);
await evaluate(`document.querySelector('[data-bell-action="complete"]').click()`);await wait(150);
const completedState=await evaluate(`(()=>{const state=JSON.parse(localStorage.getItem('katos_v6_new_rooms_v1'));return{status:state.bell.reminders[0].status}})()`);
const externalAfter=await evaluate(`Object.fromEntries(Object.keys(localStorage).filter(key=>key!=='katos_v6_new_rooms_v1').map(key=>[key,localStorage.getItem(key)]))`);
if(JSON.stringify(externalBefore)!==JSON.stringify(externalAfter))throw new Error('Bell interaction changed non-room storage.');
if(dutyIdentity.room!=='daily'||!dutyIdentity.now||!dutyIdentity.next||!dutyIdentity.laterClosed||!dutyIdentity.doneClosed||!dutyIdentity.rhythm||!dutyIdentity.medication||dutyIdentity.bell)throw new Error('Royal Duties identity leaked.');
if(bellIdentity.room!=='bell-tower'||!bellIdentity.timeline||bellIdentity.duties)throw new Error('Bell Tower identity leaked.');
if(!popup.exists||!popup.inside)throw new Error('Bell popup escaped the landscape viewport.');
if(reminderState.count!==1||reminderState.title!=='Browser QA chime'||completedState.status!=='Completed')throw new Error('Bell create/complete persistence failed.');

const scholar=results.find(row=>row.size==='landscape'&&row.id==='study');
if(scholar.regionWidth<scholar.roomWidth*.78)throw new Error(`Scholar columns are too narrow (${scholar.regionWidth}/${scholar.roomWidth}).`);
await evaluate(`document.querySelector('[data-palace-dock] [data-v6-nav="carriage-house"]').click()`);await wait(250);
const carriage=await evaluate(`(()=>{const room=document.querySelector('[data-v6-room="carriage"]'),before=localStorage.getItem('katos_v4'),inside=node=>{const r=node?.getBoundingClientRect();return!!r&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};document.querySelector('[data-money-open="new-gig-goal"]')?.click();const goal=document.querySelector('[data-money-modal="new-gig-goal"]:not([hidden]) .detail-modal'),goalInside=inside(goal);document.querySelector('[data-money-modal="new-gig-goal"] [data-money-close]')?.click();document.querySelector('[data-money-open="new-payout"]')?.click();const payout=document.querySelector('[data-money-modal="new-payout"]:not([hidden]) .detail-modal'),payoutInside=inside(payout);document.querySelector('[data-money-modal="new-payout"] [data-money-close]')?.click();document.querySelector('[data-flex-add]')?.click();const modal=document.querySelector('[data-flex-shift-modal] .detail-modal');return{room:!!room,flex:!!document.querySelector('[data-flex-add]'),dash:!!document.querySelector('[data-doordash-add]'),goal:!!goal,goalInside,payout:!!payout,payoutInside,modal:!!modal,inside:inside(modal),storageUnchanged:before===localStorage.getItem('katos_v4')}})()`);
if(!carriage.room||!carriage.flex||!carriage.dash||!carriage.goal||!carriage.goalInside||!carriage.payout||!carriage.payoutInside||!carriage.modal||!carriage.inside||!carriage.storageUnchanged)throw new Error(`Carriage House controls or Flex popup failed: ${JSON.stringify(carriage)}`);
console.log(JSON.stringify({checks:results.length*5+21,screenshots:out,drawerState,dutyIdentity,bellIdentity,popup,reminderState,completedState,carriage,scholar,results},null,2));
ws.close();
