const PARTS=8;
const RECOVERY='4.1.15-raw-browser-export';
const urls=Array.from({length:PARTS},(_,i)=>`./parts/app-${String(i+1).padStart(2,'0')}.txt?v=${RECOVERY}`);
const TRANSIENT_HTTP=new Set([408,425,429,500,502,503,504]);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function fetchRuntimeChunk(url){
 const bare=url.split('?')[0],candidates=[url,bare];
 let lastError=null;
 for(let ci=0;ci<candidates.length;ci++){
  const candidate=candidates[ci];
  for(let attempt=1;attempt<=3;attempt++){
   try{
    const r=await fetch(candidate,{cache:'no-store'});
    if(r.ok)return r.text();
    const error=new Error(`Failed to load ${candidate} (${r.status})`);
    if(!TRANSIENT_HTTP.has(r.status))throw error;
    lastError=error;
   }catch(error){
    lastError=error;
    if(error?.message?.match(/\((4\d\d)\)$/)&&!error.message.match(/\((408|425|429)\)$/))throw error;
   }
   if(attempt<3)await wait(250*attempt);
  }
  if(ci===0)console.warn(`KatOS retrying ${bare} without the cache-busting query after transient load failures.`,lastError);
 }
 throw new Error(`${lastError?.message||`Failed to load ${url}`} after retries`);
}

async function optionalImport(path,label){
 try{return await import(path)}catch(error){console.warn(`KatOS optional ${label} enhancement skipped:`,error);return null}
}

let stage='starting';
try{
 stage='Store + Mochini';
  const [store,mochini,life,lore,ai,gig,journey]=await Promise.all([
  import(`./store.js?v=${RECOVERY}`),
  import(`./mochini.js?v=${RECOVERY}`),
  import(`./mochini-life.js?v=${RECOVERY}`),
  import(`./mochini-lore.js?v=${RECOVERY}`),
  import(`./mochini-ai.js?v=${RECOVERY}`),
  import(`./money-cafe-gig.js?v=${RECOVERY}`),
  import(`./journey.js?v=${RECOVERY}`)
  ]);
  window.__KATOS_V4_DEPS={store,mochini,life,lore,ai,gig,journey};

 stage='core runtime chunks';
 const chunks=await Promise.all(urls.map(fetchRuntimeChunk));
 const blob=new Blob([chunks.join('')],{type:'text/javascript'});
 const url=URL.createObjectURL(blob);
 await import(url);
 setTimeout(()=>URL.revokeObjectURL(url),1000);

 stage='optional parity tools';
 await optionalImport(`./mochini-runtime.js?v=${RECOVERY}`,'Mochini conversation routing');
 await optionalImport(`./auth-ui.js?v=${RECOVERY}`,'account controls');
 const recoveryModule=await optionalImport(`./data-recovery.js?v=${RECOVERY}`,'V4 data recovery');
 window.__KATOS_V4_RECOVERY=recoveryModule;
 await optionalImport(`./recovery-modal-safe-v2.js?v=${RECOVERY}`,'iPad-safe background recovery modal');
 await optionalImport(`./v17-local-recovery.js?v=${RECOVERY}`,'V17 browser recovery bridge');
 await optionalImport(`./recovery-inspector.js?v=${RECOVERY}`,'browser recovery inspector');
 await optionalImport(`./recovery-raw-export.js?v=${RECOVERY}`,'raw browser recovery export');
 await optionalImport(`./cloud-recovery.js?v=${RECOVERY}`,'cloud backup recovery');
 await optionalImport(`./preserve.js?v=${RECOVERY}`,'parity');
 await optionalImport(`./study-program-progress.js?v=${RECOVERY}`,'study program progress');
 await optionalImport(`./study-program-actions.js?v=${RECOVERY}`,'study program actions');
 await optionalImport(`./study-course-program-link.js?v=${RECOVERY}`,'study course/program linking');
 await optionalImport(`./record-tools.js?v=${RECOVERY}`,'record tools');
 await optionalImport(`./archive-tools.js?v=${RECOVERY}`,'archive tools');
 await optionalImport(`./motion-week.js?v=${RECOVERY}`,'weekly motion');
 await optionalImport(`./movement-recipes-ui.js?v=${RECOVERY}`,'movement recipe manager');
 await optionalImport(`./time-calendar.js?v=${RECOVERY}`,'month calendar');
 await optionalImport(`./money-cafe-gig-tab.js?v=${RECOVERY}`,'Money Café gigs tab');
 await optionalImport(`./money-savings-piles.js?v=${RECOVERY}`,'editable savings piles');
 await optionalImport(`./money-ledger.js?v=${RECOVERY}`,'Money Café live ledger');
 await optionalImport(`./money-accounts.js?v=${RECOVERY}`,'account balances');
 await optionalImport(`./money-due-dates.js?v=${RECOVERY}`,'money due date labels');
 await optionalImport(`./money-subscriptions.js?v=${RECOVERY}`,'subscriptions manager');
 await optionalImport(`./money-paycheck-calc.js?v=${RECOVERY}`,'paycheck gross calculator');
 await optionalImport(`./money-paychecks.js?v=${RECOVERY}`,'paycheck ledger');
 await optionalImport(`./work-schedule.js?v=${RECOVERY}`,'work schedule');
 await optionalImport(`./gig-shifts.js?v=${RECOVERY}`,'gig shift planner');
 await optionalImport(`./boss-schedule-hub.js?v=${RECOVERY}`,'Boss Bitch schedule hub');
 await optionalImport(`./daily-note-work.js?v=${RECOVERY}`,'Daily Note work recap');
 await optionalImport(`./routine-timing.js?v=${RECOVERY}`,'routine timing');
 await optionalImport(`./hobby-advisor.js?v=${RECOVERY}`,'Mochini hobby advisor');
 await optionalImport(`./hobby-shelf.js?v=${RECOVERY}`,'interactive hobby shelf');
 await optionalImport(`./hobby-lanes-view.js?v=${RECOVERY}`,'hobby category view');
 await optionalImport(`./food-journey-ui.js?v=${RECOVERY}`,'Food + Journey controls');
}catch(error){
 console.error(`KatOS V4 failed during ${stage}:`,error);
 const app=document.getElementById('app');
 if(app)app.innerHTML=`<main style="padding:28px;font-family:-apple-system,sans-serif;color:#6f4153"><h2>🎀 V4 tripped over her skirt.</h2><p><b>Stage:</b> ${stage}</p><p>${String(error.message||error)}</p><p>Your V4 data is still safe.</p><button type="button" onclick="location.reload()" style="margin-top:8px;padding:10px 14px;border:1px solid #e8bfd0;border-radius:999px;background:#fff7fb;color:#7b4258;font:inherit;font-weight:700">Try again</button></main>`;
}
