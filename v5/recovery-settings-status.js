const LOCK_KEY='sm_recovery_lock';
const V5_KEY='sm_v5_data';
const PROMOTED_KEY='sm_recovery_promoted_revision';
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
function localStatus(){
  try{
    const state=JSON.parse(localStorage.getItem(V5_KEY)||'null');
    if(!state||typeof state!=='object'||Array.isArray(state))return null;
    return{
      total:PATHS.reduce((n,p)=>n+list(get(state,p)).length,0),
      hq:list(get(state,'money.hq.transactions')).length,
      revision:localStorage.getItem(PROMOTED_KEY)||'5'
    };
  }catch{return null}
}
function mount(){
  document.querySelector('.katos-recovery-loaded')?.remove();
  document.querySelector('.katos-recovery-banner')?.remove();
  document.querySelector('.katos-recovery-vault')?.remove();
  if(localStorage.getItem(LOCK_KEY)!=='1')return;
  const title=document.querySelector('.top-title');
  const page=document.querySelector('.main .page')||document.querySelector('.main');
  if(!page||String(title?.textContent||'').trim()!=='Settings')return;
  if(page.querySelector('[data-recovery-settings-card]'))return;
  const row=localStatus();
  const card=document.createElement('section');
  card.className='card full cloud-account-card';
  card.dataset.recoverySettingsCard='';
  card.innerHTML=`<div class="card-head"><div><div class="ey">☁️ CLOUD SYNC</div><h2>Paused for now</h2><p>This iPad is the master KatOS while cloud sync takes a little timeout. Nothing will automatically pull over or replace this recovered copy.</p></div><span class="cloud-account-state offline">Paused</span></div><div class="button-row cloud-account-actions"><span>${row?`Local copy: <b>${row.total} records</b> · <b>${row.hq} Money HQ transactions</b> · recovered cloud revision <b>${row.revision}</b>.`:''} We can rebuild cross-device sync later from here.</span></div>`;
  const stats=page.querySelector('.room-stat-grid');
  if(stats)stats.insertAdjacentElement('afterend',card);else page.prepend(card);
}
window.addEventListener('katos:rendered',()=>queueMicrotask(mount));
setTimeout(mount,350);
