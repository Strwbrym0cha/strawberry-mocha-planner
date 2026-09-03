const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const list=v=>Array.isArray(v)?v:[];
const cats=['tinyFurniture','hats','spoons','stickers','mysteryBoxes','wormStuff','tinyBeverages','importantBeanDocuments','miscellaneousTinyObjects'];
const CANON_SEED_VERSION=2;

export const DEFAULT_LORE={era:null,canonSeedVersion:0,storagePhysics:'questionable',hoard:Object.fromEntries(cats.map(k=>[k,[]])),specialPossessions:[],activeScandals:[],resolvedScandals:[],rivals:[],organizations:[{id:'bean-enterprises',name:'Bean Enterprises',status:'active',purpose:'unclear'}],permanentFlags:{},recentLoreLines:[],loreEvents:[]};

const CANON={
  tinyFurniture:[['chair-pink','tiny pink chair'],['chair-folding','suspicious folding chair']],
  hats:[['hat-pink','tiny pink hat'],['hat-business','questionable business hat'],['hat-emergency','Emergency Hat']],
  spoons:[['spoon-important','Important Spoon'],['spoon-emergency','Emergency Spoon']],
  mysteryBoxes:[['box-important','box labeled IMPORTANT']],
  wormStuff:[['worm-logistics','Worm Logistics paperwork']]
};
const CANON_ACTIVE_SCANDALS=[{id:'alarm-coup',name:'Alarm Clock Coup',status:'active',summary:'The Clock attempted a hostile morning takeover.'}];
const CANON_RESOLVED_SCANDALS=[{id:'strawberry-incident',name:'The Strawberry Incident',status:'resolved'},{id:'tiny-hat-black-market',name:'Tiny Hat Black Market',status:'resolved',summary:'The hats were inventory. The paperwork disagreed.'}];

function mergeById(existing,canonical){const rows=list(existing).map(v=>({...obj(v)})),ids=new Set(rows.map(v=>v.id).filter(Boolean));return[...rows,...canonical.filter(v=>!ids.has(v.id)).map(v=>({...v}))]}

export function seedCanonicalLore(value={}){
  const l=normalizeMochiniLore(value);
  if(l.canonSeedVersion>=CANON_SEED_VERSION)return l;
  const hoard={...l.hoard};
  for(const[k,items]of Object.entries(CANON)){
    const canonical=items.map(([id,name])=>({id,name}));
    hoard[k]=mergeById(hoard[k],canonical);
  }
  return{
    ...l,
    canonSeedVersion:CANON_SEED_VERSION,
    hoard,
    activeScandals:mergeById(l.activeScandals,CANON_ACTIVE_SCANDALS),
    resolvedScandals:mergeById(l.resolvedScandals,CANON_RESOLVED_SCANDALS)
  };
}

export function normalizeMochiniLore(value={}){const x=obj(value),hoard={...DEFAULT_LORE.hoard,...obj(x.hoard)};return{...DEFAULT_LORE,...x,storagePhysics:'questionable',hoard:Object.fromEntries(cats.map(k=>[k,list(hoard[k]).filter(v=>v&&typeof v==='object').map(v=>({...v}))])),specialPossessions:list(x.specialPossessions).map(v=>({...obj(v)})),activeScandals:list(x.activeScandals).map(v=>({...obj(v)})),resolvedScandals:list(x.resolvedScandals).map(v=>({...obj(v)})),rivals:list(x.rivals).map(v=>({...obj(v)})),organizations:list(x.organizations).map(v=>({...obj(v)})),permanentFlags:obj(x.permanentFlags),recentLoreLines:list(x.recentLoreLines).filter(v=>typeof v==='string').slice(-6),loreEvents:list(x.loreEvents).map(v=>({...obj(v)})).slice(-50)}}
export function addHoardItem(value,category,item){const l=normalizeMochiniLore(value);if(!cats.includes(category)||!item?.id)return l;if(l.hoard[category].some(x=>x.id===item.id))return l;return{...l,hoard:{...l.hoard,[category]:[...l.hoard[category],{...item}]}}}
export function removeHoardItem(value,category,id){const l=normalizeMochiniLore(value);if(!cats.includes(category))return l;return{...l,hoard:{...l.hoard,[category]:l.hoard[category].filter(x=>x.id!==id)}}}
export function recordLoreEvent(value,event){const l=normalizeMochiniLore(value);return{...l,loreEvents:[...l.loreEvents,{...event,at:event.at||new Date().toISOString()}].slice(-50)}}
export function startScandal(value,scandal){const l=normalizeMochiniLore(value);if(!scandal?.id||l.activeScandals.some(x=>x.id===scandal.id))return l;return{...l,activeScandals:[...l.activeScandals,{...scandal,status:'active',startedAt:scandal.startedAt||new Date().toISOString()}]}}
export function resolveScandal(value,id,now=new Date()){const l=normalizeMochiniLore(value),found=l.activeScandals.find(x=>x.id===id);if(!found)return l;const resolved={...found,status:'resolved',resolvedAt:now.toISOString()};return{...l,activeScandals:l.activeScandals.filter(x=>x.id!==id),resolvedScandals:[...l.resolvedScandals,resolved]}}
export function setEra(value,era){return{...normalizeMochiniLore(value),era:era||null}}
export function getHoardSummary(value){const l=normalizeMochiniLore(value);return Object.entries(l.hoard).flatMap(([category,items])=>items.map(item=>({category,...item})))}

function isLongMixedMessage(q){const words=q.trim().split(/\s+/).filter(Boolean);return words.length>28||q.length>220}
function scandalReply(l){const s=[...l.activeScandals,...l.resolvedScandals];if(!s.length)return'There are no scandals on the official record. The paperwork is unusually quiet.';return s.length===1?`${s[0].name}: ${s[0].mochiniStatement||s[0].summary||'The matter is under review.'}`:`The official record lists ${s.length} scandals. The spoon situation is under control.`}

export function getLoreResponse(value,life={},question=''){
  const l=normalizeMochiniLore(value),q=String(question).toLowerCase().trim(),all=getHoardSummary(l);
  if(!q)return'';

  // Do not let one magic lore word hijack a pasted agreement, long story, or other multi-intent message.
  if(isLongMixedMessage(q)&&!/^(tell me about|what happened (?:with|to)|why do you|how many|where (?:did|do)|who gave you)\b/.test(q))return'';

  if(/tiny hat black market|hat black market|hat scandal/.test(q)){
    const hatScandal=[...l.activeScandals,...l.resolvedScandals].find(x=>/hat/i.test(x.name||''));
    return hatScandal?`${hatScandal.name}: ${hatScandal.mochiniStatement||hatScandal.summary||'The matter is closed and the hats are inventory.'}`:scandalReply(l);
  }

  if(/\bhat(?:s)?\b/.test(q)){
    const hats=l.hoard.hats;
    if(/\bbig mochi\b/.test(q)&&/\b(says?|said|concern|too many|to many|too much)\b/.test(q))return hats.length?`Big Mochi has been listening to propaganda. I have ${hats.length} documented tiny hats. They are inventory. Very different.`:'Big Mochi has been listening to propaganda. The hats are inventory. Very different.';
    if(/how many|hat count|count.*hat/.test(q))return hats.length?`There are ${hats.length} documented tiny hats. This is inventory, not a problem.`:'The official hat count is currently unavailable. This is probably for legal reasons.';
    if(/where|come from|keep getting|who gave|get these|get the/.test(q))return'Bean Enterprises denies involvement in the hat supply chain. I have been advised to describe them as inventory.';
    return'The tiny hats are inventory, not a problem. The Tiny Hat Era ended under circumstances I am legally advised not to discuss.';
  }

  if(/\bspoon(?:s)?\b/.test(q))return l.hoard.spoons.length?`The spoon collection contains ${l.hoard.spoons.length}. The situation is under control.`:'No spoons are currently documented. This is not an admission.';
  if(/\b(chair(?:s)?|furniture)\b/.test(q)){const items=l.hoard.tinyFurniture;if(!items.length)return'There is no furniture currently on the official record. Bean Enterprises may have paperwork.';return`I have ${items.length} furniture item${items.length===1?'':'s'}: ${items.map(x=>x.name||'unnamed chair').join(', ')}. Incorrect. There is vertical space.`}
  if(/what do you have in your corner|how much stuff|are you a hoarder/.test(q)){if(!all.length)return'My corner is currently suspiciously tidy. The storage physics remain questionable.';return`My corner contains ${all.length} documented tiny object${all.length===1?'':'s'} across ${new Set(all.map(x=>x.category)).size} categories. This is an organized system.`}
  if(/bean enterprises/.test(q))return'Bean Enterprises provided it. That is all I am authorized to say.';
  if(/clock|alarm/.test(q))return'The Clock is an authoritarian concept. I remain professionally opposed.';
  if(/scandal|strawberr/.test(q))return scandalReply(l);
  if(/box/.test(q)){const b=l.hoard.mysteryBoxes;if(!b.length)return'There are no mystery boxes currently on the record. This is temporary, probably.';return`There ${b.length===1?'is':'are'} ${b.length} mystery box${b.length===1?'':'es'}. Their contents are classified as mysterious.`}
  if(/worm/.test(q)&&/worm/i.test(life.currentObsession||''))return'The Worm Era is pending. The paperwork is moving slower than expected.';
  return'';
}
