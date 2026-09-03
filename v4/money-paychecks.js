import{normalizePaycheckCompatibility,repairPaycheckState,syncPaycheckIntoExistingLedger}from'./money-paycheck-sync.js';
import{syncPaycheckAccountBalance}from'./money-account-balance.js';

const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const num=v=>Math.max(0,Number(v)||0);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const currency=v=>rt.currency?rt.currency(v):`$${num(v).toFixed(2)}`;
const fmtDate=v=>rt.fmtDate?rt.fmtDate(v):text(v);
let editId='';

function paycheckRows(state){return list(state?.money?.earnings).filter(x=>(x.kind||'paycheck')==='paycheck')}
function activeAccounts(state){return list(state?.money?.accounts).filter(a=>!a?.id||!store.isArchived(state,'account',a.id))}
function accountName(id,state=rt.getState()){return activeAccounts(state).find(a=>String(a.id)===String(id))?.name||''}
function accountOptions(selected=''){
 const all=activeAccounts(rt.getState());
 return `<option value="">Unassigned · do not change an account</option>${all.map(a=>`<option value="${esc(a.id)}" ${String(a.id)===String(selected)?'selected':''}>${esc(a.name||'Account')}</option>`).join('')}`;
}
function isArchived(state,p){return store.isArchived(state,'earning',p.id)}
function amounts(p){
 const gross=num(p.grossAmount??p.actualGross??p.estimatedGross??p.amount);
 const expected=num(p.expectedAmount??p.expectedNet??p.netExpected??(p.status==='received'?p.receivedAmount:p.estimatedGross));
 const received=num(p.receivedAmount??p.actualNet??p.actualAmount);
 return{gross,expected,received};
}
function dateValue(v){return /^\d{4}-\d{2}-\d{2}$/.test(text(v))?text(v):''}

function injectStyles(){
 if(document.getElementById('money-paychecks-style'))return;
 const s=document.createElement('style');s.id='money-paychecks-style';s.textContent=`
 .paycheck-manager{margin-top:12px}.paycheck-intro{padding:13px 14px;border:1px solid #ead6df;border-radius:18px;background:linear-gradient(135deg,#fff8fb,#fff)}
 .paycheck-intro h2{margin:3px 0}.paycheck-intro p{margin:0;color:#8f707c}.paycheck-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
 .paycheck-stat{padding:10px 11px;border:1px solid #eedce4;border-radius:14px;background:#fff}.paycheck-stat small{display:block;font-size:9px;font-weight:850;color:#9a7482;letter-spacing:.06em}.paycheck-stat b{display:block;margin-top:3px;font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400;color:#654650}
 .paycheck-form{margin-top:12px;padding:14px;border:1px solid #ead6df;border-radius:19px;background:#fffafd}.paycheck-form .fields{margin-top:8px}.paycheck-list{display:grid;gap:9px;margin-top:12px}.paycheck-card{padding:13px;border:1px solid #ead6df;border-radius:18px;background:#fff}.paycheck-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.paycheck-card h3{margin:0;font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400}.paycheck-status{display:inline-flex;padding:4px 7px;border-radius:999px;background:#fff1f7;color:#88586d;font-size:9px;font-weight:850}.paycheck-money{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.paycheck-money div{padding:9px;border-radius:13px;background:#fff8fb;border:1px solid #f0dfe6}.paycheck-money small{display:block;font-size:8px;font-weight:850;color:#9a7482}.paycheck-money b{display:block;margin-top:2px}.paycheck-meta{display:block;margin-top:8px;color:#927780;font-size:10px}.paycheck-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}.paycheck-empty{padding:14px;border:1px dashed #e4cbd5;border-radius:15px;background:#fffafd;color:#927780}.paycheck-archived{margin-top:12px}.paycheck-archived summary{cursor:pointer;font-weight:850;color:#765462}@media(max-width:760px){.paycheck-grid,.paycheck-money{grid-template-columns:1fr}.paycheck-card-head{display:block}.paycheck-status{margin-top:5px}}
 `;document.head.appendChild(s);
}
function field(label,html,wide=''){return`<label class="field ${wide}"><span>${label}</span>${html}</label>`}
function formMarkup(p=null){
 const a=p?amounts(p):{gross:0,expected:0,received:0};
 return`<form class="paycheck-form" data-paycheck-form data-id="${esc(p?.id||'')}"><div class="ey">${p?'✏️ EDIT PAYCHECK':'＋ ADD PAYCHECK'}</div><div class="fields">
 ${field('Paycheck / employer',`<input name="label" required value="${esc(p?.label||p?.employer||'')}" placeholder="Butterfly Effects paycheck">`)}
 ${field('Status',`<select name="status"><option value="expected" ${p?.status!=='received'?'selected':''}>Expected</option><option value="received" ${p?.status==='received'?'selected':''}>Received</option></select>`)}
 ${field('Deposit to account',`<select name="accountId">${accountOptions(p?.accountId||'')}</select>`)}
 ${field('Gross · before deductions',`<input name="gross" type="number" min="0" step=".01" value="${p?a.gross:''}" placeholder="430.00">`)}
 ${field('Expected to hit',`<input name="expected" type="number" min="0" step=".01" value="${p?a.expected:''}" placeholder="370.00">`)}
 ${field('Actually received',`<input name="received" type="number" min="0" step=".01" value="${p?a.received:''}" placeholder="356.42">`)}
 ${field('Expected date',`<input name="expectedDate" type="date" value="${dateValue(p?.expectedDate||p?.date)}">`)}
 ${field('Received date',`<input name="receivedDate" type="date" value="${dateValue(p?.receivedDate)}">`)}
 ${field('Note · optional',`<input name="note" value="${esc(p?.note||'')}" placeholder="training pay, overtime, etc.">`,'full')}
 </div><div class="form-actions"><button class="btn primary">${p?'Save paycheck':'＋ Add paycheck'}</button>${p?'<button type="button" class="btn" data-paycheck-action="cancel">Cancel</button>':''}<span class="hint">Unassigned keeps this paycheck in the ledger without changing any account balance.</span></div></form>`;
}
function cardMarkup(p){
 const a=amounts(p),received=p.status==='received'||a.received>0;
 const acct=accountName(p.accountId);
 const dates=[p.expectedDate?`expected ${fmtDate(p.expectedDate)}`:'',p.receivedDate?`received ${fmtDate(p.receivedDate)}`:'',acct?`deposited to ${acct}`:'unassigned'].filter(Boolean).join(' · ');
 return`<article class="paycheck-card"><div class="paycheck-card-head"><div><h3>💸 ${esc(p.label||p.employer||'Paycheck')}</h3>${dates?`<span class="paycheck-meta">${esc(dates)}</span>`:''}</div><span class="paycheck-status">${received?'✓ RECEIVED':'⏳ EXPECTED'}</span></div><div class="paycheck-money"><div><small>GROSS</small><b>${currency(a.gross)}</b></div><div><small>EXPECTED TO HIT</small><b>${currency(a.expected)}</b></div><div><small>ACTUALLY RECEIVED</small><b>${a.received?currency(a.received):'Not yet'}</b></div></div>${p.note?`<span class="paycheck-meta">${esc(p.note)}</span>`:''}<div class="paycheck-actions"><button class="btn tiny" data-paycheck-action="edit" data-id="${esc(p.id)}">✏️ Edit</button><button class="btn tiny" data-paycheck-action="archive" data-id="${esc(p.id)}">📦 Archive</button><button class="btn tiny danger" data-paycheck-action="delete" data-id="${esc(p.id)}">× Delete</button></div></article>`;
}
function archivedMarkup(state,items){if(!items.length)return'';return`<details class="paycheck-archived"><summary>📦 Archived paychecks (${items.length})</summary><div class="paycheck-list">${items.map(p=>`<div class="paycheck-card"><div class="paycheck-card-head"><h3>📦 ${esc(p.label||p.employer||'Paycheck')}</h3><span>${currency(amounts(p).received||amounts(p).expected||amounts(p).gross)}</span></div><div class="paycheck-actions"><button class="btn tiny" data-paycheck-action="restore" data-id="${esc(p.id)}">↩ Restore</button><button class="btn tiny danger" data-paycheck-action="delete" data-id="${esc(p.id)}">× Delete</button></div></div>`).join('')}</div></details>`}
function managerMarkup(state){
 const all=paycheckRows(state),active=all.filter(p=>!isArchived(state,p)),archived=all.filter(p=>isArchived(state,p)),edit=active.find(p=>String(p.id)===String(editId));
 const expectedOpen=active.filter(p=>p.status!=='received').reduce((n,p)=>n+amounts(p).expected,0);
 const receivedTotal=active.filter(p=>p.status==='received'||amounts(p).received>0).reduce((n,p)=>n+amounts(p).received,0);
 return`<div class="paycheck-intro"><div class="ey">💸 PAYCHECK LEDGER</div><h2>What I earned vs what actually landed</h2><p>Gross, expected deposit, and actual deposit stay separate so taxes and deductions stop making the numbers look haunted.</p><div class="paycheck-grid"><div class="paycheck-stat"><small>PAYCHECK RECORDS</small><b>${active.length}</b></div><div class="paycheck-stat"><small>STILL EXPECTED</small><b>${currency(expectedOpen)}</b></div><div class="paycheck-stat"><small>ACTUALLY RECEIVED</small><b>${currency(receivedTotal)}</b></div></div></div>${formMarkup(edit||null)}<div class="paycheck-list">${active.length?active.slice().sort((a,b)=>String(b.receivedDate||b.expectedDate||b.createdAt).localeCompare(String(a.receivedDate||a.expectedDate||a.createdAt))).map(cardMarkup).join(''):'<div class="paycheck-empty">No paycheck records yet.</div>'}</div>${archivedMarkup(state,archived)}`;
}
function incomeContext(){
 if(!document.querySelector('.nav-btn.active[data-view="money"]'))return null;
 const tab=document.querySelector('.main .page .tab.active[data-money-tab="income"]');if(!tab)return null;
 const form=document.querySelector('.main .page form[data-form="earning"]');if(!form)return null;
 return{form,stack:form.nextElementSibling?.classList?.contains('stack')?form.nextElementSibling:null};
}
function install(){
 injectStyles();const ctx=incomeContext();if(!ctx)return;
 const card=ctx.form.closest('.card');if(!card||card.querySelector('[data-paycheck-manager]'))return;
 ctx.form.style.display='none';ctx.form.dataset.paycheckCoreHidden='1';
 if(ctx.stack){ctx.stack.style.display='none';ctx.stack.dataset.paycheckCoreHidden='1'}
 const manager=document.createElement('div');manager.className='paycheck-manager';manager.dataset.paycheckManager='1';manager.innerHTML=managerMarkup(rt.getState());ctx.form.insertAdjacentElement('afterend',manager);
}
function rerenderManager(){const manager=document.querySelector('[data-paycheck-manager]');if(manager)manager.innerHTML=managerMarkup(rt.getState())}
function savePaycheck(form){
 const fd=new FormData(form),state=clone(rt.getState()),id=text(form.dataset.id)||makeId('earning'),rows=list(state.money?.earnings),prior=rows.find(x=>String(x.id)===String(id));
 const gross=num(fd.get('gross')),expected=num(fd.get('expected')),received=num(fd.get('received')),status=text(fd.get('status'))==='received'?'received':'expected';
 const next=normalizePaycheckCompatibility({...prior,id,kind:'paycheck',label:text(fd.get('label'))||'Paycheck',employer:text(fd.get('label'))||text(prior?.employer),status,accountId:text(fd.get('accountId')),grossAmount:gross,estimatedGross:gross,expectedAmount:expected,receivedAmount:received,expectedDate:text(fd.get('expectedDate')),receivedDate:text(fd.get('receivedDate')),note:text(fd.get('note')),createdAt:prior?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});
 state.money={...(state.money||{}),earnings:prior?rows.map(x=>String(x.id)===String(id)?next:x):[...rows,next]};
 const balanced=syncPaycheckAccountBalance(state,next,prior);const synced=syncPaycheckIntoExistingLedger(balanced,next,prior);editId='';rt.setState(synced,prior?'Paycheck updated 💸':'Paycheck added 💸');
}
function mutate(id,action){
 let state=clone(rt.getState()),rows=list(state.money?.earnings),p=rows.find(x=>String(x.id)===String(id));if(!p)return;
 if(action==='archive'){state=store.archiveItem(state,'earning',id);editId='';rt.setState(state,'Paycheck archived');return}
 if(action==='restore'){state=store.restoreItem(state,'earning',id);rt.setState(state,'Paycheck restored');return}
 if(action==='delete'){
  if(!confirm('Delete this paycheck forever? Archive is safer if you may want the record later.'))return;
  state=syncPaycheckAccountBalance(state,{...p,status:'expected',received:false,receivedAmount:0,actualAmount:0,actualNet:0,accountId:''},p);
  const ledger=list(state.money?.ledger).filter(row=>!(row?.sourceType==='paycheck'&&String(row?.sourceId)===String(id))&&String(row?.id)!==`paycheck-${id}`);
  state.money={...(state.money||{}),earnings:rows.filter(x=>String(x.id)!==String(id)),...(list(state.money?.ledger).length?{ledger}:{})};
  state.v4={...(state.v4||{}),archive:list(state.v4?.archive).filter(x=>!(x.kind==='earning'&&String(x.id)===String(id)))};editId='';rt.setState(state,'Paycheck deleted');
 }
}

const repaired=repairPaycheckState(rt.getState());
if(repaired.changed)rt.setState(repaired.state,'Paycheck + ledger synced 💸');

document.addEventListener('submit',e=>{const form=e.target.closest?.('[data-paycheck-form]');if(!form)return;e.preventDefault();e.stopImmediatePropagation();savePaycheck(form)},true);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-paycheck-action]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const action=b.dataset.paycheckAction,id=b.dataset.id;if(action==='edit'){editId=id;rerenderManager()}else if(action==='cancel'){editId='';rerenderManager()}else mutate(id,action)},true);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})};new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});schedule();
