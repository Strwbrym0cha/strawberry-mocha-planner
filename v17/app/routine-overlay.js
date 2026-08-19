const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const same=(a,b)=>String(a??'')===String(b??'');
const list=value=>Array.isArray(value)?value:[];

function guidedById(state,id){return list(state?.guidedRoutines).find(routine=>same(routine?.id,id))||null}
function taskById(state,id){return list(state?.tasks).find(task=>same(task?.id,id))||null}
function modeState(state){
 const mode=state?.routineMode||{};
 const routine=mode.active?guidedById(state,mode.routineId):null;
 if(!routine)return{active:false};
 const skipped=new Set(list(mode.skippedTaskIds).map(String));
 const tasks=list(routine.taskIds).map(id=>taskById(state,id)).filter(Boolean);
 const pending=tasks.filter(task=>!task.done&&!skipped.has(String(task.id)));
 const gateway=pending.find(task=>same(task.id,routine.gatewayTaskId));
 const current=gateway||pending[0]||null;
 const completed=tasks.filter(task=>task.done).length;
 return{active:true,mode,routine,tasks,current,completed,total:tasks.length,complete:pending.length===0,skipped};
}
function updateStore(mutator){const store=window.__smStore;if(!store)return;store.update(state=>mutator(state||{}))}
function dismissOverlay(){updateStore(state=>({...state,routineMode:{...(state.routineMode||{}),overlayDismissed:true}}))}
function reopenOverlay(){updateStore(state=>({...state,routineMode:{...(state.routineMode||{}),overlayDismissed:false}}))}
function stopRoutine(){updateStore(state=>({...state,routineMode:{...(state.routineMode||{}),active:false,routineId:null,skippedTaskIds:[],overlayDismissed:false}}))}
function completeCurrent(id){updateStore(state=>({...state,tasks:list(state.tasks).map(task=>same(task.id,id)?{...task,done:true}:task),routineMode:{...(state.routineMode||{}),overlayDismissed:false}}))}
function skipCurrent(id){updateStore(state=>({...state,routineMode:{...(state.routineMode||{}),skippedTaskIds:[...new Set([...list(state.routineMode?.skippedTaskIds).map(String),String(id)])],overlayDismissed:false}}))}

function installStyles(){if(document.getElementById('sm-routine-overlay-style'))return;const style=document.createElement('style');style.id='sm-routine-overlay-style';style.textContent=`
.sm-routine-overlay{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:900;width:min(390px,calc(100vw - 32px));max-height:min(72vh,620px);overflow:auto;background:rgba(255,253,252,.97);border:2px solid #efbdd1;border-radius:26px;box-shadow:0 20px 60px #65463f2b;padding:18px;backdrop-filter:blur(16px);color:#65463f}
.sm-routine-overlay header{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}.sm-routine-overlay h2{margin:3px 0 2px;font-size:21px}.sm-routine-overlay small{color:#9f8179}.sm-routine-overlay .sm-routine-x{border:0;background:#fff0f7;border-radius:999px;width:34px;height:34px;font-size:18px;color:#9c5470;cursor:pointer;flex:0 0 auto}.sm-routine-current{margin:14px 0;padding:16px;border-radius:20px;background:linear-gradient(135deg,#fff0f7,#f3faee);border:1px solid #efd1dd}.sm-routine-current b{display:block;font-size:18px;margin-top:4px}.sm-routine-current .gateway{display:inline-block;margin-top:8px;padding:4px 8px;border-radius:999px;background:#fff;color:#9c5470;font-size:11px;font-weight:900}.sm-routine-progress{height:8px;border-radius:99px;background:#f3e5ea;overflow:hidden;margin:12px 0 6px}.sm-routine-progress i{display:block;height:100%;background:linear-gradient(90deg,#ed9fc0,#b8d1a6)}.sm-routine-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.sm-routine-actions button{border:1px solid #efd1dd;background:#fff;border-radius:14px;padding:10px 12px;font-weight:800;color:#65463f;cursor:pointer}.sm-routine-actions .primary{background:linear-gradient(100deg,#ed9fc0,#b8d1a6);color:white;border:0}.sm-routine-steps{margin:12px 0 0;padding:0;list-style:none}.sm-routine-steps li{padding:8px 2px;border-bottom:1px solid #f4e3e9;font-size:13px}.sm-routine-steps li.done{text-decoration:line-through;opacity:.55}.sm-routine-steps li.skipped{opacity:.55}.sm-routine-chip{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:899;border:1px solid #efbdd1;background:#fff8fb;border-radius:999px;padding:10px 14px;box-shadow:0 8px 24px #65463f1c;color:#9c5470;font-weight:900;cursor:pointer}
@media(max-width:600px){.sm-routine-overlay{left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));width:auto;max-height:64vh;border-radius:22px}.sm-routine-actions button{flex:1 1 130px}}
`;document.head.appendChild(style)}

function renderOverlay(){
 document.querySelector('#sm-routine-overlay')?.remove();document.querySelector('#sm-routine-chip')?.remove();
 const state=window.__smStore?.get?.()||{},view=modeState(state);if(!view.active)return;
 if(view.mode.overlayDismissed){const chip=document.createElement('button');chip.id='sm-routine-chip';chip.className='sm-routine-chip';chip.type='button';chip.textContent=`🌷 ${view.routine.name||'Routine'} • ${view.completed}/${view.total}`;chip.addEventListener('click',reopenOverlay);document.body.appendChild(chip);return}
 const current=view.current,pct=view.total?Math.round(view.completed/view.total*100):0,isGateway=current&&same(current.id,view.routine.gatewayTaskId);
 const overlay=document.createElement('aside');overlay.id='sm-routine-overlay';overlay.className='sm-routine-overlay';overlay.setAttribute('aria-label','Guided Routine Mode');overlay.innerHTML=`<header><div><small>🌷 GUIDED ROUTINE MODE</small><h2>${esc(view.routine.name||'Routine')}</h2><small>${view.completed}/${view.total} completed${view.skipped.size?` • ${view.skipped.size} skipped`:''}</small></div><button class="sm-routine-x" type="button" data-routine-dismiss aria-label="Dismiss Routine Mode overlay">×</button></header><div class="sm-routine-progress"><i style="width:${pct}%"></i></div>${view.complete?`<div class="sm-routine-current"><small>ALL DONE</small><b>Routine complete ✨</b><span>You can finish the routine whenever you're ready.</span></div>`:current?`<div class="sm-routine-current"><small>${view.completed?'NEXT STEP':'START HERE'}</small><b>${esc(current.text||current.title||'Untitled task')}</b>${isGateway?'<span class="gateway">🌷 Gateway task</span>':''}<span style="display:block;margin-top:8px">One useful step at a time. KatOS stays available behind this card.</span></div>`:`<div class="sm-routine-current"><b>No available step right now.</b></div>`}<div class="sm-routine-actions">${current?`<button type="button" class="primary" data-routine-done>✓ Done, next</button><button type="button" data-routine-skip>Skip for now</button>`:''}<button type="button" data-routine-stop>${view.complete?'Finish Routine':'Stop Routine'}</button></div><details><summary>See all steps</summary><ol class="sm-routine-steps">${view.tasks.map((task,i)=>{const done=!!task.done,skipped=view.skipped.has(String(task.id)),gateway=same(task.id,view.routine.gatewayTaskId);return `<li class="${done?'done':skipped?'skipped':''}">${done?'✓ ':skipped?'↷ ':`${i+1}. `}${gateway?'🌷 ':''}${esc(task.text||task.title||'Untitled task')}</li>`}).join('')}</ol></details>`;
 overlay.querySelector('[data-routine-dismiss]')?.addEventListener('click',dismissOverlay);overlay.querySelector('[data-routine-stop]')?.addEventListener('click',stopRoutine);overlay.querySelector('[data-routine-done]')?.addEventListener('click',()=>completeCurrent(current.id));overlay.querySelector('[data-routine-skip]')?.addEventListener('click',()=>skipCurrent(current.id));document.body.appendChild(overlay)
}

export function installRoutineOverlay(){
 installStyles();let queued=false;const refresh=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;renderOverlay()})};
 const wait=()=>{if(!window.__smStore){setTimeout(wait,100);return}window.__smStore.subscribe?.(refresh);new MutationObserver(refresh).observe(document.getElementById('tab-root')||document.body,{childList:true,subtree:true});refresh()};wait();
}
