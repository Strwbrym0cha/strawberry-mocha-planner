import{mkdir,writeFile}from'node:fs/promises';
import{join}from'node:path';
import{tmpdir}from'node:os';

const endpoint=process.env.KATOS_CDP||'http://127.0.0.1:9333',output=join(tmpdir(),'katos-v6-foyer-visual-qa');
await mkdir(output,{recursive:true});
const targets=await(await fetch(`${endpoint}/json`)).json(),target=targets.find(item=>item.type==='page');
if(!target)throw new Error('No V6 Chrome page target is available.');
const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map;let sequence=0;
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(!message.id||!pending.has(message.id))return;const entry=pending.get(message.id);pending.delete(message.id);message.error?entry.reject(new Error(message.error.message)):entry.resolve(message.result)});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`))},15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});socket.send(JSON.stringify({id,method,params}))});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const evaluate=async expression=>(await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;

await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Page.navigate',{url:`http://127.0.0.1:4173/v6/?foyer-qa=${Date.now()}`});await wait(3500);
const ready=await evaluate(`document.querySelector('#app')&&!document.querySelector('#app').classList.contains('loading')`);
if(!ready)throw new Error('V6 did not finish loading.');
await evaluate(`document.querySelector('[data-palace-dock] [data-v6-nav="home"]')?.click()`);await wait(450);

const sizes=[['landscape',1180,820],['portrait',820,1180]],results=[];
for(const[name,width,height]of sizes){
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await wait(180);
 const metrics=await evaluate(`(()=>{const q=s=>document.querySelector(s),rect=s=>{const r=q(s)?.getBoundingClientRect();return r?{left:Math.round(r.left),top:Math.round(r.top),right:Math.round(r.right),bottom:Math.round(r.bottom),width:Math.round(r.width),height:Math.round(r.height)}:null},primary=getComputedStyle(q('.v6-foyer-primary')),secondary=getComputedStyle(q('.v6-foyer-secondary')),utility=getComputedStyle(q('.v6-foyer-utility-stack')),scene=q('.v6-foyer-scene'),dock=rect('.palace-dock'),mochini=rect('.mochini-companion'),mochiniBody=rect('[data-mc-toggle]'),mochiniArt=rect('[data-mc-art]'),mochiniImage=q('[data-mc-art]'),interactive=[...document.querySelectorAll('[data-v6-room="home"] button')].map(node=>node.getBoundingClientRect()).filter(r=>r.width&&r.height),overlaps=mochiniBody?interactive.filter(r=>!(r.right<mochiniBody.left||r.left>mochiniBody.right||r.bottom<mochiniBody.top||r.top>mochiniBody.bottom)).length:0;return{room:q('.v6-command-room')?.dataset.v6Room,header:!!q('.v6-foyer-header'),ribbon:!!q('.v6-daily-ribbon'),rightNow:!!q('.v6-foyer-right-now'),next:!!q('.v6-foyer-next'),flavor:!!q('.v6-foyer-flavor'),today:!!q('.v6-foyer-today'),wins:!!q('.v6-foyer-wins'),thought:!!q('.v6-foyer-thought'),around:!!q('.v6-foyer-around'),documentWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,canvas:rect('[data-v6-room="home"]'),primary:rect('.v6-foyer-primary'),secondary:rect('.v6-foyer-secondary'),aroundRect:rect('.v6-foyer-around'),primaryColumns:primary.gridTemplateColumns,secondaryColumns:secondary.gridTemplateColumns,utilityColumns:utility.gridTemplateColumns,sceneBackground:scene?getComputedStyle(scene).backgroundImage:'',dock,mochini,mochiniBody,mochiniArt,mochiniImage:{complete:mochiniImage?.complete||false,naturalWidth:mochiniImage?.naturalWidth||0,opacity:mochiniImage?getComputedStyle(mochiniImage).opacity:'',display:mochiniImage?getComputedStyle(mochiniImage).display:'',src:mochiniImage?.currentSrc||mochiniImage?.src||''},mochiniInteractiveOverlaps:overlaps}})()`);
 results.push({name,width,height,...metrics});
 if(metrics.room!=='home'||!['header','ribbon','rightNow','next','flavor','today','wins','thought','around'].every(key=>metrics[key]))throw new Error(`${name}: Foyer regions are incomplete: ${JSON.stringify(metrics)}`);
 if(metrics.documentWidth>metrics.viewport+1)throw new Error(`${name}: horizontal overflow ${metrics.documentWidth}/${metrics.viewport}`);
 if(metrics.canvas.width>1181||metrics.canvas.width<Math.min(720,width-30))throw new Error(`${name}: canvas proportion is wrong: ${JSON.stringify(metrics.canvas)}`);
 if(metrics.dock.height>72)throw new Error(`${name}: Palace Dock is too tall: ${metrics.dock.height}`);
 if(!metrics.sceneBackground.includes('foyer-right-now-scene.png'))throw new Error(`${name}: approved Right Now scene is missing: ${metrics.sceneBackground}`);
 if(!metrics.mochiniImage.complete||!metrics.mochiniImage.naturalWidth)throw new Error(`${name}: Mochini art did not load: ${JSON.stringify(metrics.mochiniImage)}`);
 if(metrics.mochiniBody.left<0||metrics.mochiniBody.right>metrics.viewport)throw new Error(`${name}: Mochini body is outside the reserved viewport zone: ${JSON.stringify(metrics.mochiniBody)}`);
 if(metrics.mochiniInteractiveOverlaps)throw new Error(`${name}: Mochini overlaps ${metrics.mochiniInteractiveOverlaps} Foyer controls.`);
 if(name==='landscape'&&(!metrics.primaryColumns.includes(' ')||!metrics.secondaryColumns.includes(' ')||metrics.utilityColumns.includes(' ')))throw new Error('Landscape Foyer did not keep its approved asymmetrical hierarchy.');
 if(name==='landscape'&&(metrics.primary.height<225||metrics.primary.height>245||metrics.secondary.height<180||metrics.secondary.height>200||metrics.aroundRect.height<90||metrics.aroundRect.height>110))throw new Error(`Landscape Foyer proportions drifted: ${JSON.stringify({primary:metrics.primary,secondary:metrics.secondary,around:metrics.aroundRect})}`);
 if(name==='portrait'&&(metrics.primaryColumns.includes(' ')||metrics.secondaryColumns.includes(' ')))throw new Error('Portrait Foyer did not collapse its primary rows.');
 const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(output,`${name}-foyer.png`),Buffer.from(screenshot.data,'base64'));
}

await send('Emulation.setDeviceMetricsOverride',{width:1180,height:820,deviceScaleFactor:1,mobile:false});
await evaluate(`document.querySelector('[data-foyer-preview="kitchen"]')?.click()`);await wait(80);
const kitchenOpen=await evaluate(`!!document.querySelector('[data-foyer-preview-modal] [role="dialog"]')`);
await evaluate(`document.querySelector('[data-foyer-preview-close]')?.click()`);await wait(50);
const kitchenClosed=await evaluate(`!document.querySelector('[data-foyer-preview-modal]')`);
await evaluate(`document.querySelector('[data-foyer-tiny-win]')?.click()`);await wait(80);
const winPopup=await evaluate(`!!document.querySelector('[data-foyer-win-modal] [role="dialog"]')`);
await evaluate(`document.querySelector('[data-foyer-win-close]')?.click()`);await wait(50);
const winClosed=await evaluate(`!document.querySelector('[data-foyer-win-modal]')`);
await evaluate(`document.querySelector('[data-smart-action="brain"]')?.click()`);await wait(80);
const thoughtPopup=await evaluate(`!!document.querySelector('[data-smart-modal] [role="dialog"]')`);
await evaluate(`document.querySelector('[data-smart-close]')?.click()`);await wait(50);
const dockClickable=await evaluate(`(()=>{document.querySelector('[data-palace-rooms]')?.click();const open=!document.querySelector('[data-palace-drawer]')?.hidden;document.querySelector('[data-palace-rooms-close]')?.click();return open})()`);
await evaluate(`document.querySelector('[data-mc-toggle]')?.click()`);await wait(80);
const mochiniBubble=await evaluate(`(()=>{const node=document.querySelector('[data-mc-bubble].is-open'),r=node?.getBoundingClientRect();return r?{open:true,left:Math.round(r.left),right:Math.round(r.right),top:Math.round(r.top),bottom:Math.round(r.bottom),viewport:document.documentElement.clientWidth}: {open:false}})()`);
await evaluate(`document.querySelector('[data-mc-close]')?.click()`);await wait(50);
const mochiniClosed=await evaluate(`!document.querySelector('[data-mc-bubble].is-open')`);
if(!kitchenOpen||!kitchenClosed||!winPopup||!winClosed||!thoughtPopup||!dockClickable||!mochiniBubble.open||mochiniBubble.left<0||mochiniBubble.right>mochiniBubble.viewport||!mochiniClosed)throw new Error(`Foyer interactions failed: ${JSON.stringify({kitchenOpen,kitchenClosed,winPopup,winClosed,thoughtPopup,dockClickable,mochiniBubble,mochiniClosed})}`);

console.log(JSON.stringify({checks:results.length*15+8,screenshots:output,kitchenOpen,kitchenClosed,winPopup,winClosed,thoughtPopup,dockClickable,mochiniBubble,mochiniClosed,results},null,2));
socket.close();
