const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const amount=v=>Math.round((Number(v)||0)*100)/100;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

export const SAVINGS_PRIORITIES=[
  {id:'high',label:'🔥 High',hint:'actively funding'},
  {id:'medium',label:'🧡 Medium',hint:'steady little progress'},
  {id:'low',label:'🌸 Low',hint:'crumbs are legal'}
];

export const STARTER_SAVINGS_PILES=[
  {name:'Oh Shit Fund',emoji:'🛟',priority:'high',note:'Real emergencies only.'},
  {name:'Next Month Me',emoji:'🌙',priority:'high',note:'A buffer for next month’s essential expenses.'},
  {name:'Car Survival',emoji:'🚗',priority:'medium',note:'Repairs, tires, maintenance, and car surprises.'},
  {name:'Bye Bye Car Payment',emoji:'🚘',priority:'low',note:'Extra money toward paying the current car off early.'},
  {name:'Texas Escape Fund',emoji:'🤠',priority:'low',note:'Future Arlington move costs and setup money.'},
  {name:'Pink House Fund',emoji:'🏡',priority:'low',note:'Future down payment, closing, and home setup.'},
  {name:'Tiny Business Empire',emoji:'💼',priority:'low',note:'Future side-hustle and business experiments.'}
];

export function normalizeSavingsGoal(value={},index=0){
  const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const priority=SAVINGS_PRIORITIES.some(x=>x.id===v.priority)?v.priority:'medium';
  const current=Math.max(0,amount(v.current));
  const target=Math.max(0,amount(v.target));
  return {
    ...v,
    id:text(v.id)||`savings-${index}`,
    name:text(v.name)||'Future Kat fund',
    emoji:text(v.emoji)||'💗',
    current,
    target,
    priority,
    contributionPercent:clamp(amount(v.contributionPercent??v.allocationPercent),0,100),
    targetDate:text(v.targetDate),
    note:text(v.note),
    paused:v.paused===true,
    activity:list(v.activity).map((entry,i)=>({
      id:text(entry?.id)||`activity-${i}`,
      delta:amount(entry?.delta),
      note:text(entry?.note),
      createdAt:text(entry?.createdAt)
    })),
    createdAt:text(v.createdAt)||new Date().toISOString(),
    updatedAt:text(v.updatedAt)
  };
}

export function normalizeSavingsGoals(rows=[]){return list(rows).map(normalizeSavingsGoal)}

export function savingsProgress(goal={}){
  const g=normalizeSavingsGoal(goal);
  return g.target>0?clamp(g.current/g.target*100,0,100):0;
}

export function savingsSummary(rows=[]){
  const goals=normalizeSavingsGoals(rows);
  const active=goals.filter(g=>!g.paused);
  return {
    totalSaved:amount(goals.reduce((sum,g)=>sum+g.current,0)),
    totalTarget:amount(goals.reduce((sum,g)=>sum+g.target,0)),
    activeAllocation:amount(active.reduce((sum,g)=>sum+g.contributionPercent,0)),
    activeCount:active.length,
    pausedCount:goals.length-active.length,
    count:goals.length
  };
}

const priorityRank={high:0,medium:1,low:2};
export function sortSavingsGoals(rows=[]){
  return normalizeSavingsGoals(rows).slice().sort((a,b)=>Number(a.paused)-Number(b.paused)||(priorityRank[a.priority]??9)-(priorityRank[b.priority]??9)||a.name.localeCompare(b.name));
}

export function upsertSavingsGoal(rows=[],input={}){
  const goals=normalizeSavingsGoals(rows);
  const id=text(input.id);
  const prior=id?goals.find(g=>g.id===id):null;
  const now=new Date().toISOString();
  const goal=normalizeSavingsGoal({
    ...prior,
    ...input,
    id:id||text(input.newId)||`savings-${Date.now().toString(36)}`,
    createdAt:prior?.createdAt||text(input.createdAt)||now,
    updatedAt:now,
    activity:prior?.activity||list(input.activity)
  });
  return prior?goals.map(g=>g.id===goal.id?goal:g):[...goals,goal];
}

export function adjustSavingsGoal(rows=[],id,delta,note=''){
  const goals=normalizeSavingsGoals(rows),target=text(id),requested=amount(delta),now=new Date().toISOString();
  return goals.map(goal=>{
    if(goal.id!==target||requested===0)return goal;
    const nextCurrent=Math.max(0,amount(goal.current+requested));
    const actualDelta=amount(nextCurrent-goal.current);
    if(actualDelta===0)return goal;
    return {...goal,current:nextCurrent,updatedAt:now,activity:[{id:`saving-move-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,delta:actualDelta,note:text(note),createdAt:now},...goal.activity].slice(0,50)};
  });
}

export function toggleSavingsPaused(rows=[],id){
  const target=text(id),now=new Date().toISOString();
  return normalizeSavingsGoals(rows).map(goal=>goal.id===target?{...goal,paused:!goal.paused,updatedAt:now}:goal);
}

export function deleteSavingsGoal(rows=[],id){const target=text(id);return normalizeSavingsGoals(rows).filter(goal=>goal.id!==target)}

export function addStarterSavingsPiles(rows=[],makeId){
  let goals=normalizeSavingsGoals(rows);
  const existing=new Set(goals.map(g=>g.name.toLowerCase()));
  const now=new Date().toISOString();
  for(const seed of STARTER_SAVINGS_PILES){
    if(existing.has(seed.name.toLowerCase()))continue;
    const id=typeof makeId==='function'?makeId('savings'):`savings-${Date.now().toString(36)}-${goals.length}`;
    goals.push(normalizeSavingsGoal({...seed,id,current:0,target:0,contributionPercent:0,paused:false,createdAt:now}));
    existing.add(seed.name.toLowerCase());
  }
  return goals;
}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
  const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
  const rt=await waitRuntime();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currency=v=>rt.currency?rt.currency(v):`$${amount(v).toFixed(2)}`;
  const clone=v=>structuredClone(v);
  let editingId='';
  let adjusting=null;

  function injectStyles(){
    if(document.getElementById('money-savings-piles-style'))return;
    const style=document.createElement('style');
    style.id='money-savings-piles-style';
    style.textContent=`
      .savings-piles-panel{display:grid;gap:14px;margin-top:14px}
      .savings-piles-hero{position:relative;overflow:hidden;padding:18px;border:1px solid #ecd1dc;border-radius:22px;background:linear-gradient(135deg,#fff7fb 0%,#fff 54%,#fff3f7 100%)}
      .savings-piles-hero:after{content:'🏡';position:absolute;right:18px;top:10px;font-size:38px;opacity:.11;transform:rotate(8deg)}
      .savings-piles-hero h2{margin:4px 0 3px}.savings-piles-hero p{margin:0;max-width:720px;color:#8b707a}
      .savings-piles-glance{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .savings-piles-stat{padding:13px;border:1px solid #edd9e1;border-radius:18px;background:#fff}
      .savings-piles-stat small{display:block;color:#a06c80;font-size:9px;font-weight:900;letter-spacing:.08em}.savings-piles-stat b{display:block;margin-top:3px;color:#614650;font-size:20px}.savings-piles-stat span{display:block;margin-top:2px;color:#9a7c87;font-size:10px}
      .savings-piles-box{padding:15px;border:1px solid #ead4dd;border-radius:20px;background:#fff}
      .savings-piles-box h3{margin:3px 0;color:#654751;font-size:17px}.savings-piles-box p{margin:0 0 10px;color:#987a86;font-size:11px}
      .savings-piles-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      .savings-pile{display:grid;gap:10px;padding:15px;border:1px solid #ead7df;border-radius:20px;background:linear-gradient(145deg,#fff,#fff9fc)}
      .savings-pile.paused{opacity:.72;background:#fbf8fa}.savings-pile-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start}.savings-pile-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:#faeaf1;font-size:21px}.savings-pile-copy{min-width:0}.savings-pile-copy b{display:block;color:#624650;font-size:15px}.savings-pile-copy p{margin:2px 0 0;color:#977984;font-size:10px;white-space:normal}
      .savings-pile-money{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.savings-pile-money b{color:#754d60;font-size:18px}.savings-pile-money span{color:#9b7b87;font-size:10px}
      .savings-pile .progress{height:9px}.savings-pile-meta{display:flex;flex-wrap:wrap;gap:6px}.savings-pill{padding:4px 7px;border-radius:999px;background:#f8edf2;color:#865d6e;font-size:9px;font-weight:800}.savings-pill.pause{background:#f2eef0;color:#7e7076}
      .savings-pile-actions{display:flex;flex-wrap:wrap;gap:6px}.savings-pile-actions .btn{margin:0}
      .savings-pile-activity{display:grid;gap:4px;padding-top:2px}.savings-pile-activity div{display:flex;justify-content:space-between;gap:8px;color:#9a7c87;font-size:9px}.savings-pile-activity b{color:#755563}
      .savings-piles-warning{padding:10px 12px;border:1px solid #ecced9;border-radius:15px;background:#fff6fa;color:#7d5363;font-size:10px}
      .savings-piles-edit{padding:13px;border:1px dashed #e2bccb;border-radius:17px;background:#fff8fb}.savings-piles-edit h4{margin:0 0 8px;color:#6c4b57}.savings-piles-edit .fields{margin-bottom:9px}
      .savings-template-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}
      @media(max-width:900px){.savings-piles-glance{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:720px){.savings-piles-grid{grid-template-columns:1fr}.savings-piles-panel .fields{grid-template-columns:1fr!important}}
      @media(max-width:520px){.savings-piles-glance{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function priorityLabel(value){return SAVINGS_PRIORITIES.find(x=>x.id===value)?.label||'🧡 Medium'}
  function dateLabel(value){if(!value)return'';return rt.fmtDate?rt.fmtDate(value):value}
  function formFields(goal={}){
    const g=normalizeSavingsGoal(goal);
    return `<div class="fields">
      <label class="field"><span>Emoji</span><input name="emoji" maxlength="4" value="${esc(g.emoji)}" placeholder="💗"></label>
      <label class="field"><span>Fund name</span><input name="name" required value="${esc(g.name==='Future Kat fund'&& !goal?.name?'':g.name)}" placeholder="Oh Shit Fund"></label>
      <label class="field"><span>Current amount</span><input name="current" type="number" min="0" step=".01" value="${g.current||''}" placeholder="0.00"></label>
      <label class="field"><span>Target</span><input name="target" type="number" min="0" step=".01" value="${g.target||''}" placeholder="1000"></label>
      <label class="field"><span>Priority</span><select name="priority">${SAVINGS_PRIORITIES.map(p=>`<option value="${p.id}" ${g.priority===p.id?'selected':''}>${p.label} · ${p.hint}</option>`).join('')}</select></label>
      <label class="field"><span>Contribution split %</span><input name="contributionPercent" type="number" min="0" max="100" step="1" value="${g.contributionPercent||''}" placeholder="0"></label>
      <label class="field"><span>Target date · optional</span><input name="targetDate" type="date" value="${esc(g.targetDate)}"></label>
      <label class="field wide"><span>Tiny note · optional</span><input name="note" value="${esc(g.note)}" placeholder="What this pile is for / when I can touch it"></label>
    </div>`;
  }

  function activityHTML(goal){
    const recent=list(goal.activity).slice(0,3);
    if(!recent.length)return '';
    return `<div class="savings-pile-activity">${recent.map(entry=>`<div><span>${entry.delta>=0?'＋':'−'} ${esc(entry.note||'fund update')}</span><b>${entry.delta>=0?'+':''}${currency(entry.delta)}</b></div>`).join('')}</div>`;
  }

  function pileCard(goal){
    const pct=savingsProgress(goal),remaining=Math.max(0,amount(goal.target-goal.current));
    const edit=editingId===goal.id?`<div class="savings-piles-edit"><h4>✏️ Edit this pile</h4><form data-savings-piles-form="edit"><input type="hidden" name="id" value="${esc(goal.id)}">${formFields(goal)}<div class="form-actions"><button class="btn primary">Save pile</button><button class="btn" type="button" data-savings-action="cancel-edit">Cancel</button></div></form></div>`:'';
    const adjust=adjusting?.id===goal.id?`<div class="savings-piles-edit"><h4>${adjusting.mode==='use'?'↩ Use money from this pile':'＋ Add money to this pile'}</h4><form data-savings-piles-form="adjust"><input type="hidden" name="id" value="${esc(goal.id)}"><input type="hidden" name="mode" value="${esc(adjusting.mode)}"><div class="fields"><label class="field"><span>Amount</span><input name="amount" type="number" min="0.01" step=".01" required autofocus placeholder="0.00"></label><label class="field"><span>Note · optional</span><input name="note" placeholder="Payday transfer, car repair, etc."></label></div><div class="form-actions"><button class="btn primary">${adjusting.mode==='use'?'Use it':'Add it'}</button><button class="btn" type="button" data-savings-action="cancel-adjust">Cancel</button></div></form></div>`:'';
    return `<article class="savings-pile ${goal.paused?'paused':''}" data-savings-pile-id="${esc(goal.id)}">
      <div class="savings-pile-head"><div class="savings-pile-icon">${esc(goal.emoji)}</div><div class="savings-pile-copy"><b>${esc(goal.name)}</b><p>${esc(goal.note||'Future Kat is quietly cooking.')}</p></div></div>
      <div><div class="savings-pile-money"><b>${currency(goal.current)}</b><span>${goal.target>0?`${pct.toFixed(0)}% of ${currency(goal.target)}`:'No target yet'}</span></div><div class="progress"><i style="width:${pct}%"></i></div>${goal.target>0?`<div style="margin-top:4px;color:#9a7c87;font-size:9px">${remaining>0?`${currency(remaining)} to go`:'Target reached ✨'}</div>`:''}</div>
      <div class="savings-pile-meta"><span class="savings-pill">${priorityLabel(goal.priority)}</span><span class="savings-pill">${goal.contributionPercent}% split</span>${goal.targetDate?`<span class="savings-pill">🎯 ${esc(dateLabel(goal.targetDate))}</span>`:''}${goal.paused?'<span class="savings-pill pause">⏸ Paused</span>':''}</div>
      ${activityHTML(goal)}
      <div class="savings-pile-actions"><button class="btn tiny primary" type="button" data-savings-action="adjust" data-mode="add" data-id="${esc(goal.id)}">＋ Add $</button><button class="btn tiny" type="button" data-savings-action="adjust" data-mode="use" data-id="${esc(goal.id)}">↩ Use $</button><button class="btn tiny" type="button" data-savings-action="edit" data-id="${esc(goal.id)}">✏️ Edit</button><button class="btn tiny" type="button" data-savings-action="pause" data-id="${esc(goal.id)}">${goal.paused?'▶ Resume':'⏸ Pause'}</button><button class="btn tiny danger" type="button" data-savings-action="delete" data-id="${esc(goal.id)}">×</button></div>
      ${adjust}${edit}
    </article>`;
  }

  function panelHTML(state){
    const goals=sortSavingsGoals(state?.money?.savingsGoals),summary=savingsSummary(goals);
    const allocationNote=summary.activeAllocation>100?`⚠️ Active contribution splits add up to ${summary.activeAllocation}%. Trim them to 100% or less so Future Kat isn't budgeting imaginary dollars.`:summary.activeAllocation<100?`${amount(100-summary.activeAllocation)}% of your optional savings split is still unassigned. Totally legal while priorities are changing.`:'✨ Your active contribution split adds up to exactly 100%.';
    return `<div class="savings-piles-panel" data-savings-piles-panel>
      <section class="savings-piles-hero"><div class="ey">💗 FUTURE KAT</div><h2>Little piles, big escape plan</h2><p>Give every savings bucket a job, change the priority whenever life changes, and pause a goal without deleting the dream.</p></section>
      <div class="savings-piles-glance"><div class="savings-piles-stat"><small>TOTAL SAVED</small><b>${currency(summary.totalSaved)}</b><span>across all piles</span></div><div class="savings-piles-stat"><small>COMBINED TARGETS</small><b>${currency(summary.totalTarget)}</b><span>targets can change whenever</span></div><div class="savings-piles-stat"><small>ACTIVE SPLIT</small><b>${summary.activeAllocation}%</b><span>planning guide, not auto-transfer</span></div><div class="savings-piles-stat"><small>ACTIVE PILES</small><b>${summary.activeCount}</b><span>${summary.pausedCount} paused</span></div></div>
      <div class="savings-piles-warning">${esc(allocationNote)}</div>
      <section class="savings-piles-box"><div class="ey">＋ NEW PILE</div><h3>What is Future Kat hoarding money for?</h3><p>The contribution percentage is just your plan for splitting whatever amount you decide is available to save. KatOS does not move bank money automatically.</p><form data-savings-piles-form="add">${formFields({emoji:'💗',priority:'medium'})}<div class="form-actions"><button class="btn primary">＋ Add savings pile</button><button class="btn" type="button" data-savings-action="starter">🍓 Add my starter pile set</button></div></form><div class="savings-template-row"><span class="chip">🛟 emergencies</span><span class="chip">🌙 next month buffer</span><span class="chip">🚗 car</span><span class="chip">🤠 Texas</span><span class="chip">🏡 pink house</span><span class="chip">💼 business</span></div></section>
      <section class="savings-piles-box"><div class="ey">🫙 MY PILES</div><h3>${goals.length?`${goals.length} money bucket${goals.length===1?'':'s'} currently plotting`:'No piles yet'}</h3><p>High-priority active goals float to the top. Paused goals stay visible so the dream doesn't get eaten by the void.</p><div class="savings-piles-grid">${goals.length?goals.map(pileCard).join(''):'<div class="empty">Add your first savings pile above, or use the starter set and edit the hell out of it. 💗</div>'}</div></section>
    </div>`;
  }

  function replaceSavingsBody(){
    injectStyles();
    const state=rt.getState();
    if(state?.v4?.ui?.moneyTab!=='savings')return;
    const card=document.querySelector('.page > .card.full');
    const tabs=card?.querySelector(':scope > .tabs');
    if(!card||!tabs)return;
    if(card.querySelector(':scope > [data-savings-piles-panel]'))return;
    [...card.children].forEach(child=>{if(child!==tabs)child.remove()});
    const wrap=document.createElement('div');wrap.innerHTML=panelHTML(state);card.appendChild(wrap.firstElementChild);
  }

  function saveRows(rows,msg){
    const next=clone(rt.getState());
    next.money=next.money&&typeof next.money==='object'?next.money:{};
    next.money.savingsGoals=rows;
    rt.setState(next,msg);
  }

  document.addEventListener('submit',event=>{
    const form=event.target.closest('form[data-savings-piles-form]');
    if(!form)return;
    event.preventDefault();
    const data=Object.fromEntries(new FormData(form).entries()),state=rt.getState(),rows=state?.money?.savingsGoals;
    if(form.dataset.savingsPilesForm==='add'){
      const next=upsertSavingsGoal(rows,{newId:rt.makeId?rt.makeId('savings'):'',name:data.name,emoji:data.emoji,current:data.current,target:data.target,priority:data.priority,contributionPercent:data.contributionPercent,targetDate:data.targetDate,note:data.note,paused:false});
      saveRows(next,'Savings pile added');
    }else if(form.dataset.savingsPilesForm==='edit'){
      const next=upsertSavingsGoal(rows,{id:data.id,name:data.name,emoji:data.emoji,current:data.current,target:data.target,priority:data.priority,contributionPercent:data.contributionPercent,targetDate:data.targetDate,note:data.note});
      editingId='';saveRows(next,'Savings pile updated');
    }else if(form.dataset.savingsPilesForm==='adjust'){
      const raw=Math.max(0,amount(data.amount)),delta=data.mode==='use'?-raw:raw;
      adjusting=null;saveRows(adjustSavingsGoal(rows,data.id,delta,data.note),data.mode==='use'?'Savings used from pile':'Savings added to pile');
    }
  },true);

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-savings-action]');
    if(!button)return;
    event.preventDefault();
    const action=button.dataset.savingsAction,id=button.dataset.id,state=rt.getState(),rows=state?.money?.savingsGoals;
    if(action==='edit'){editingId=editingId===id?'':id;adjusting=null;const panel=document.querySelector('[data-savings-piles-panel]');if(panel){panel.remove();replaceSavingsBody()}}
    else if(action==='cancel-edit'){editingId='';const panel=document.querySelector('[data-savings-piles-panel]');if(panel){panel.remove();replaceSavingsBody()}}
    else if(action==='adjust'){adjusting={id,mode:button.dataset.mode==='use'?'use':'add'};editingId='';const panel=document.querySelector('[data-savings-piles-panel]');if(panel){panel.remove();replaceSavingsBody()}}
    else if(action==='cancel-adjust'){adjusting=null;const panel=document.querySelector('[data-savings-piles-panel]');if(panel){panel.remove();replaceSavingsBody()}}
    else if(action==='pause')saveRows(toggleSavingsPaused(rows,id),'Savings pile status updated');
    else if(action==='delete'){const goal=normalizeSavingsGoals(rows).find(g=>g.id===id);if(goal&&confirm(`Delete ${goal.name} for real? Pausing is safer if this is just a temporary nope.`)){editingId='';adjusting=null;saveRows(deleteSavingsGoal(rows,id),'Savings pile deleted')}}
    else if(action==='starter')saveRows(addStarterSavingsPiles(rows,rt.makeId),'Starter savings piles added');
  },true);

  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;replaceSavingsBody()})};
  const app=document.getElementById('app');
  if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  schedule();
}
