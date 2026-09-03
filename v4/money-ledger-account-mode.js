import{applyLedgerEntryToAccounts,normalizeLedgerAccountLinks}from'./money-account-balance.js';

const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const list=v=>Array.isArray(v)?v:[];
const clone=v=>structuredClone(v);
const text=v=>String(v??'').trim();
const money=v=>Math.round((Number(v)||0)*100)/100;
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const today=()=>rt.today?rt.today():new Date().toISOString().slice(0,10);

function activeAccounts(state){return list(state?.money?.accounts).filter(a=>!a?.id||!store.isArchived(state,'account',a.id))}
function resolveAccount(value,all){const raw=text(value);const match=all.find(a=>String(a.id)===raw)||all.find(a=>text(a.name).toLowerCase()===raw.toLowerCase());return match?String(match.id):''}

const migrated=normalizeLedgerAccountLinks(rt.getState());
if(migrated.changed)rt.setState(migrated.state,'Account balances normalized');

document.addEventListener('submit',event=>{
 const form=event.target.closest?.('[data-money-ledger-add]');if(!form)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 const fd=new FormData(form),state=clone(rt.getState()),all=activeAccounts(state),kind=text(fd.get('kind')),label=text(fd.get('label')),amount=Math.abs(money(fd.get('amount'))),from=resolveAccount(fd.get('accountId'),all),to=resolveAccount(fd.get('toAccountId'),all);
 if(!label||!amount){alert('Give this transaction a name and amount first.');return}
 if(kind==='transfer'&&(!from||!to||from===to)){alert('Choose two different accounts for a transfer.');return}
 const entry={id:makeId('ledger'),kind:['income','expense','transfer'].includes(kind)?kind:'expense',label,amount,date:text(fd.get('date'))||today(),category:text(fd.get('category'))||'Other',accountId:'',toAccountId:'',balanceAccountId:from,balanceToAccountId:to,accountBalanceApplied:true,note:'',createdAt:new Date().toISOString()};
 let next=applyLedgerEntryToAccounts(state,entry,1);next.money={...(next.money||{}),ledger:[...list(next.money?.ledger),entry],ledgerUpdatedAt:new Date().toISOString(),ledgerAccountMode:'current-balance'};
 rt.setState(next,'Money ledger updated');
},true);

document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-ledger-remove]');if(!button)return;
 const id=String(button.dataset.ledgerRemove||''),state=clone(rt.getState()),ledger=list(state.money?.ledger),entry=ledger.find(row=>String(row?.id)===id);if(!entry)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 if(!confirm(`Remove “${entry.label||'this transaction'}” from the ledger?`))return;
 let next=applyLedgerEntryToAccounts(state,entry,-1);next.money={...(next.money||{}),ledger:list(next.money?.ledger).filter(row=>String(row?.id)!==id),ledgerUpdatedAt:new Date().toISOString()};
 rt.setState(next,'Ledger entry removed');
},true);
