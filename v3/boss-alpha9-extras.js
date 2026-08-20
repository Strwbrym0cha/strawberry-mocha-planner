import{loadV3State,saveV3State}from'./app/schema.js?v=3.0.0-alpha.9';
import{updateEarning}from'./app/money.js?v=3.0.0-alpha.9';

let busy=false;
function enhanceGigs(){
  const state=loadV3State();
  document.querySelectorAll('.gig-card').forEach(card=>{
    if(card.querySelector('[data-gig-edit-wrap]'))return;
    const del=card.querySelector('[data-earning-delete]'),id=del?.dataset.earningDelete;if(!id)return;
    const earning=state.money?.earnings?.find(item=>item.id===id&&item.kind==='gig');if(!earning)return;
    const actions=card.querySelector('.earning-actions');if(!actions)return;
    const wrap=document.createElement('span');wrap.dataset.gigEditWrap='1';wrap.style.display='inline-flex';wrap.style.gap='5px';wrap.style.alignItems='center';
    wrap.innerHTML=`<input class="money-input" type="number" min="0" step="0.01" value="${Number(earning.grossEarned||0)}" aria-label="Update gross earned"><button class="btn tiny" type="button">Update earned</button>`;
    const input=wrap.querySelector('input'),button=wrap.querySelector('button');
    button.addEventListener('click',()=>{const fresh=loadV3State(),amount=Number(input.value);fresh.money=updateEarning(fresh.money,id,{grossEarned:amount,receivedAmount:earning.status==='received'?amount:earning.receivedAmount});saveV3State(fresh);location.reload()});
    actions.prepend(wrap);
  });
}
function sync(){if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;enhanceGigs()})}
const app=document.getElementById('app');if(app)new MutationObserver(sync).observe(app,{childList:true,subtree:true});sync();

setInterval(()=>{
  const el=document.getElementById('focusCountdown');if(!el)return;
  const state=loadV3State(),focus=state.work?.focus;if(!focus?.active||!focus.endsAt)return;
  const left=Math.max(0,new Date(focus.endsAt).getTime()-Date.now()),mins=Math.floor(left/60000),secs=Math.floor((left%60000)/1000);
  el.textContent=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  if(left<=0)document.getElementById('stopFocus')?.click();
},1000);
