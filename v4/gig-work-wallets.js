const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const gig=window.__KATOS_V4_DEPS?.gig;
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const money=v=>Math.round(num(v)*100)/100;
const currency=v=>rt.currency?rt.currency(v):new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(money(v));
const today=()=>rt.today?rt.today():new Date().toISOString().slice(0,10);
const fmtDate=v=>rt.fmtDate?rt.fmtDate(v):text(v);
const fmtTime=v=>rt.fmtTime?rt.fmtTime(v):text(v);
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const SOURCE_LABELS={paycheck:'Paycheck',gig:'Gig wallet'};
const APP_LABELS={shipt:'Shipt',doordash:'DoorDash','other-gig':'Other gig'};
const APP_ICONS={shipt:'🛍️',doordash:'🚗','other-gig':'✨'};

function ensureState(raw){
 const state=raw||{};
 state.money={...(state.money||{})};
 state.money.sourceWallets={...(state.money.sourceWallets||{})};
 state.money.sourceSpending=list(state.money.sourceSpending);
 state.money.earnings=list(state.money.earnings);
 state.work={...(state.work||{})};
 state.work.gigShifts=list(state.work.gigShifts);
 return state;
}
function isGigIncome(e={}){return Boolean(gig?.isGigIncome?gig.isGigIncome(e):['shipt','doordash','other-gig'].includes(text(e.incomeSource||e.gigSource||e.source).toLowerCase()))}
function incomeAmount(e={}){return money(isGigIncome(e)?(gig?.gigAmount?gig.gigAmount(e):e.receivedAmount??e.amount??e.actualGross??e.estimatedGross):(e.receivedAmount??e.actualNet??e.amount??e.actualGross??e.estimatedGross))}
function isPaycheckIncome(e={}){if(isGigIncome(e))return false;return (e.kind||'paycheck')==='paycheck'&&(e.status==='received'||Boolean(e.receivedDate&&incomeAmount(e)>0))}
function moment(e={}){return text(e.receivedAt||e.updatedAt||e.createdAt)||(text(e.receivedDate||e.date)?`${text(e.receivedDate||e.date).slice(0,10)}T23:59:59.999Z`:'')}
function sourceIncomeAfter(state,source,asOf=''){
 return list(state.money?.earnings).filter(e=>source==='gig'?isGigIncome(e):isPaycheckIncome(e)).filter(e=>!asOf||moment(e)>asOf).reduce((s,e)=>s+incomeAmount(e),0);
}
function sourceSpendAfter(state,source,asOf=''){
 return list(state.money?.sourceSpending).filter(e=>e.source===source).filter(e=>!asOf||text(e.createdAt)>asOf).reduce((s,e)=>s+money(e.amount),0);
}
function historicalSourceBalance(state,source){return money(sourceIncomeAfter(state,source,'')-sourceSpendAfter(state,source,''))}
function walletInfo(state,source){
 const row=state.money?.sourceWallets?.[source];
 if(!row||!Number.isFinite(Number(row.balance)))return{configured:false,current:historicalSourceBalance(state,source),baseline:0,asOf:''};
 const baseline=money(row.balance),asOf=text(row.asOf);
 return{configured:true,baseline,asOf,current:money(baseline+sourceIncomeAfter(state,source,asOf)-sourceSpendAfter(state,source,asOf))};
}
function monthStart(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`}
function appMonthTotals(state){
 const rows=list(state.money?.earnings).filter(isGigIncome).filter(e=>{const d=text(e.receivedDate||e.date||e.expectedDate).slice(0,10);return d&&d>=monthStart()&&d<=today()});
 const total=app=>money(rows.filter(e=>text(e.incomeSource||e.gigSource||e.source).toLowerCase()===app).reduce((s,e)=>s+incomeAmount(e),0));
 return{shipt:total('shipt'),doordash:total('doordash'),'other-gig':total('other-gig')};
}
function sourceSpends(state){return list(state.money?.sourceSpending).slice().sort((a,b)=>text(b.date||b.createdAt).localeCompare(text(a.date||a.createdAt))).slice(0,8)}
function activeGigShifts(state){return list(state.work?.gigShifts).slice().sort((a,b)=>`${text(a.date)} ${text(a.startTime)}`.localeCompare(`${text(b.date)} ${text(b.startTime)}`))}

function injectStyles(){
 if(document.getElementById('gig-work-wallets-style'))return;
 const s=document.createElement('style');s.id='gig-work-wallets-style';s.textContent=`
 .katos-source-card,.katos-gig-shifts-card{margin-top:14px;padding:16px;border:1px solid #ead5de;border-radius:22px;background:linear-gradient(135deg,#fff8fb 0%,#fff 55%,#fbf5ff 100%)}
 .ks-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.ks-head h2{margin:3px 0;color:#624650}.ks-head p{margin:0;color:#927780;font-size:11px;max-width:640px}.ks-kicker{font-size:9px;font-weight:900;letter-spacing:.08em;color:#9e6179}.ks-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:13px}.ks-wallet{padding:14px;border:1px solid #ecd9e1;border-radius:18px;background:#fff}.ks-wallet-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ks-wallet small{display:block;font-size:8px;font-weight:900;letter-spacing:.07em;color:#98727f}.ks-wallet b{display:block;margin-top:2px;font-family:var(--katos-title,Georgia,serif);font-size:26px;font-weight:400;color:#654650}.ks-wallet .ks-note{display:block;margin-top:3px;color:#9a7b86;font-size:9px}.ks-set{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:10px}.ks-set input,.ks-form input,.ks-form select,.kg-form input,.kg-form select{width:100%;min-width:0;padding:10px;border:1px solid #e5ced7;border-radius:12px;background:#fff;font:inherit;color:inherit}.ks-set button{white-space:nowrap}.ks-apps{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.ks-chip{padding:6px 9px;border-radius:999px;background:#fbf1f6;border:1px solid #eedce4;color:#735563;font-size:9px;font-weight:800}.ks-section{margin-top:14px;padding-top:13px;border-top:1px dashed #dfc9d2}.ks-section h3{margin:2px 0;color:#654650;font-size:17px}.ks-form,.kg-form{display:grid;grid-template-columns:1fr 1fr 1fr 1.4fr auto;gap:8px;align-items:end;margin-top:9px}.ks-field,.kg-field{display:grid;gap:4px;min-width:0}.ks-field span,.kg-field span{font-size:8px;font-weight:900;color:#7b5c69}.ks-history,.kg-list{display:grid;gap:7px;margin-top:10px}.ks-row,.kg-row{display:flex;gap:9px;align-items:center;padding:9px 10px;border:1px solid #eedde4;border-radius:14px;background:#fff}.ks-row-main,.kg-row-main{flex:1;min-width:0}.ks-row b,.kg-row b{display:block;color:#654650}.ks-row small,.kg-row small{display:block;margin-top:2px;color:#967984;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ks-row-amount{font-weight:900;color:#8c4f6b;white-space:nowrap}.ks-actions,.kg-actions{display:flex;gap:5px;flex-wrap:wrap}.ks-empty{padding:11px;border-radius:14px;background:#fff5f9;color:#8e707b;font-size:10px}.kg-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.kg-stat{padding:11px;border:1px solid #ecd9e1;border-radius:15px;background:#fff}.kg-stat small{display:block;font-size:8px;font-weight:900;color:#98727f}.kg-stat b{display:block;margin-top:2px;font-family:var(--katos-title,Georgia,serif);font-size:21px;font-weight:400;color:#654650}.kg-form{grid-template-columns:1fr 1fr 1fr 1fr 1fr 1.3fr auto}.kg-status{padding:4px 7px;border-radius:999px;background:#f7edf3;color:#805a6a;font-size:8px;font-weight:900}.kg-done{background:#edf7ef;color:#55715c}.kg-row.completed{opacity:.82}.kg-row.completed .kg-row-main b{text-decoration:line-through;text-decoration-thickness:1px}.ks-help{margin-top:8px;color:#9a7b86;font-size:9px}
 @media(max-width:900px){.ks-form{grid-template-columns:1fr 1fr}.kg-form{grid-template-columns:1fr 1fr}.ks-form .btn,.kg-form .btn{width:100%}.ks-grid{grid-template-columns:1fr}.kg-summary{grid-template-columns:1fr 1fr 1fr}}
 @media(max-width:560px){.ks-form,.kg-form,.kg-summary{grid-template-columns:1fr}.ks-row,.kg-row{align-items:flex-start;flex-wrap:wrap}.ks-row-amount{margin-left:auto}.ks-actions,.kg-actions{width:100%}.ks-set{grid-template-columns:1fr}.ks-set button{width:100%}}
 `;document.head.appendChild(s);
}

function walletMarkup(state){
 const paycheck=walletInfo(state,'paycheck'),gigs=walletInfo(state,'gig'),apps=appMonthTotals(state),spends=sourceSpends(state);
 const wallet=(source,info,icon)=>`<div class="ks-wallet"><div class="ks-wallet-top"><div><small>${esc(SOURCE_LABELS[source].toUpperCase())} AVAILABLE</small><b>${currency(info.current)}</b><span class="ks-note">${info.configured?'Tracks new income and spending from your last reset':'Estimate from logged history · set this once to match real life'}</span></div><span style="font-size:24px">${icon}</span></div><form class="ks-set" data-source-balance-form data-source="${source}"><input name="balance" type="number" step=".01" min="0" inputmode="decimal" placeholder="Set current amount" aria-label="Set ${SOURCE_LABELS[source]} current amount"><button class="btn tiny" type="submit">Set current</button></form>${source==='gig'?`<div class="ks-apps"><span class="ks-chip">🛍️ Shipt ${currency(apps.shipt)}</span><span class="ks-chip">🚗 DoorDash ${currency(apps.doordash)}</span>${apps['other-gig']?`<span class="ks-chip">✨ Other ${currency(apps['other-gig'])}</span>`:''}</div>`:''}</div>`;
 return `<section class="katos-source-card" data-source-wallet-card><div class="ks-head"><div><div class="ks-kicker">💸 MONEY SOURCES</div><h2>What money is actually left?</h2><p>Paycheck money and gig money can live in the same bank account without becoming the same thing. Set the current amount once, then KatOS tracks new income and spending from there.</p></div></div><div class="ks-grid">${wallet('paycheck',paycheck,'💼')}${wallet('gig',gigs,'⚡')}</div><div class="ks-section"><div class="ks-kicker">🧾 SPEND FROM A SOURCE</div><h3>Tell KatOS which pile paid for it</h3><form class="ks-form" data-source-spend-form><input type="hidden" name="editId"><label class="ks-field"><span>PAID FROM</span><select name="source"><option value="gig">Gig wallet</option><option value="paycheck">Paycheck</option></select></label><label class="ks-field"><span>AMOUNT</span><input name="amount" type="number" step=".01" min=".01" required placeholder="0.00"></label><label class="ks-field"><span>DATE</span><input name="date" type="date" value="${today()}" required></label><label class="ks-field"><span>NOTE</span><input name="note" placeholder="Gas, Temu, food…"></label><button class="btn primary" type="submit" data-source-spend-save>＋ Log spend</button></form><div class="ks-help">For your current situation, you can set the Gig wallet to the amount you truly have left right now. New Shipt/DoorDash earnings will add on after that.</div><div class="ks-history">${spends.length?spends.map(r=>`<div class="ks-row"><div>${r.source==='gig'?'⚡':'💼'}</div><div class="ks-row-main"><b>${esc(SOURCE_LABELS[r.source]||r.source)}</b><small>${esc(fmtDate(r.date||''))}${r.note?` · ${esc(r.note)}`:''}</small></div><span class="ks-row-amount">− ${currency(r.amount)}</span><div class="ks-actions"><button type="button" class="btn tiny" data-source-spend-action="edit" data-id="${esc(r.id)}">✏️</button><button type="button" class="btn tiny danger" data-source-spend-action="delete" data-id="${esc(r.id)}">×</button></div></div>`).join(''):'<div class="ks-empty">No source spending logged yet.</div>'}</div></div></section>`;
}

function gigShiftMarkup(state){
 const shifts=activeGigShifts(state),upcoming=shifts.filter(s=>s.status!=='completed'&&text(s.date)>=today()),planned=money(upcoming.reduce((sum,s)=>sum+num(s.target),0)),done=shifts.filter(s=>s.status==='completed'),actual=money(done.reduce((sum,s)=>sum+num(s.actual),0));
 return `<section class="katos-gig-shifts-card" data-gig-shifts-card><div class="ks-head"><div><div class="ks-kicker">⚡ GIG SHIFTS</div><h2>Schedule the money-making blocks</h2><p>Plan Shipt or DoorDash like a real shift, give it a target, then log the actual amount when you finish. Completed earnings flow into Money Café automatically.</p></div></div><div class="kg-summary"><div class="kg-stat"><small>UPCOMING SHIFTS</small><b>${upcoming.length}</b></div><div class="kg-stat"><small>PLANNED TARGET</small><b>${currency(planned)}</b></div><div class="kg-stat"><small>ACTUAL LOGGED</small><b>${currency(actual)}</b></div></div><form class="kg-form" data-gig-shift-form><input type="hidden" name="editId"><label class="kg-field"><span>APP</span><select name="app"><option value="shipt">Shipt</option><option value="doordash">DoorDash</option><option value="other-gig">Other gig</option></select></label><label class="kg-field"><span>DATE</span><input name="date" type="date" value="${today()}" required></label><label class="kg-field"><span>START</span><input name="startTime" type="time"></label><label class="kg-field"><span>END</span><input name="endTime" type="time"></label><label class="kg-field"><span>TARGET</span><input name="target" type="number" min="0" step=".01" placeholder="200"></label><label class="kg-field"><span>NOTE</span><input name="note" placeholder="Dinner rush, daytime Shipt…"></label><button class="btn primary" type="submit" data-gig-shift-save>＋ Save shift</button></form><div class="kg-list">${shifts.length?shifts.map(s=>{const completed=s.status==='completed';const meta=[fmtDate(s.date),s.startTime?`${fmtTime(s.startTime)}${s.endTime?`–${fmtTime(s.endTime)}`:''}`:'',num(s.target)?`target ${currency(s.target)}`:'',completed?`actual ${currency(s.actual)}`:'',s.note].filter(Boolean).join(' · ');return`<div class="kg-row ${completed?'completed':''}"><div style="font-size:20px">${APP_ICONS[s.app]||'✨'}</div><div class="kg-row-main"><b>${esc(APP_LABELS[s.app]||'Gig shift')}</b><small>${esc(meta)}</small></div><span class="kg-status ${completed?'kg-done':''}">${completed?'DONE':'PLANNED'}</span><div class="kg-actions">${!completed?`<button type="button" class="btn tiny" data-gig-shift-action="finish" data-id="${esc(s.id)}">✓ Finish</button><button type="button" class="btn tiny" data-gig-shift-action="edit" data-id="${esc(s.id)}">✏️</button>`:''}<button type="button" class="btn tiny danger" data-gig-shift-action="delete" data-id="${esc(s.id)}">×</button></div></div>`}).join(''):'<div class="ks-empty">No gig shifts scheduled yet. Add the blocks you already know you want to work.</div>'}</div></section>`;
}

function moneyPage(){return document.querySelector('.nav-btn.active[data-view="money"]')?.closest('body')?document.querySelector('.main .page'):null}
function bossPage(){return document.querySelector('.nav-btn.active[data-view="boss"]')?.closest('body')?document.querySelector('.main .page'):null}
function shouldShowMoney(){if(!document.querySelector('.nav-btn.active[data-view="money"]'))return false;return Boolean(document.querySelector('[data-money-tab="overview"].active')||document.querySelector('[data-money-gigs-tab].active'))}
function renderMoney(){
 if(!shouldShowMoney()){document.querySelector('[data-source-wallet-card]')?.remove();return}
 const page=moneyPage();if(!page||page.querySelector('[data-source-wallet-card]'))return;
 const wrap=document.createElement('div');wrap.innerHTML=walletMarkup(ensureState(rt.getState()));page.appendChild(wrap.firstElementChild);
}
function renderBoss(){
 if(!document.querySelector('.nav-btn.active[data-view="boss"]')){document.querySelector('[data-gig-shifts-card]')?.remove();return}
 const page=bossPage();if(!page||page.querySelector('[data-gig-shifts-card]'))return;
 const wrap=document.createElement('div');wrap.innerHTML=gigShiftMarkup(ensureState(rt.getState()));page.appendChild(wrap.firstElementChild);
}
function rerender(){document.querySelector('[data-source-wallet-card]')?.remove();document.querySelector('[data-gig-shifts-card]')?.remove();renderMoney();renderBoss()}

function setWallet(source,balance){
 const n=Number(balance);if(!Number.isFinite(n)||n<0){alert('Enter the amount you actually have left right now.');return}
 const state=ensureState(clone(rt.getState()));state.money.sourceWallets[source]={balance:money(n),asOf:new Date().toISOString(),updatedAt:new Date().toISOString()};rt.setState(state,`${SOURCE_LABELS[source]} current amount updated`);
}
function saveSpend(form){
 const fd=new FormData(form),amount=Number(fd.get('amount')),source=text(fd.get('source')),date=text(fd.get('date'))||today(),note=text(fd.get('note')),editId=text(fd.get('editId'));
 if(!['paycheck','gig'].includes(source)||!Number.isFinite(amount)||amount<=0){alert('Choose a source and enter an amount above $0.');return}
 const state=ensureState(clone(rt.getState()));
 if(editId){state.money.sourceSpending=state.money.sourceSpending.map(r=>String(r.id)===editId?{...r,source,amount:money(amount),date,note,updatedAt:new Date().toISOString()}:r)}
 else state.money.sourceSpending.push({id:makeId('source-spend'),source,amount:money(amount),date,note,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
 rt.setState(state,editId?'Source spending updated':'Source spending logged');
}
function editSpend(id){const row=list(rt.getState()?.money?.sourceSpending).find(r=>String(r.id)===String(id)),form=document.querySelector('[data-source-spend-form]');if(!row||!form)return;form.elements.editId.value=row.id;form.elements.source.value=row.source;form.elements.amount.value=row.amount;form.elements.date.value=row.date||today();form.elements.note.value=row.note||'';form.querySelector('[data-source-spend-save]').textContent='Save spend';form.scrollIntoView({behavior:'smooth',block:'center'})}
function deleteSpend(id){if(!confirm('Delete this source spending entry?'))return;const state=ensureState(clone(rt.getState()));state.money.sourceSpending=state.money.sourceSpending.filter(r=>String(r.id)!==String(id));rt.setState(state,'Source spending deleted')}

function saveGigShift(form){
 const fd=new FormData(form),editId=text(fd.get('editId')),app=text(fd.get('app')),date=text(fd.get('date'))||today(),startTime=text(fd.get('startTime')),endTime=text(fd.get('endTime')),target=Math.max(0,num(fd.get('target'))),note=text(fd.get('note'));
 if(!['shipt','doordash','other-gig'].includes(app)||!date){alert('Pick the gig app and date.');return}
 if(startTime&&endTime&&endTime<=startTime){alert('End time needs to be after start time.');return}
 const state=ensureState(clone(rt.getState()));
 if(editId){state.work.gigShifts=state.work.gigShifts.map(s=>String(s.id)===editId?{...s,app,date,startTime,endTime,target:money(target),note,updatedAt:new Date().toISOString()}:s)}
 else state.work.gigShifts.push({id:makeId('gig-shift'),app,date,startTime,endTime,target:money(target),note,status:'planned',actual:0,earningId:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
 rt.setState(state,editId?'Gig shift updated':'Gig shift scheduled');
}
function editGigShift(id){const row=list(rt.getState()?.work?.gigShifts).find(s=>String(s.id)===String(id)),form=document.querySelector('[data-gig-shift-form]');if(!row||!form)return;form.elements.editId.value=row.id;form.elements.app.value=row.app;form.elements.date.value=row.date||today();form.elements.startTime.value=row.startTime||'';form.elements.endTime.value=row.endTime||'';form.elements.target.value=row.target||'';form.elements.note.value=row.note||'';form.querySelector('[data-gig-shift-save]').textContent='Save changes';form.scrollIntoView({behavior:'smooth',block:'center'})}
function deleteGigShift(id){const row=list(rt.getState()?.work?.gigShifts).find(s=>String(s.id)===String(id));if(!row)return;if(!confirm(row.status==='completed'?'Delete this completed shift? Its logged earning will stay in Money Café.':'Delete this planned gig shift?'))return;const state=ensureState(clone(rt.getState()));state.work.gigShifts=state.work.gigShifts.filter(s=>String(s.id)!==String(id));rt.setState(state,'Gig shift deleted')}
function finishGigShift(id){
 const raw=rt.getState(),row=list(raw?.work?.gigShifts).find(s=>String(s.id)===String(id));if(!row||row.status==='completed')return;
 const answer=prompt(`How much did you actually make on this ${APP_LABELS[row.app]||'gig'} shift?`,row.target?String(row.target):'');if(answer===null)return;const actual=Number(answer);if(!Number.isFinite(actual)||actual<0){alert('Enter a valid amount.');return}
 const state=ensureState(clone(raw));let earningId='';
 if(actual>0){const earning=gig?.createGigEarning?gig.createGigEarning({source:row.app,amount:actual,date:row.date||today(),note:`Gig shift${row.note?` · ${row.note}`:''}`}):{id:makeId('gig'),kind:'gig',incomeSource:row.app,amount:money(actual),receivedAmount:money(actual),status:'received',date:row.date||today(),receivedDate:row.date||today(),createdAt:new Date().toISOString()};if(earning){earningId=earning.id;state.money.earnings.push(earning)}}
 state.work.gigShifts=state.work.gigShifts.map(s=>String(s.id)===String(id)?{...s,status:'completed',actual:money(actual),earningId,completedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}:s);rt.setState(state,`Gig shift finished · ${currency(actual)} logged`);
}

document.addEventListener('submit',e=>{
 const balance=e.target.closest?.('[data-source-balance-form]');if(balance){e.preventDefault();setWallet(balance.dataset.source,balance.elements.balance.value);return}
 const spend=e.target.closest?.('[data-source-spend-form]');if(spend){e.preventDefault();saveSpend(spend);return}
 const shift=e.target.closest?.('[data-gig-shift-form]');if(shift){e.preventDefault();saveGigShift(shift)}
},true);
document.addEventListener('click',e=>{
 const spend=e.target.closest?.('[data-source-spend-action]');if(spend){const action=spend.dataset.sourceSpendAction,id=spend.dataset.id;if(action==='edit')editSpend(id);if(action==='delete')deleteSpend(id);return}
 const shift=e.target.closest?.('[data-gig-shift-action]');if(shift){const action=shift.dataset.gigShiftAction,id=shift.dataset.id;if(action==='edit')editGigShift(id);if(action==='delete')deleteGigShift(id);if(action==='finish')finishGigShift(id)}
},true);

injectStyles();
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;renderMoney();renderBoss()})};
const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
window.addEventListener('katos:state-changed',()=>{requestAnimationFrame(rerender)});
schedule();
