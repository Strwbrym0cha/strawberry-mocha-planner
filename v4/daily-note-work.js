const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const clone=v=>typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));
const money=v=>Math.round((Number(v)||0)*100)/100;
const isGigLabel=v=>{const s=text(v).toLowerCase();return s.includes('doordash')||s.includes('shipt')||s==='other gig'||s==='other-gig'};

export function shiftMinutesForDate(shifts,date){
  return list(shifts).filter(s=>String(s?.date||'').slice(0,10)===date).reduce((sum,s)=>{
    if(!s?.startTime||!s?.endTime)return sum;
    const mins=t=>{const[h,m]=String(t).split(':').map(Number);return Number.isFinite(h)?h*60+(Number(m)||0):0};
    return sum+Math.max(0,mins(s.endTime)-mins(s.startTime));
  },0);
}

export function ruleOccursOnDate(rule,date){
  if(!rule||!date)return false;
  const start=text(rule.startDate||rule.effectiveFrom),end=text(rule.endDate);
  if(start&&date<start)return false;
  if(end&&date>end)return false;
  const day=new Date(`${date}T12:00:00`).getDay();
  const repeat=text(rule.repeat||rule.recurrence)||'weekly';
  if(repeat==='daily')return true;
  if(repeat==='weekdays')return day>=1&&day<=5;
  if(repeat==='weekends')return day===0||day===6;
  return list(rule.days).map(Number).includes(day);
}

export function recurringShiftMinutesForDate(rules,date){
  return shiftMinutesForDate(list(rules).filter(r=>ruleOccursOnDate(r,date)).map(r=>({...r,date})),date);
}

export function deriveWorkDefaults({mainMinutes=0,gigMinutes=0,gigTotal=0}={}){
  const hasMain=Number(mainMinutes)>0;
  const hasGig=Number(gigMinutes)>0||Number(gigTotal)>0;
  const totalMinutes=Math.max(0,Number(mainMinutes)||0)+Math.max(0,Number(gigMinutes)||0);
  return{
    worked:hasMain||hasGig?'yes':'no',
    workType:hasMain&&hasGig?'both':hasGig?'gig':hasMain?'regular':'off',
    workHours:totalMinutes?Math.round((totalMinutes/60)*100)/100:''
  };
}

export function displayWorkHours(savedWorkHours,defaultWorkHours=''){
  const hasSaved=savedWorkHours!==undefined&&savedWorkHours!==null&&text(savedWorkHours)!=='';
  if(hasSaved)return Math.max(0,money(savedWorkHours));
  if(defaultWorkHours===undefined||defaultWorkHours===null||text(defaultWorkHours)==='')return'';
  return Math.max(0,money(defaultWorkHours));
}

export function upsertWorkRecap(state,date,values={},snapshot={},makeId=()=>`review-${Date.now()}`){
  const next=clone(state||{});
  next.insights={...(next.insights||{})};
  const reviews=list(next.insights.dayReviews);
  const existing=reviews.find(x=>x?.date===date)||{};
  const hours=text(values.workHours)===''?'':Math.max(0,money(values.workHours));
  const worked=['yes','no','kinda'].includes(values.worked)?values.worked:'';
  const workType=['regular','gig','both','other','off'].includes(values.workType)?values.workType:'';
  const workVibe=['','chill','fine','good','draining','awful'].includes(values.workVibe)?values.workVibe:'';
  const recap={
    ...existing,
    id:existing.id||makeId('review'),
    date,
    worked,
    workType,
    workHours:hours,
    workVibe,
    workNote:text(values.workNote),
    workSnapshot:{
      mainMinutes:Math.max(0,Number(snapshot.mainMinutes)||0),
      gigMinutes:Math.max(0,Number(snapshot.gigMinutes)||0),
      gigTotal:Math.max(0,money(snapshot.gigTotal)),
      capturedAt:new Date().toISOString()
    },
    createdAt:existing.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  next.insights.dayReviews=[...reviews.filter(x=>x?.date!==date),recap];
  return next;
}

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function activeRows(state,kind,rows,store){return list(rows).filter(x=>!x?.id||!store?.isArchived?.(state,kind,x.id));}

async function boot(){
  const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
  const rt=await waitRuntime();
  const deps=window.__KATOS_V4_DEPS||{};
  const store=deps.store;
  const gig=deps.gig;

  function workSnapshot(state,date){
    const oneOffMain=activeRows(state,'shift',state?.work?.shifts,store)
      .filter(s=>String(s?.date||'').slice(0,10)===date)
      .filter(s=>!isGigLabel(s?.label));
    const recurringMain=activeRows(state,'shift-schedule',state?.work?.shiftSchedules,store)
      .filter(r=>!isGigLabel(r?.label));
    const mainMinutes=shiftMinutesForDate(oneOffMain,date)+recurringShiftMinutesForDate(recurringMain,date);

    const completedGigShifts=list(state?.work?.gigShifts).filter(s=>
      String(s?.date||'').slice(0,10)===date&&Number(s?.actualAmount)>0
    );
    const gigMinutes=shiftMinutesForDate(completedGigShifts,date);

    const earnings=activeRows(state,'earning',state?.money?.earnings,store);
    const gigSummary=gig?.gigSummary?gig.gigSummary(earnings,date,date):{total:0,bySource:{}};
    const bySource=gigSummary?.bySource||{};
    const sources=[['doordash','DoorDash'],['shipt','Shipt'],['other-gig','Other gig']]
      .filter(([key])=>Number(bySource[key])>0)
      .map(([key,label])=>`${label} ${rt.currency?rt.currency(bySource[key]):`$${money(bySource[key]).toFixed(2)}`}`);
    return{mainMinutes,gigMinutes,gigTotal:money(gigSummary?.total||0),sources};
  }

  function injectStyles(){
    if(document.getElementById('daily-note-work-style'))return;
    const style=document.createElement('style');
    style.id='daily-note-work-style';
    style.textContent=`
      .daily-work-card{background:linear-gradient(135deg,#fff8fb,#fff,#fbf4ff)}
      .daily-work-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      .daily-work-head h2{margin:3px 0}.daily-work-head p{margin:0;color:#8f707c}
      .daily-work-badge{padding:7px 10px;border:1px solid #ead5df;border-radius:999px;background:#fff;font-size:10px;font-weight:900;white-space:nowrap;color:#805866}
      .daily-work-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:12px 0}
      .daily-work-stat{padding:10px 11px;border:1px solid #ecdbe3;border-radius:15px;background:#fff}
      .daily-work-stat small{display:block;font-size:8px;font-weight:900;letter-spacing:.07em;color:#98727f}
      .daily-work-stat b{display:block;margin-top:3px;font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400;color:#654650}
      .daily-work-auto{margin:0 0 12px;color:#947782;font-size:10px}
      .daily-work-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .daily-work-field{display:grid;gap:5px}.daily-work-field span{font-size:9px;font-weight:850;color:#795c68}
      .daily-work-field input,.daily-work-field select,.daily-work-field textarea{width:100%;padding:10px;border:1px solid #e5ced7;border-radius:12px;background:#fff;font:inherit}
      .daily-work-field textarea{min-height:76px;resize:vertical}.daily-work-field.wide{grid-column:1/-1}
      @media(max-width:900px){.daily-work-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:760px){.daily-work-head{display:block}.daily-work-badge{display:inline-block;margin-top:9px}.daily-work-stats,.daily-work-fields{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function option(value,label,current){return `<option value="${esc(value)}" ${current===value?'selected':''}>${esc(label)}</option>`;}

  function render(){
    injectStyles();
    if(!document.querySelector('.nav-btn.active[data-view="review"]'))return;
    const reviewForm=document.querySelector('form[data-form="review"]');
    if(!reviewForm||document.querySelector('[data-daily-work-card]'))return;
    const reviewCard=reviewForm.closest('.card');
    if(!reviewCard)return;

    const state=rt.getState();
    const date=rt.today();
    const saved=list(state?.insights?.dayReviews).find(x=>x?.date===date)||{};
    const snap=workSnapshot(state,date);
    const defaults=deriveWorkDefaults(snap);
    const worked=['yes','no','kinda'].includes(saved.worked)?saved.worked:defaults.worked;
    const workType=['regular','gig','both','other','off'].includes(saved.workType)?saved.workType:defaults.workType;
    const workHours=displayWorkHours(saved.workHours,defaults.workHours);
    const workVibe=text(saved.workVibe);
    const autoWorked=defaults.worked==='yes';
    const mainHours=Math.round((snap.mainMinutes/60)*100)/100;
    const autoGigHours=Math.round((snap.gigMinutes/60)*100)/100;
    const summaryHours=workHours!==''?workHours:(mainHours+autoGigHours||'');
    const currency=rt.currency?rt.currency(snap.gigTotal):`$${snap.gigTotal.toFixed(2)}`;

    const card=document.createElement('section');
    card.className='card full daily-work-card';
    card.dataset.dailyWorkCard='1';
    card.innerHTML=`
      <div class="daily-work-head">
        <div><div class="ey">💼 WORK CHECK</div><h2>Did I work today or did capitalism leave me alone?</h2><p>KatOS checks Shift HQ + Gigs first, then you can correct the record.</p></div>
        <div class="daily-work-badge">${autoWorked?'💼 work detected':'🛋️ no work detected'}</div>
      </div>
      <div class="daily-work-stats">
        <div class="daily-work-stat"><small>AUTO GUESS</small><b>${autoWorked?'Worked':'Off'}</b></div>
        <div class="daily-work-stat"><small>MAIN JOB SCHEDULED</small><b>${mainHours?`${mainHours}h`:'0h'}</b></div>
        <div class="daily-work-stat"><small>HOURS WORKED</small><b>${summaryHours!==''?`${summaryHours}h`:'0h'}</b></div>
        <div class="daily-work-stat"><small>GIG MONEY</small><b>${currency}</b></div>
      </div>
      <p class="daily-work-auto">${snap.sources.length?`Gig receipts: ${esc(snap.sources.join(' · '))}. `:''}Main-job time comes from today’s Shift HQ schedule. Hours worked uses your saved recap first, then falls back to timed Shift HQ/Gig shifts. Your saved answer wins if reality was different.</p>
      <form data-daily-work-recap>
        <div class="daily-work-fields">
          <label class="daily-work-field"><span>Did I work?</span><select name="worked">${option('yes','Yep, I worked',worked)}${option('no','Nope, off day',worked)}${option('kinda','Kinda / work-ish stuff',worked)}</select></label>
          <label class="daily-work-field"><span>What kind?</span><select name="workType">${option('regular','Regular job / shift',workType)}${option('gig','Gig work',workType)}${option('both','Regular + gig',workType)}${option('other','Other work',workType)}${option('off','Off day',workType)}</select></label>
          <label class="daily-work-field"><span>Hours worked · optional</span><input name="workHours" type="number" min="0" step=".25" inputmode="decimal" value="${esc(workHours)}" placeholder="4.5"></label>
          <label class="daily-work-field"><span>Work vibe</span><select name="workVibe">${option('','No rating',workVibe)}${option('chill','😌 Chill',workVibe)}${option('fine','🙂 Fine',workVibe)}${option('good','✨ Actually good',workVibe)}${option('draining','😵 Draining',workVibe)}${option('awful','💀 Absolutely not',workVibe)}</select></label>
          <label class="daily-work-field wide"><span>Work note · optional</span><textarea name="workNote" placeholder="Busy shift, one giant DoorDash order, customer nonsense, surprisingly chill…">${esc(saved.workNote||'')}</textarea></label>
        </div>
        <div class="form-actions"><button class="btn primary">💼 ${saved.worked?'Update':'Save'} work recap</button></div>
      </form>
    `;
    reviewCard.insertAdjacentElement('beforebegin',card);
  }

  function save(form){
    const values=Object.fromEntries(new FormData(form).entries());
    const state=rt.getState();
    const date=rt.today();
    const snap=workSnapshot(state,date);
    rt.setState(upsertWorkRecap(state,date,values,snap,rt.makeId),'Work recap saved');
  }

  document.addEventListener('submit',event=>{
    const form=event.target.closest?.('[data-daily-work-recap]');
    if(!form)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    save(form);
  },true);

  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})};
  new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});
  schedule();
}

if(typeof window!=='undefined'&&typeof document!=='undefined')boot();
