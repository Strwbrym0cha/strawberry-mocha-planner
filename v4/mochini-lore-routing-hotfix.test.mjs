import assert from'node:assert/strict';
import{getLoreResponse,normalizeMochiniLore,seedCanonicalLore}from'./mochini-lore.js';
import{preferLocalLore}from'./mochini-lore-routing.js';

const v1=normalizeMochiniLore({canonSeedVersion:1,hoard:{tinyFurniture:[{id:'chair-pink',name:'tiny pink chair'}],spoons:[{id:'spoon-important',name:'Important Spoon'}]}});
const lore=seedCanonicalLore(v1);
assert.equal(lore.canonSeedVersion,2);
assert.ok(lore.hoard.hats.length>=3);
assert.equal(lore.hoard.tinyFurniture.filter(x=>x.id==='chair-pink').length,1);
assert.equal(lore.hoard.spoons.filter(x=>x.id==='spoon-important').length,1);
assert.ok(lore.resolvedScandals.some(x=>x.id==='tiny-hat-black-market'));

const message='big mochi says you have to many little hats';
const hatReply=getLoreResponse(lore,{},message);
assert.match(hatReply,/Big Mochi/i);
assert.match(hatReply,/hat|inventory/i);
assert.doesNotMatch(hatReply,/planner|sign in|thinking brain/i);

const aiResult={state:{mochini:{conversation:[]}},reply:'',route:'ai',requiresAI:true,intent:'open_conversation'};
const stateBefore={mochini:{lore,life:{}}};
const mochiniApi={appendMochiniResponse:(state,reply,meta)=>({...state,lastLocalReply:{reply,meta}})};
const loreApi={getLoreResponse};
for(let i=0;i<2;i++){
  const recovered=preferLocalLore(aiResult,stateBefore,message,loreApi,mochiniApi);
  assert.equal(recovered.route,'local');
  assert.equal(recovered.requiresAI,false);
  assert.match(recovered.reply,/Big Mochi/i);
  assert.equal(recovered.state.lastLocalReply.meta.runtimeLoreRecovery,true);
}

assert.match(getLoreResponse(lore,{},'What happened with the Tiny Hat Black Market?'),/Tiny Hat Black Market/i);
const accord='Big Mochi Accord says the berries remain with Kat, Big Mochi receives ceremonial head pats, Mochini gets one berry, Mochini discloses the spoons, Bean Enterprises gets audited, and everyone agrees this whole situation has become unnecessarily bureaucratic but still legally binding for tiny bean purposes.';
assert.equal(getLoreResponse(lore,{},accord),'');
assert.match(getLoreResponse(lore,{},'Where did that chair come from?'),/furniture|chair|vertical space/i);
assert.equal(getLoreResponse(lore,{},'Where did my french fry come from?'),'');

console.log('V4 Mochini lore routing hotfix tests: PASS');
