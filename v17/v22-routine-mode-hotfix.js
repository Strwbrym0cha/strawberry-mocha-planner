/* KatOS V22.11.5: reliable Routine Mode controls, especially on iPad touch. */
import{reconcileRoutineTaskBotState}from'./app/routine-taskbot.js?v=22.5.1-20260819';

(()=>{
  if(window.__smRoutineModeHotfixV22115)return;
  window.__smRoutineModeHotfixV22115=true;

  const list=value=>Array.isArray(value)?value:[];
  const same=(a,b)=>String(a??'')===String(b??'');
  const day=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const getStore=()=>window.__smStore;
  const findRoutine=(state,id)=>list(state.routines).find(r=>same(r.id,id))||null;

  const style=document.createElement('style');
  style.id='sm-routine-mode-hotfix-style';
  style.textContent=`
    .sm-routine-overlay{z-index:1400!important;pointer-events:auto!important;touch-action:pan-y!important}
    .sm-routine-overlay button,.sm-routine-chip{pointer-events:auto!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent}
    .sm-routine-overlay-actions{position:relative!important;z-index:2!important}
  `;
  document.head.appendChild(style);

  const reconcile=()=>{
    const store=getStore();
    if(!store?.update)return;
    store.update(state=>{
      const result=reconcileRoutineTaskBotState(state||{},day());
      return result.changed?result.state:state;
    });
  };

  const updateRoutine=(id,mutate,playerPatch=null)=>{
    const store=getStore();
    if(!store?.update)return;
    store.update(state=>{
      const routines=list(state.routines).map(r=>same(r.id,id)?mutate(r,state):r);
      const next={...state,routines};
      return playerPatch?{...next,routinePlayer:{...(state.routinePlayer||{}),...playerPatch}}:next;
    });
    reconcile();
  };

  const currentView=state=>{
    const player=state?.routinePlayer||{};
    if(!player.active)return null;
    const routine=findRoutine(state,player.routineId);
    if(!routine)return null;
    const date=day(),checks=routine.checks?.[date]||{};
    const pending=list(routine.steps)
      .map((step,index)=>({step,index,status:checks[index]}))
      .filter(item=>![true,'complete','skipped','na'].includes(item.status));
    const current=pending.find(item=>item.status!=='later')||pending[0]||null;
    return{routine,current,date};
  };

  const setStep=(routine,index,status)=>{
    const date=day(),checks={...((routine.checks||{})[date]||{})},dayStatus={...(routine.dayStatus||{})};
    checks[index]=status;
    if(dayStatus[date])delete dayStatus[date];
    return{...routine,checks:{...(routine.checks||{}),[date]:checks},dayStatus};
  };

  const stop=()=>{
    const store=getStore();
    store?.update?.(state=>({...state,routinePlayer:{...(state.routinePlayer||{}),active:false,routineId:null,overlayDismissed:false}}));
  };

  document.addEventListener('click',event=>{
    const control=event.target?.closest?.('.sm-routine-overlay button,.sm-routine-chip');
    if(!control)return;
    const store=getStore();
    if(!store?.update)return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const state=store.get?.()||{},view=currentView(state);

    if(control.matches('.sm-routine-chip')){
      store.update(s=>({...s,routinePlayer:{...(s.routinePlayer||{}),overlayDismissed:false}}));
      return;
    }
    if(control.hasAttribute('data-dismiss')){
      store.update(s=>({...s,routinePlayer:{...(s.routinePlayer||{}),overlayDismissed:true}}));
      return;
    }
    if(control.hasAttribute('data-stop')){stop();return;}
    if(!view)return;

    const id=view.routine.id;
    if(control.hasAttribute('data-done')&&view.current){
      updateRoutine(id,r=>setStep(r,view.current.index,'complete'));
      return;
    }
    if(control.hasAttribute('data-skip-step')&&view.current){
      updateRoutine(id,r=>setStep(r,view.current.index,'skipped'));
      return;
    }
    if(control.hasAttribute('data-later')&&view.current){
      updateRoutine(id,r=>setStep(r,view.current.index,'later'));
      return;
    }
    if(control.hasAttribute('data-finish')){
      updateRoutine(id,r=>{
        const date=day(),checks={...((r.checks||{})[date]||{})};
        list(r.steps).forEach((_,index)=>{if(checks[index]!=='na')checks[index]='complete'});
        return{...r,checks:{...(r.checks||{}),[date]:checks},dayStatus:{...(r.dayStatus||{}),[date]:'finished'}};
      },{active:false,routineId:null,overlayDismissed:false});
      return;
    }
    if(control.hasAttribute('data-skip-today')){
      updateRoutine(id,r=>{
        const date=day(),dayStatus={...(r.dayStatus||{})};
        if(dayStatus[date]==='skipped')delete dayStatus[date];
        else dayStatus[date]='skipped';
        return{...r,dayStatus};
      },{active:false,routineId:null,overlayDismissed:false});
    }
  },true);
})();
