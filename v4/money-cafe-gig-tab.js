const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const money=n=>Number(n)||0;
const SOURCE_ORDER=['doordash','shipt','other-gig'];

export function gigSourceLabel(source=''){
  const s=String(source||'').toLowerCase();
  return s==='doordash'?'DoorDash':s==='shipt'?'Shipt':'Other gig';
}
export function gigSourceIcon(source=''){
  const s=String(source||'').toLowerCase();
  return s==='doordash'?'🚗':s==='shipt'?'🛍️':'✨';
}
export function localDateKey(value=new Date()){
  const d=value instanceof Date?value:new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
export function gigDateKey(entry={}){
  return String(entry?.date||entry?.receivedDate||entry?.expectedDate||'').slice(0,10);
}
export function buildGigTabModel(earnings=[],nowValue=new Date()){
  const now=nowValue instanceof Date?new Date(nowValue):new Date(nowValue);
  const safeNow=Number.isNaN(now.getTime())?new Date():now;
  const monthStart=new Date(safeNow.getFullYear(),safeNow.getMonth(),1);
  const weekStart=new Date(safeNow.getFullYear(),safeNow.getMonth(),safeNow.getDate()-safeNow.getDay());
  const to=localDateKey(safeNow),weekFrom=localDateKey(weekStart),monthFrom=localDateKey(monthStart);
  const rows=list(earnings).filter(e=>['doordash','shipt','other-gig'].includes(String(e?.incomeSource||e?.gigSource||e?.source||'').toLowerCase()));
  const amount=e=>money(e?.receivedAmount??e?.amount??e?.actualGross??e?.estimatedGross??e?.grossEarned);
  const inRange=(e,from)=>{const d=gigDateKey(e);return d&&d>=from&&d<=to};
  const total=items=>items.reduce((sum,e)=>sum+amount(e),0);
  const monthRows=rows.filter(e=>inRange(e,monthFrom));
  const weekRows=rows.filter(e=>inRange(e,weekFrom));
  const recent=rows.slice().sort((a,b)=>gigDateKey(b).localeCompare(gigDateKey(a))||String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,12);
  return {
    weekTotal:total(weekRows),
    monthTotal:total(monthRows),
    allTimeTotal:total(rows),
    monthBySource:Object.fromEntries(SOURCE_ORDER.map(source=>[source,total(monthRows.filter(e=>String(e?.incomeSource||e?.gigSource||e?.source||'').toLowerCase()===source))])),
    recent,
    count:rows.length
  };
}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
  const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
  const rt=await waitRuntime();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currency=v=>rt.currency?rt.currency(v):`$${money(v).toFixed(2)}`;
  const fmtDate=v=>rt.fmtDate?rt.fmtDate(v):text(v);
  const clone=v=>structuredClone(v);

  function injectStyles(){
    if(document.getElementById('money-cafe-gigs-tab-style'))return;
    const style=document.createElement('style');
    style.id='money-cafe-gigs-tab-style';
    style.textContent=`
      .money-gig-moved-form{display:none!important}
      .money-gig-core-hidden{display:none!important}
      .gig-tab-panel{display:grid;gap:14px;margin-top:14px}
      .gig-tab-hero{position:relative;overflow:hidden;padding:18px;border:1px solid #ecd1dc;border-radius:22px;background:linear-gradient(135deg,#fff8fb 0%,#fff 52%,#f7efff 100%)}
      .gig-tab-hero:after{content:'🍓';position:absolute;right:18px;top:12px;font-size:34px;opacity:.16;transform:rotate(10deg)}
      .gig-tab-hero h2{margin:4px 0 3px}.gig-tab-hero p{margin:0;max-width:640px;color:#8b707a}
      .gig-glance{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .gig-stat{padding:14px;border:1px solid #edd9e1;border-radius:18px;background:#fff}
      .gig-stat small{display:block;color:#a06c80;font-size:9px;font-weight:900;letter-spacing:.08em}.gig-stat b{display:block;margin-top:3px;color:#614650;font-size:21px}.gig-stat span{display:block;margin-top:2px;color:#9a7c87;font-size:10px}
      .gig-workbench{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:12px}
      .gig-box{padding:15px;border:1px solid #ead4dd;border-radius:20px;background:#fff}
      .gig-box h3{margin:3px 0;color:#654751;font-size:17px}.gig-box p{margin:0 0 10px;color:#987a86;font-size:11px}
      .gig-source-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .gig-source{padding:11px;border-radius:16px;background:linear-gradient(145deg,#fff,#fff6fa);border:1px solid #efdce4;min-width:0}
      .gig-source .icon{font-size:20px}.gig-source b{display:block;margin-top:4px;color:#674a55}.gig-source span{display:block;margin-top:2px;color:#9c7a87;font-size:10px}
      .gig-history{display:grid;gap:8px}.gig-history-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 11px;border:1px solid #efdee5;border-radius:15px;background:#fffafd}
      .gig-history-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:#f9eaf1;font-size:17px}.gig-history-copy{min-width:0}.gig-history-copy b{display:block;color:#624650}.gig-history-copy span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#997b86;font-size:10px}.gig-history-amount{font-weight:900;color:#8c4f6b}
      .gig-empty{padding:14px;border-radius:16px;background:#fff6fa;color:#8d6e79;font-size:11px}
      .gig-tab-panel .fields{align-items:end}.gig-tab-panel .btn.primary{box-shadow:0 5px 14px rgba(184,88,130,.12)}
      @media(max-width:820px){.gig-workbench{grid-template-columns:1fr}.gig-glance{grid-template-columns:repeat(3,minmax(120px,1fr));overflow-x:auto}.gig-source-grid{grid-template-columns:1fr 1fr 1fr}}
      @media(max-width:620px){.gig-glance,.gig-source-grid{grid-template-columns:1fr}.gig-history-row{grid-template-columns:auto minmax(0,1fr)}.gig-history-amount{grid-column:2}.gig-tab-panel .fields{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function sourceCards(model){
    return SOURCE_ORDER.map(source=>`<div class="gig-source"><span class="icon">${gigSourceIcon(source)}</span><b>${gigSourceLabel(source)}</b><span>${currency(model.monthBySource[source]||0)} this month</span></div>`).join('');
  }

  function historyRows(model){
    return model.recent.map(entry=>{const source=String(entry.incomeSource||entry.gigSource||entry.source||'other-gig').toLowerCase();const amount=entry.receivedAmount??entry.amount??entry.actualGross??entry.estimatedGross??entry.grossEarned??0;const meta=[gigDateKey(entry)?fmtDate(gigDateKey(entry)):'No date',text(entry.note)].filter(Boolean).join(' · ');return `<div class="gig-history-row"><div class="gig-history-icon">${gigSourceIcon(source)}</div><div class="gig-history-copy"><b>${esc(gigSourceLabel(source))}</b><span>${esc(meta)}</span></div><div class="gig-history-amount">${currency(amount)}</div></div>`}).join('');
  }

  function panelHTML(state){
    const model=buildGigTabModel(state?.money?.earnings,new Date());
    return `<div class="gig-tab-panel" data-money-gigs-panel>
      <section class="gig-tab-hero"><div class="ey">⚡ GIGS</div><h2>Side quest money, but make it count</h2><p>DoorDash, Shipt, and whatever other little money adventure happened today. Log it here and KatOS will keep the running receipts.</p></section>
      <div class="gig-glance"><div class="gig-stat"><small>THIS WEEK</small><b>${currency(model.weekTotal)}</b><span>gig money survived into existence</span></div><div class="gig-stat"><small>THIS MONTH</small><b>${currency(model.monthTotal)}</b><span>all gig sources combined</span></div><div class="gig-stat"><small>ALL TIME LOGGED</small><b>${currency(model.allTimeTotal)}</b><span>${model.count} gig entr${model.count===1?'y':'ies'}</span></div></div>
      <div class="gig-workbench"><section class="gig-box"><div class="ey">💸 QUICK LOG</div><h3>Okayyy what did we make?</h3><p>Log the actual amount you earned. Tiny note is optional.</p><form data-form="gig-earning"><div class="fields"><label class="field"><span>Gig app</span><select name="source"><option value="doordash">DoorDash</option><option value="shipt">Shipt</option><option value="other-gig">Other gig</option></select></label><label class="field"><span>Amount</span><input name="amount" type="number" min="0.01" step=".01" required placeholder="$0.00"></label><label class="field"><span>Date</span><input name="date" type="date" value="${esc(rt.today?rt.today():localDateKey())}"></label><label class="field"><span>Tiny note · optional</span><input name="note" placeholder="Dinner rush, promo, unicorn order…"></label></div><div class="form-actions"><button class="btn primary">＋ Log gig money</button></div></form></section><section class="gig-box"><div class="ey">🍓 THIS MONTH BY APP</div><h3>Who paid the most?</h3><p>A tiny scoreboard, not a performance review.</p><div class="gig-source-grid">${sourceCards(model)}</div></section></div>
      <section class="gig-box"><div class="ey">🧾 RECENT GIGS</div><h3>The side-quest receipts</h3><p>Your newest 12 gig entries live here.</p><div class="gig-history">${model.recent.length?historyRows(model):'<div class="gig-empty">No gig income logged yet. The side-quest ledger is extremely peaceful. ✨</div>'}</div></section>
    </div>`;
  }

  function enhance(){
    injectStyles();
    const title=text(document.querySelector('.top-title')?.textContent);
    if(title!=='Money Café')return;
    const card=document.querySelector('.page > .card.full');
    const tabs=card?.querySelector(':scope > .tabs');
    if(!card||!tabs)return;
    const state=rt.getState();
    const active=state?.v4?.ui?.moneyTab==='gigs';
    let button=tabs.querySelector('[data-money-gigs-tab]');
    if(!button){button=document.createElement('button');button.type='button';button.className='tab';button.dataset.moneyGigsTab='1';button.textContent='⚡ Gigs';const income=tabs.querySelector('[data-money-tab="income"]');if(income)income.after(button);else tabs.appendChild(button)}
    button.classList.toggle('active',active);
    const oldQuick=card.querySelector('form[data-form="gig-earning"]:not([data-gig-dedicated-form])');
    if(oldQuick&&!oldQuick.closest('[data-money-gigs-panel]'))oldQuick.classList.add('money-gig-moved-form');
    const existing=card.querySelector('[data-money-gigs-panel]');
    if(!active){
      existing?.remove();
      card.querySelectorAll(':scope > .money-gig-core-hidden').forEach(el=>el.classList.remove('money-gig-core-hidden'));
      return;
    }
    if(existing)return;
    [...card.children].forEach(child=>{if(child!==tabs)child.classList.add('money-gig-core-hidden')});
    const wrap=document.createElement('div');wrap.innerHTML=panelHTML(state);const panel=wrap.firstElementChild;panel.querySelector('form[data-form="gig-earning"]')?.setAttribute('data-gig-dedicated-form','1');card.appendChild(panel);
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-money-gigs-tab]');
    if(!button)return;
    const next=clone(rt.getState());
    next.v4=next.v4&&typeof next.v4==='object'?next.v4:{};
    next.v4.ui=next.v4.ui&&typeof next.v4.ui==='object'?next.v4.ui:{};
    next.v4.ui.moneyTab='gigs';
    rt.setState(next,'Gig tab opened');
  });

  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})};
  const app=document.getElementById('app');
  if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  schedule();
}
