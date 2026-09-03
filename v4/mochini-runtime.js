import{preferLocalLore}from'./mochini-lore-routing.js';

const deps=()=>window.__KATOS_V4_DEPS||{};
const runtime=()=>window.__KATOS_V4_RUNTIME||null;
let requestId=0;

function markChatInteraction(state){
  const life=deps().life;
  if(!state?.mochini?.life||typeof life?.markInteraction!=='function')return state;
  return{...state,mochini:{...state.mochini,life:life.markInteraction(state.mochini.life,new Date())}};
}

async function handleMochiniSubmit(form){
  const rt=runtime(),mochini=deps().mochini,ai=deps().ai,lore=deps().lore;
  if(!rt||!mochini?.processMochini)return;
  const field=form.querySelector('[name="message"]'),message=String(field?.value||'').trim();
  if(!message)return;
  const id=++requestId;
  let current=rt.getState();
  let result=mochini.processMochini(current,message);
  // Fresh-loader lore gets a second chance before an AI/auth request. This keeps
  // simple Mochini-world questions local even if an older nested module import
  // is still sitting in a browser cache.
  result=preferLocalLore(result,current,message,lore,mochini);
  current=markChatInteraction(result.state);
  if(!result.requiresAI||result.route!=='ai'){
    rt.setState(current,'Mochini replied');
    return;
  }
  rt.setState(current,'Mochini is thinking…');
  if(!ai?.askMochiniAI||!mochini?.appendMochiniResponse){
    current=mochini.appendMochiniResponse(current,'My thinking route is missing a wire right now. Try again after a refresh.',{conversation:true,aiError:true});
    rt.setState(current,'Mochini hit a snag');
    return;
  }
  const response=await ai.askMochiniAI({message,state:current});
  if(id!==requestId)return;
  const latest=rt.getState();
  current=mochini.appendMochiniResponse(latest,response.ok?response.message:response.error,{conversation:true,ai:response.ok,aiError:!response.ok,intent:result.intent||'reasoning'});
  rt.setState(current,response.ok?'Mochini replied':'Mochini hit a snag');
  if(!response.ok&&response.kind==='auth')window.dispatchEvent(new CustomEvent('katos-auth-required',{detail:{message:response.error}}));
}

document.addEventListener('submit',event=>{
  const form=event.target?.closest?.('form[data-form="mochini"]');
  if(!form)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void handleMochiniSubmit(form);
},true);
