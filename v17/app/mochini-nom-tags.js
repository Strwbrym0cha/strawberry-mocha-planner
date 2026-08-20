import{routeMochiniCapability as baseRoute}from'./mochini-capabilities.js?v=22.10.0-20260819';
import{allNoms}from'./noms.js?v=22.1.29-20260818';

const list=value=>Array.isArray(value)?value:[];
const clean=value=>String(value||'').toLowerCase().replace(/[’‘']/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const title=item=>String(item?.name||item?.title||item?.text||'').trim();
const hasTag=(item,wanted)=>list(item?.tags).some(tag=>clean(tag)===clean(wanted));
const response=(intent,answer,evidence=[],extra={})=>({intent,answer,evidence,escalation:false,choices:[],reason:'',recommendation:null,...extra});
const dateKey=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
const rejection=/\b(no|nope|nah|not that|something else|another one|dont want that|do not want that|thats not|that is not|isnt savory|isnt sweet|not savory|not sweet)\b/;

function preferenceFromConversation(input,state){
 if(/\b(savory|salty)\b/.test(input))return'savory';
 if(/\b(sweet|dessert)\b/.test(input))return'sweet';
 if(!rejection.test(input))return'';
 const turns=list(state?.mochini?.conversation);
 for(let i=turns.length-1;i>=0;i--){const turn=turns[i];if(turn?.role!=='kat')continue;const text=clean(turn.text);if(/\b(savory|salty)\b/.test(text))return'savory';if(/\b(sweet|dessert)\b/.test(text))return'sweet'}
 return'';
}

function foodMentionedIn(text,foods){const hay=clean(text);return foods.filter(food=>{const name=clean(title(food));return name&&hay.includes(name)}).map(food=>String(food.id||clean(title(food))))}

function rejectedFoods(input,state,foods){
 const rejected=new Set(),turns=list(state?.mochini?.conversation);
 for(let i=0;i<turns.length;i++){
  const turn=turns[i];if(turn?.role!=='kat'||!rejection.test(clean(turn.text)))continue;
  for(let j=i-1;j>=0;j--){if(turns[j]?.role==='mochini'){foodMentionedIn(turns[j].text,foods).forEach(id=>rejected.add(id));break}}
 }
 if(rejection.test(input))for(let i=turns.length-1;i>=0;i--){if(turns[i]?.role==='mochini'){foodMentionedIn(turns[i].text,foods).forEach(id=>rejected.add(id));break}}
 return rejected;
}

function strictTaggedNom(question,state){
 const input=clean(question),preference=preferenceFromConversation(input,state);if(!preference)return null;
 const foods=allNoms(state),today=dateKey(),history=list(state?.noms?.nomHistory).filter(entry=>String(entry?.date||'')===today),consumedIds=new Set(history.map(entry=>String(entry?.nomId||'')).filter(Boolean)),consumedNames=new Set(history.map(entry=>clean(entry?.label||entry?.text||'')).filter(Boolean)),rejected=rejectedFoods(input,state,foods);
 const tagged=foods.filter(food=>hasTag(food,preference)),fresh=tagged.filter(food=>!consumedIds.has(String(food?.id||''))&&!consumedNames.has(clean(title(food)))&&!rejected.has(String(food?.id||clean(title(food)))));
 const eatenLabels=history.map(entry=>String(entry?.label||entry?.text||'').trim()).filter(Boolean),already=eatenLabels.length?`You’ve already had ${eatenLabels.join(', ')}. `:'';
 if(fresh.length){const pick=fresh[0],lead=preference==='savory'?'Savory vote:':'Sweet vote:';return response('cap_noms_recommendation',`${already}${lead} ${title(pick)}. That one is actually tagged ${preference}, and you haven’t logged or rejected it today. 🍓`,[pick,...history],{signals:['tag_matched',preference,'not_already_eaten','not_rejected']})}
 if(tagged.length)return response('cap_noms_recommendation',`${already}I don’t see another ${preference}-tagged Nom that is both uneaten and unrejected right now. 🍡`,tagged,{signals:['tag_matched',preference,'no_fresh_match']});
 return response('cap_noms_recommendation',`I don’t see any saved Noms tagged ${preference} yet. Add that tag to the foods you want me to treat as ${preference}. 🍡`,[],{signals:['tag_required',preference]});
}

export function routeMochiniCapability(question,context={}){
 const tagged=strictTaggedNom(question,context.state||{});if(tagged)return tagged;
 return baseRoute(question,context);
}
