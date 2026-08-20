/* KatOS V22.11.4: reliable Little Pings actions + one recurring completion per day. */
(()=>{
  if(window.__smLittlePingsHotfixV22114)return;
  window.__smLittlePingsHotfixV22114=true;

  const list=value=>Array.isArray(value)?value:(value&&typeof value==='object'?Object.values(value):[]);
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const todayKey=()=>dateKey(new Date());
  const tomorrowKey=()=>{const d=new Date();d.setDate(d.getDate()+1);return dateKey(d)};
  const makeId=()=>`ping-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const advanceFrom=(date,repeat)=>{
    const d=new Date(`${date||todayKey()}T12:00:00`);
    if(Number.isNaN(d.getTime()))return tomorrowKey();
    if(repeat==='Daily')d.setDate(d.getDate()+1);
    else if(repeat==='Weekly')d.setDate(d.getDate()+7);
    else if(repeat==='Monthly')d.setMonth(d.getMonth()+1);
    else if(repeat==='Yearly')d.setFullYear(d.getFullYear()+1);
    else d.setDate(d.getDate()+1);
    return dateKey(d);
  };
  const nextAfterToday=(date,repeat)=>{
    let next=advanceFrom(date||todayKey(),repeat);
    let guard=0;
    while(next<=todayKey()&&guard++<400)next=advanceFrom(next,repeat);
    return next;
  };
  const reminderTabActive=()=>!!document.querySelector('#v21-sidebar [data-nav="reminders"].active');

  const cleanupAccidentalFutureCompletions=()=>{
    const store=window.__smStore;
    if(!store?.update)return;
    const today=todayKey();
    store.update(state=>{
      const reminders=list(state.reminders);
      const badHistory=reminders.filter(rem=>rem?.completionRecord===true&&String(rem.date||'')>today);
      const affectedParents=new Set(badHistory.map(rem=>String(rem.parentReminderId||'')).filter(Boolean));
      let changed=badHistory.length>0;
      let next=reminders.filter(rem=>!(rem?.completionRecord===true&&String(rem.date||'')>today));
      next=next.map(rem=>{
        const futureCompleted=rem?.completed===true&&String(rem.date||'')>today&&rem?.completedAt&&dateKey(new Date(rem.completedAt))===today;
        if(futureCompleted&&!rem.completionRecord){changed=true;return{...rem,completed:false,completedAt:'',mochiniMentionedAt:''}}
        if(rem?.repeat&&affectedParents.has(String(rem.id))){const target=nextAfterToday(today,rem.repeat);if(rem.date!==target||rem.lastCompletedDate!==today){changed=true;return{...rem,date:target,completed:false,completedAt:'',lastCompletedDate:today,mochiniMentionedAt:''}}}
        return rem;
      });
      return changed?{...state,reminders:next}:state;
    });
  };

  const runCleanup=()=>{if(window.__smStore?.update)cleanupAccidentalFutureCompletions();else setTimeout(runCleanup,120)};
  runCleanup();

  document.addEventListener('click',event=>{
    if(!reminderTabActive())return;
    const button=event.target?.closest?.('.v17-reminder-row [data-complete],.v17-reminder-row [data-tomorrow]');
    if(!button)return;
    const store=window.__smStore;
    if(!store?.update)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if(button.dataset.tomorrow){
      const id=String(button.dataset.tomorrow);
      store.update(state=>({...state,reminders:list(state.reminders).map(rem=>String(rem.id)===id?{...rem,date:tomorrowKey(),completed:false,completedAt:'',mochiniMentionedAt:''}:rem)}));
      return;
    }

    const id=String(button.dataset.complete||'');
    store.update(state=>{
      const reminders=list(state.reminders),current=reminders.find(rem=>String(rem.id)===id);
      if(!current)return state;

      if(current.completed){
        return{...state,reminders:reminders.map(rem=>String(rem.id)===id?{...rem,completed:false,completedAt:''}:rem)};
      }

      const today=todayKey();
      const completedAt=new Date().toISOString();
      if(current.repeat){
        if(current.lastCompletedDate===today||reminders.some(rem=>rem?.completionRecord===true&&String(rem.parentReminderId||'')===id&&String(rem.date||'')===today))return state;
        const history={...current,id:makeId(),parentReminderId:current.id,repeat:'',completed:true,completionRecord:true,completedAt,date:today,mochiniMentionedAt:''};
        const nextDate=nextAfterToday(current.date&&current.date>today?today:current.date||today,current.repeat);
        const next=reminders.map(rem=>String(rem.id)===id?{...rem,date:nextDate,completed:false,completedAt:'',lastCompletedDate:today,mochiniMentionedAt:''}:rem);
        return{...state,reminders:[...next,history]};
      }

      return{...state,reminders:reminders.map(rem=>String(rem.id)===id?{...rem,completed:true,completedAt,mochiniMentionedAt:''}:rem)};
    });
  },true);
})();
