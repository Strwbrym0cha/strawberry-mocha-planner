import * as store from './store.js?v=4.0.0-preview.2';
import * as mochini from './mochini.js?v=4.0.0-routetime1';
window.__KATOS_V4_DEPS={store,mochini};
const PARTS=8;
const urls=Array.from({length:PARTS},(_,i)=>`./parts/app-${String(i+1).padStart(2,'0')}.txt?v=4.0.0-parity3`);

async function optionalImport(path,label){
 try{return await import(path)}catch(error){console.warn(`KatOS optional ${label} enhancement skipped:`,error);return null}
}

try{
 const chunks=await Promise.all(urls.map(async url=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`Failed to load ${url} (${r.status})`);return r.text()}));
 const blob=new Blob([chunks.join('')],{type:'text/javascript'});
 const url=URL.createObjectURL(blob);
 await import(url);
 await import('./preserve.js?v=4.0.0-parity3');
 await import('./record-tools.js?v=4.0.0-tools1');
 await import('./archive-tools.js?v=4.0.0-tools1');
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 await optionalImport('./motion-week.js?v=4.0.0-motionweek2','weekly motion');
 await optionalImport('./time-calendar.js?v=4.0.0-calendar1','month calendar');
 await optionalImport('./money-accounts.js?v=4.0.0-accounts1','account balances');
 await optionalImport('./work-schedule.js?v=4.0.0-workschedule1','work schedule');
 await optionalImport('./routine-timing.js?v=4.0.0-routetime2','routine timing');
}catch(error){
 console.error(error);
 const app=document.getElementById('app');if(app)app.innerHTML=`<main style="padding:28px;font-family:-apple-system,sans-serif;color:#6f4153"><h2>🎀 V4 tripped over her skirt.</h2><p>${String(error.message||error)}</p><p>Your V4 data is still safe.</p></main>`;
}
