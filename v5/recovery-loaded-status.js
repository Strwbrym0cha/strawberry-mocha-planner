const LOCK_KEY='sm_recovery_lock';
const V5_KEY='sm_v5_data';
const PATHS=[
  'life.tasks','life.routines','life.routineInstances','life.events','life.reminders','life.threads',
  'money.earnings','money.accounts','money.bills','money.spending','money.ledger','money.transactions','money.savingsGoals','money.debts','money.subscriptions',
  'money.hq.accounts','money.hq.transactions','money.hq.bills','money.hq.billInstances','money.hq.subscriptions','money.hq.goals','money.hq.goalContributions','money.hq.liabilities','money.hq.payRates','money.hq.legacyBuckets',
  'work.gig.platforms','work.gig.orders','work.gig.payouts','work.gig.goals',
  'work.items','work.shifts','work.training','work.career',
  'work.hq.clients','work.hq.supervisors','work.hq.sessionPlans','work.hq.scheduleExceptions','work.hq.goalLibrary','work.hq.materialLibrary',
  'education.programs','education.providers','education.requirements','education.courses','education.items','education.sessions','education.reviews','education.transferEvaluations','education.transferResults','education.terms','education.importantDates',
  'insights.dayReviews','insights.activityLog','insights.observations','insights.experiments','movement.sessions',
  'v4.people','v4.hobbies','v4.admin','v4.shopping','v4.brainDump','v4.openDayPlans',
  'nourish.noms.foods','nourish.noms.recipes','nourish.noms.history','nourish.noms.groceries',
  'tasks','routines','events','reminders','habits','projects','goals','wins','courses','schoolTasks','workItems','brainNotes','priorities',
  'money.transactions','money.ledger'
];
const get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
const list=v=>Array.isArray(v)?v:[];
function current(){try{const state=JSON.parse(localStorage.getItem(V5_KEY)||'null');if(!state||typeof state!=='object')return null;return{total:PATHS.reduce((n,p)=>n+list(get(state,p)).length,0),hq:list(get(state,'money.hq.transactions')).length,bytes:new Blob([JSON.stringify(state)]).size};}catch{return null}}
function mount(){if(localStorage.getItem(LOCK_KEY)!=='1')return;const row=current();setTimeout(()=>document.querySelector('.katos-recovery-vault')?.remove(),500);const old=document.querySelector('.katos-recovery-loaded');old?.remove();const bar=document.createElement('div');bar.className='katos-recovery-loaded';bar.style.cssText='position:fixed;z-index:100001;left:12px;right:12px;top:12px;padding:12px 14px;border:2px solid #df8faf;border-radius:18px;background:#fff7fb;box-shadow:0 10px 35px rgba(89,55,48,.18);color:#69483f;font:800 13px -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;display:flex;justify-content:space-between;align-items:center;gap:12px';bar.innerHTML=`<span>🍓 <b>Recovery mode is active.</b> ${row?`Loaded locally: <b>${row.total} records</b> · <b>${row.hq} Money HQ transactions</b>.`:''} Cloud writes are still frozen.</span><button type="button" style="border:0;border-radius:12px;padding:9px 11px;background:#f4dce7;color:#8c5368;font-weight:800">Hide</button>`;bar.querySelector('button').onclick=()=>bar.remove();document.body.appendChild(bar);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,350));else setTimeout(mount,350);
