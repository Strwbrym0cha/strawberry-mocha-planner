export function preferLocalLore(result,stateBefore,message,loreApi,mochiniApi){
  if(!result||!result.requiresAI||result.route!=='ai')return result;
  if(typeof loreApi?.getLoreResponse!=='function')return result;
  const reply=loreApi.getLoreResponse(stateBefore?.mochini?.lore,stateBefore?.mochini?.life,message);
  if(!reply)return result;
  const state=typeof mochiniApi?.appendMochiniResponse==='function'
    ?mochiniApi.appendMochiniResponse(result.state,reply,{conversation:true,self:true,lore:true,local:true,runtimeLoreRecovery:true})
    :result.state;
  return{...result,state,reply,route:'local',requiresAI:false,intent:'mochini_lore'};
}
