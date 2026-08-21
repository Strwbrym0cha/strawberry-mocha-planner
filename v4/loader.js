import * as store from './store.js?v=4.0.0-preview.2';
import * as mochini from './mochini.js?v=4.0.0-preview.2';
window.__KATOS_V4_DEPS={store,mochini};
const PARTS=8;
const urls=Array.from({length:PARTS},(_,i)=>`./parts/app-${String(i+1).padStart(2,'0')}.txt?v=4.0.0-parity3`);
try{
 const chunks=await Promise.all(urls.map(async url=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`Failed to load ${url} (${r.status})`);return r.text()}));
 const blob=new Blob([chunks.join('')],{type:'text/javascript'});
 const url=URL.createObjectURL(blob);
 await import(url);
 await import('./preserve.js?v=4.0.0-parity3');
 await import('./record-tools.js?v=4.0.0-tools1');
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}catch(error){
 console.error(error);
 const app=document.getElementById('app');if(app)app.innerHTML=`<main style="padding:28px;font-family:-apple-system,sans-serif;color:#6f4153"><h2>🎀 V4 tripped over her skirt.</h2><p>${String(error.message||error)}</p><p>V3 is still untouched.</p></main>`;
}
