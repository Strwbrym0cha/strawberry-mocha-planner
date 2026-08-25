const PARTS=8;
const RECOVERY='4.0.0-recovery18';
const urls=Array.from({length:PARTS},(_,i)=>`./parts/app-${String(i+1).padStart(2,'0')}.txt?v=${RECOVERY}`);

async function optionalImport(path,label){
 try{return await import(path)}catch(error){console.warn(`KatOS optional ${label} enhancement skipped:`,error);return null}
}

let stage='starting';
try{
 stage='Store + Mochini';
  const [store,mochini,life,lore,ai,gig]=await Promise.all([
  import(`./store.js?v=${RECOVERY}`),
  import(`./mochini.js?v=${RECOVERY}`),
  import(`./mochini-life.js?v=${RECOVERY}`),
  import(`./mochini-lore.js?v=${RECOVERY}`),
  import(`./mochini-ai.js?v=${RECOVERY}`),
  import(`./money-cafe-gig.js?v=${RECOVERY}`)
  ]);
  window.__KATOS_V4_DEPS={store,mochini,life,lore,ai,gig};

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
 await optionalImport(`./mochini-runtime.js?v=${RECOVERY}`,'Mochini conversation routing');
 await optionalImport(`./auth-ui.js?v=${RECOVERY}`,'account controls');
 await optionalImport(`./preserve.js?v=${RECOVERY}`,'parity');
 await optionalImport(`./study-program-progress.js?v=${RECOVERY}`,'study program progress');
 await optionalImport(`./study-program-actions.js?v=${RECOVERY}`,'study program actions');
 await optionalImport(`./record-tools.js?v=${RECOVERY}`,'record tools');
 await optionalImport(`./archive-tools.js?v=${RECOVERY}`,'archive tools');
 await optionalImport(`./motion-week.js?v=${RECOVERY}`,'weekly motion');
 await optionalImport(`./time-calendar.js?v=${RECOVERY}`,'month calendar');
 await optionalImport(`./money-cafe-gig-tab.js?v=${RECOVERY}`,'Money Café gigs tab');
 await optionalImport(`./money-accounts.js?v=${RECOVERY}`,'account balances');
 await optionalImport(`./money-forecast.js?v=${RECOVERY}`,'expected cash forecast');
 await optionalImport(`./money-due-dates.js?v=${RECOVERY}`,'money due date labels');
 await optionalImport(`./money-subscriptions.js?v=${RECOVERY}`,'subscriptions manager');
 await optionalImport(`./money-paycheck-calc.js?v=${RECOVERY}`,'paycheck gross calculator');
 await optionalImport(`./money-paychecks.js?v=${RECOVERY}`,'paycheck ledger');
 await optionalImport(`./work-schedule.js?v=${RECOVERY}`,'work schedule');
 await optionalImport(`./routine-timing.js?v=${RECOVERY}`,'routine timing');
 await optionalImport(`./hobby-advisor.js?v=${RECOVERY}`,'Mochini hobby advisor');
 await optionalImport(`./hobby-shelf.js?v=${RECOVERY}`,'interactive hobby shelf');
 await optionalImport(`./hobby-lanes-view.js?v=${RECOVERY}`,'hobby category view');
}catch(error){
 console.error(`KatOS V4 failed during ${stage}:`,error);
 const app=document.getElementById('app');
 if(app)app.innerHTML=`<main style="padding:28px;font-family:-apple-system,sans-serif;color:#6f4153"><h2>🎀 V4 tripped over her skirt.</h2><p><b>Stage:</b> ${stage}</p><p>${String(error.message||error)}</p><p>Your V4 data is still safe.</p></main>`;
}
