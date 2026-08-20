/* KatOS V22.11.3: reliable Little Pings actions + recurring completion history. */
(()=>{
  if(window.__smLittlePingsHotfix)return;
  window.__smLittlePingsHotfix=true;

  const list=value=>Array.isArray(value)?value:(value&&typeof value==='object'?Object.values(value):[]);
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const todayKey=()=>dateKey(new Date());
  const tomorrowKey=()=>{const d=new Date();d.setDate(d.getDate()+1);return dateKey(d)};
  const makeId=()=>`ping-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const advance=(date,repeat)=>{
    const d=new Date(`${date||todayKey()}T12:00:00`);
    if(Number.isNaN(d.getTime()))return tomorrowKey();
    const step=()=>{
      if(repeat==='Daily')d.setDate(d.getDate()+1);
      else if(repeat==='Weekly')d.setDate(d.getDate()+7);
      else if(repeat==='Monthly')d.setMonth(d.getMonth()+1);
      else if(repeat==='Yearly')d.setFullYear(d.getFullYear()+1);
      else d.setDate(d.getDate()+1);
    };
    step();
    while(dateKey(d)<=todayKey())step();
    return dateKey(d);
  };

  const reminderTabActive=()=>!!document.querySelector('#v21-sidebar [data-nav="reminders"].active');

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

      const completedAt=new Date().toISOString();
      if(current.repeat){
        const history={...current,id:makeId(),parentReminderId:current.id,repeat:'',completed:true,completionRecord:true,completedAt,date:current.date||todayKey(),mochiniMentionedAt:''};
        const next=reminders.map(rem=>String(rem.id)===id?{...rem,date:advance(rem.date,rem.repeat),completed:false,completedAt:'',mochiniMentionedAt:''}:rem);
        return{...state,reminders:[...next,history]};
      }

      return{...state,reminders:reminders.map(rem=>String(rem.id)===id?{...rem,completed:true,completedAt,mochiniMentionedAt:''}:rem)};
    });
  },true);
})();
