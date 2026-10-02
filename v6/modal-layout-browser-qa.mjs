import{mkdir,writeFile}from'node:fs/promises';
import{join}from'node:path';
import{tmpdir}from'node:os';

const endpoint=process.env.KATOS_CDP||'http://127.0.0.1:9333';
const output=join(tmpdir(),'katos-v6-modal-layout-qa');
await mkdir(output,{recursive:true});
const targets=await(await fetch(`${endpoint}/json`)).json();
const target=targets.find(row=>row.type==='page');
if(!target)throw new Error('No Chrome page target is available.');
const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();
let sequence=0;
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(!message.id||!pending.has(message.id))return;const entry=pending.get(message.id);pending.delete(message.id);message.error?entry.reject(new Error(message.error.message)):entry.resolve(message.result)});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`))},15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});socket.send(JSON.stringify({id,method,params}))});
const evaluate=async expression=>(await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await send('Network.enable');
await send('Network.setCacheDisabled',{cacheDisabled:true});
await evaluate(`location.reload()`);
await wait(1600);

const go=async id=>{
 await evaluate(`(()=>{document.querySelectorAll('.detail-modal-backdrop,.v6-room-modal-backdrop,[data-bell-modal]').forEach(node=>node.remove());let button=document.querySelector('[data-palace-dock] [data-v6-nav="${id}"]');if(!button){document.querySelector('[data-palace-rooms]')?.click();button=document.querySelector('[data-palace-drawer] [data-v6-nav="${id}"]')}button?.click();return!!button})()`);
 await wait(180);
};
const open=async selector=>{
 const opened=await evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(selector)});button?.click();return!!button})()`);
 if(!opened)throw new Error(`Missing modal opener: ${selector}`);
 await wait(100);
};
const close=async()=>{await evaluate(`document.querySelector('.detail-modal-backdrop:not([hidden]) .detail-modal-close,[data-v6-native-close],[data-kitchen-close],[data-room-close],[data-money-close],[data-smart-close],[data-bell-close]')?.click()`);await wait(60)};
const inspect=async(label)=>{
 const metrics=await evaluate(`(()=>{
  const dialog=[...document.querySelectorAll('.detail-modal-backdrop:not([hidden]) .detail-modal,.v6-room-modal-backdrop:not([hidden]) .v6-room-modal,[data-bell-modal] .v6-room-modal')].find(node=>getComputedStyle(node).display!=='none');
  if(!dialog)return{exists:false};
  const round=value=>Math.round(value*10)/10,rect=node=>{const r=node.getBoundingClientRect();return{left:round(r.left),top:round(r.top),right:round(r.right),bottom:round(r.bottom),width:round(r.width),height:round(r.height)}};
  const box=rect(dialog),header=dialog.querySelector('.v6-popup-header'),close=header?.querySelector('.detail-modal-close'),headerBox=header&&rect(header),closeBox=close&&rect(close);
  const grids=[...dialog.querySelectorAll('.room-detail-fields,.v6-modal-fields,.v6-room-form-grid,.v6-smart-fields')].map(grid=>{const r=rect(grid),parent=rect(grid.parentElement),labels=[...grid.querySelectorAll(':scope>label')].filter(node=>getComputedStyle(node).display!=='none').map(node=>({box:rect(node),wide:node.classList.contains('wide'),check:node.classList.contains('check')}));return{box:r,parent,widthRatio:round(r.width/Math.max(parent.width,1)),labels}});
  const controls=[...dialog.querySelectorAll('input:not([type=checkbox]):not([type=radio]),select,textarea')].filter(node=>getComputedStyle(node).display!=='none').map(node=>({tag:node.tagName,box:rect(node)}));
  const overflow=dialog.scrollWidth>dialog.clientWidth+2;
  const escaped=controls.filter(({box:r})=>r.left<box.left-1||r.right>box.right+1);
  const overlap=grids.flatMap(grid=>grid.labels.flatMap((left,index)=>grid.labels.slice(index+1).filter(right=>Math.min(left.box.right,right.box.right)-Math.max(left.box.left,right.box.left)>2&&Math.min(left.box.bottom,right.box.bottom)-Math.max(left.box.top,right.box.top)>2).map(right=>[left.box,right.box])));
  const headerAligned=!header||!close||closeBox.left>=headerBox.left+headerBox.width*.65&&closeBox.top<headerBox.bottom&&closeBox.right<=headerBox.right+1;
  return{exists:true,viewport:{width:innerWidth,height:innerHeight},box,inside:box.left>=8&&box.top>=8&&box.right<=innerWidth-8&&box.bottom<=innerHeight-8,overflow,escaped,overlap,headerAligned,grids,controls};
 })()`);
 if(!metrics.exists||!metrics.inside||metrics.overflow||metrics.escaped.length||metrics.overlap.length||!metrics.headerAligned||metrics.grids.some(grid=>grid.widthRatio<.94))throw new Error(`${label}: modal margin/layout failure ${JSON.stringify(metrics)}`);
 return{label,...metrics};
};

const cases=[
 {room:'home',name:'Foyer · Tiny Win',open:'[data-foyer-tiny-win]'},
 {room:'daily',name:'Royal Duties · Add Task',open:'[data-v6-duty-open="task-new"]'},
 {room:'time',name:'Royal Calendar · Add Event',open:'[data-v6-calendar-open="event-new"]'},
 {room:'boss',name:'Crown & Career · History',open:'[data-v6-career-open="history"]'},
 {room:'carriage-house',name:'Carriage House · Goal',open:'[data-money-open="new-gig-goal"]'},
 {room:'royal-kitchen',name:'Royal Kitchen · Plan Meal',open:'[data-kitchen-open="meal"]'},
 {room:'royal-kitchen',name:'Royal Kitchen · Recipe',open:'[data-kitchen-open="recipe"]'},
 {room:'royal-kitchen',name:'Royal Kitchen · Build Week',open:'[data-kitchen-open="build-week"]'},
 {room:'hobbies',name:'Rose Garden · Add',open:'[data-room-add]'},
 {room:'moon-garden',name:'Moon Garden · Add',open:'[data-room-add]'},
 {room:'love-letters',name:'Love Letters · Add',open:'[data-room-add]'},
 {room:'wishing-tower',name:'Wishing Tower · Add',open:'[data-room-add]'},
 {room:'bell-tower',name:'Bell Tower · Add Reminder',open:'[data-bell-action="add"]'}
];
const sizes=[['landscape',1180,820],['reported-ipad',1280,840],['portrait',820,1180]],results=[];
for(const[size,width,height]of sizes){
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 for(const item of cases){
  await go(item.room);await open(item.open);results.push({size,...await inspect(`${size} · ${item.name}`)});
  if(item.name==='Royal Kitchen · Plan Meal'){const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(output,`${size}-royal-kitchen-plan-meal.png`),Buffer.from(shot.data,'base64'))}
  await close();
 }
}
console.log(JSON.stringify({checks:results.length*7,modals:results.length,screenshots:output,results:results.map(({size,label,box,grids,controls})=>({size,label,box,gridWidths:grids.map(row=>row.box.width),controlWidths:controls.map(row=>row.box.width)}))},null,2));
socket.close();
