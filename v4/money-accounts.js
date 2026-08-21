const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currency=v=>rt.currency?rt.currency(v):new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(Number(v)||0);
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

function activeAccounts(state){return list(state?.money?.accounts).filter(a=>!a?.id||!store.isArchived(state,'account',a.id))}
function total(accounts){return accounts.reduce((sum,a)=>sum+Number(a.balance||0),0)}

function injectStyles(){if(document.getElementById('money-accounts-style'))return;const style=document.createElement('style');style.id='money-accounts-style';style.textContent=`
.money-accounts-card{margin-top:12px;border:1px solid #ead6de;border-radius:18px;background:linear-gradient(135deg,#fff,#fff7fb);padding:14px}.money-accounts-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px}.money-accounts-total{text-align:right}.money-accounts-total b{display:block;font-family:var(--katos-title,Georgia,serif);font-size:27px;font-weight:400;color:#654650}.money-accounts-total span{font-size:9px;color:#92747f;font-weight:800}.money-account-list{display:grid;gap:8px}.money-account-row{display:grid;grid-template-columns:minmax(150px,1.4fr) minmax(110px,.8fr) minmax(130px,.9fr) auto;gap:8px;align-items:end;padding:10px;border:1px solid #eddce2;border-radius:14px;background:#fff}.money-account-field{display:grid;gap:4px}.money-account-field span{font-size:9px;font-weight:850;color:#7e606b}.money-account-field input,.money-account-field select{width:100%;padding:9px 10px;border:1px solid #e5ced7;border-radius:11px;background:#fff;font:inherit}.money-account-save{align-self:end}.money-account-add{margin-top:10px;padding-top:10px;border-top:1px dashed #e5cfd8}.money-account-add .fields{margin-top:7px}@media(max-width:760px){.money-account-row{grid-template-columns:1fr 1fr}.money-account-save{grid-column:1/-1}.money-accounts-head{align-items:flex-start;flex-direction:column}.money-accounts-total{text-align:left}}@media(max-width:520px){.money-account-row{grid-template-columns:1fr}}
`;document.head.appendChild(style)}

function render(){
  injectStyles();
  const active=document.querySelector('.nav-btn.active[data-view="money"]');
  if(!active)return;
  const overview=document.querySelector('[data-money-tab="overview"].active');
  if(!overview)return;
  if(document.querySelector('[data-money-accounts]'))return;
  const state=rt.getState(),accounts=activeAccounts(state);
  const tabs=overview.closest('.tabs');
  const host=tabs?.parentElement;
  if(!host)return;
  const card=document.createElement('section');
  card.className='money-accounts-card';card.dataset.moneyAccounts='1';
  card.innerHTML=`<div class="money-accounts-head"><div><div class="ey">💳 WHAT I ACTUALLY HAVE</div><h2 style="margin:3px 0">Current account balances</h2><p style="margin:0">Update these whenever reality changes. Money Café totals use these balances immediately.</p></div><div class="money-accounts-total"><b>${currency(total(accounts))}</b><span>across ${accounts.length} account${accounts.length===1?'':'s'}</span></div></div><div class="money-account-list">${accounts.length?accounts.map(a=>`<form class="money-account-row" data-money-account-save="${esc(a.id)}"><label class="money-account-field"><span>Account</span><input name="name" value="${esc(a.name||'Account')}" required></label><label class="money-account-field"><span>Type</span><select name="type">${['checking','savings','cash','other'].map(t=>`<option value="${t}" ${a.type===t?'selected':''}>${t}</option>`).join('')}</select></label><label class="money-account-field"><span>Current balance</span><input name="balance" type="number" step="0.01" value="${Number(a.balance||0)}" inputmode="decimal"></label><button class="btn primary money-account-save">Save balance</button></form>`).join(''):'<div class="empty">No accounts yet. Add the first one below.</div>'}</div><form class="money-account-add" data-money-account-add><div class="ey">＋ ADD AN ACCOUNT</div><div class="fields"><label class="field"><span>Name</span><input name="name" required placeholder="Navy checking"></label><label class="field"><span>Type</span><select name="type"><option value="checking">checking</option><option value="savings">savings</option><option value="cash">cash</option><option value="other">other</option></select></label><label class="field"><span>Current balance</span><input name="balance" type="number" step="0.01" value="0" inputmode="decimal"></label></div><div class="form-actions"><button class="btn">＋ Add account</button></div></form>`;
  const summary=host.querySelector('.summary-grid');
  if(summary)summary.insertAdjacentElement('afterend',card);else host.appendChild(card);
}

function saveAccount(form){const id=form.dataset.moneyAccountSave,state=clone(rt.getState()),accounts=list(state.money?.accounts),i=accounts.findIndex(a=>String(a.id)===String(id));if(i<0)return;const fd=new FormData(form);accounts[i]={...accounts[i],name:text(fd.get('name'))||'Account',type:['checking','savings','cash','other'].includes(text(fd.get('type')))?text(fd.get('type')):'checking',balance:Number(fd.get('balance'))||0,updatedAt:new Date().toISOString()};state.money.accounts=accounts;rt.setState(state,'Account balance updated')}
function addAccount(form){const fd=new FormData(form),state=clone(rt.getState());state.money={...(state.money||{}),accounts:[...list(state.money?.accounts),{id:makeId('account'),name:text(fd.get('name'))||'Account',type:['checking','savings','cash','other'].includes(text(fd.get('type')))?text(fd.get('type')):'checking',balance:Number(fd.get('balance'))||0,createdAt:new Date().toISOString()}]};rt.setState(state,'Account added')}

document.addEventListener('submit',e=>{const save=e.target.closest?.('[data-money-account-save]');if(save){e.preventDefault();e.stopImmediatePropagation();saveAccount(save);return}const add=e.target.closest?.('[data-money-account-add]');if(add){e.preventDefault();e.stopImmediatePropagation();addAccount(add)}},true);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})};new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});schedule();
