const PARTS=8;
const RECOVERY='4.0.0-recovery2';
const urls=Array.from({length:PARTS},(_,i)=>`./parts/app-${String(i+1).padStart(2,'0')}.txt?v=${RECOVERY}`);

async function optionalImport(path,label){
 try{return await import(path)}catch(error){console.warn(`KatOS optional ${label} enhancement skipped:`,error);return null}
}

let stage='starting';
try{
 stage='Store + Mochini';
 const [store,mochini]=await Promise.all([
  import(`./store.js?v=${RECOVERY}`),
  import(`./mochini.js?v=${RECOVERY}`)
 ]);
 window.__KATOS_V4_DEPS={store,mochini};

 stage='core runtime chunks';
 const chunks=await Promise.all(urls.map(async url=>{
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok)throw new Error(`Failed to load ${url} (${r.status})`);
  return r.text();
 }));
 const blob=new Blob([chunks.join('')],{type:'text/javascript'});
 const url=URL.createObjectURL(blob);
 await import(url);
 setTimeout(()=>URL.revokeObjectURL(url),1000);

 stage='optional parity tools';
 await optionalImport(`./preserve.js?v=${RECOVERY}`,'parity');
 await optionalImport(`./record-tools.js?v=${RECOVERY}`,'record tools');
 await optionalImport(`./archive-tools.js?v=${RECOVERY}`,'archive tools');
 await optionalImport(`./motion-week.js?v=${RECOVERY}`,'weekly motion');
 await optionalImport(`./time-calendar.js?v=${RECOVERY}`,'month calendar');
 await optionalImport(`./money-accounts.js?v=${RECOVERY}`,'account balances');
 await optionalImport(`./work-schedule.js?v=${RECOVERY}`,'work schedule');
 await optionalImport(`./routine-timing.js?v=${RECOVERY}`,'routine timing');
 await optionalImport(`./hobby-shelf.js?v=${RECOVERY}`,'interactive hobby shelf');
}catch(error){
 console.error(`KatOS V4 failed during ${stage}:`,error);
 const app=document.getElementById('app');
 if(app)app.innerHTML=`<main style="padding:28px;font-family:-apple-system,sans-serif;color:#6f4153"><h2>🎀 V4 tripped over her skirt.</h2><p><b>Stage:</b> ${stage}</p><p>${String(error.message||error)}</p><p>Your V4 data is still safe.</p></main>`;
}
