const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

const IDEAS=[
 {name:'Bracelet making',icon:'📿',type:'creative',pitch:'small projects, cute supplies, and something wearable at the end'},
 {name:'Digital art',icon:'🎨',type:'creative',pitch:'easy to pick up for ten minutes or disappear into for an afternoon'},
 {name:'Journaling',icon:'📓',type:'creative',pitch:'a low-pressure place for thoughts, stickers, lists, and tiny life archives'},
 {name:'Photography walks',icon:'📸',type:'interactive',pitch:'gets you exploring without needing a giant plan'},
 {name:'Origami',icon:'🪽',type:'creative',pitch:'cheap, tactile, and very satisfying when one square becomes a creature'},
 {name:'Puzzle games',icon:'🧩',type:'interactive',pitch:'good for a brain that wants something to chew on without making a whole project'},
 {name:'Mini coding projects',icon:'💻',type:'interactive',pitch:'tiny useful builds with a visible payoff'},
 {name:'Scrapbooking',icon:'✂️',type:'creative',pitch:'collect memories and make them prettier at the same time'},
 {name:'Beading',icon:'✨',type:'creative',pitch:'repetitive enough to settle into, creative enough to keep changing'},
 {name:'Reading challenges',icon:'📚',type:'interactive',pitch:'a cozy hobby that can flex between five minutes and five hours'},
 {name:'Thrifting quests',icon:'🛍️',type:'interactive',pitch:'turn wandering around stores into a themed little treasure hunt'},
 {name:'Model or miniature building',icon:'🏠',type:'creative',pitch:'tiny details, visible progress, and excellent desk-goblin energy'}
];

function normalize(raw){return text(raw).replace(/^[\s.,!?;:]+/,'').replace(/\s+/g,' ').trim().toLowerCase()}
function activeHobbies(state){return list(state?.v4?.hobbies).filter(h=>!store.isArchived(state,'hobby',h.id))}
function lane(h){const s=`${text(h?.name)} ${text(h?.kind)}`.toLowerCase();if(/collect|funko|figure|plush|card|memorabilia|vinyl/.test(s))return'collecting';if(/creative|craft|crochet|bracelet|bead|art|draw|paint|sew|knit|cosplay|design|photo|journal|write/.test(s))return'creative';return'interactive'}
function addTurn(state,role,message,meta={}){state.mochini={...(state.mochini||{}),conversation:[...list(state.mochini?.conversation),{id:makeId('turn'),role,text:message,at:new Date().toISOString(),meta}].slice(-100)};return state}
function recentHobbyContext(state){return list(state?.mochini?.conversation).slice(-6).some(t=>/hobb(?:y|ies)|crochet|creative studio|playground|collection cabinet/i.test(text(t.text)))}
function hobbyIntent(raw,state){
 const q=normalize(raw);if(!q)return null;
 if(/^(roll again|another hobby|pick another(?: one)?|give me another hobby)$/.test(q))return'do';
 if(/^(?:what|which) hobby should i (?:do|work on)(?: today| right now)?\??$/.test(q)||/^(?:pick|choose|give me) (?:a |one )?hobby(?: for me)?\??$/.test(q)||/^what should i do for a hobby\??$/.test(q))return'do';
 if(/^(?:what|which) hobby should i (?:start|try|pick up)\??$/.test(q)||/^(?:recommend|suggest)(?: me)? (?:a |some )?hobb(?:y|ies)\??$/.test(q)||/^should i (?:start|get|pick up) a hobby\??$/.test(q)||/^i (?:want|need) (?:a )?(?:new )?hobby\.?$/.test(q)||/^what hobby would (?:fit|suit) me\??$/.test(q))return'start';
 if(/^(?:what should i try|what should i start|any ideas|give me ideas)\??$/.test(q)&&recentHobbyContext(state))return'start';
 if(/hobb(?:y|ies)/.test(q)&&/(what|which|recommend|suggest|start|try|pick|choose|should i)/.test(q))return q.includes('do')?'do':'start';
 return null;
}
function chooseExisting(state,avoid=''){
 const hobbies=activeHobbies(state),doable=hobbies.filter(h=>lane(h)!=='collecting'),playing=doable.filter(h=>h.status==='playing'),curious=doable.filter(h=>h.status==='curious'),base=playing.length?playing:curious.length?curious:hobbies.filter(h=>h.status!=='shelf');
 const pool=base.filter(h=>String(h.id)!==String(avoid)),source=pool.length?pool:base;return source.length?source[Math.floor(Math.random()*source.length)]:null;
}
function newIdeas(state){const names=new Set(activeHobbies(state).map(h=>text(h.name).toLowerCase()));const available=IDEAS.filter(x=>!names.has(x.name.toLowerCase()));const shuffled=[...available].sort(()=>Math.random()-.5);return shuffled.slice(0,3)}
function answerDo(state,raw){const prior=state.v4?.hobbyPick?.hobbyId,h=chooseExisting(state,/again|another/i.test(raw)?prior:'');if(!h)return'Your Hobby Shelf is pretty empty right now 😭 Add one Creative or Interactive hobby and I can actually choose from your stuff.';state.v4={...(state.v4||{}),hobbyPick:{hobbyId:h.id,pickedAt:new Date().toISOString()}};const icon=lane(h)==='creative'?'🎨':lane(h)==='collecting'?'🧸':'🎮';return`${icon} I’d do ${h.name}. It’s already on your shelf, so no new commitment required. I put it on the Bored Button too if you want to start a session. 🎲`}
function answerStart(state){const ideas=newIdeas(state);if(!ideas.length)return'Your shelf already ate my whole starter-hobby menu 😭 At this point I’d rather help you deepen one you already have or brainstorm something delightfully specific.';const lines=ideas.map(x=>`${x.icon} ${x.name} · ${x.pitch}`);return`Yeah, a new hobby could be fun, but I’d keep it low-commitment first. My three picks are: ${lines.join('  |  ')}. If one makes your brain go 👀, try it once before buying a small craft-store kingdom.`}
function handle(raw,intent){let state=clone(rt.getState());state=addTurn(state,'user',raw,{conversation:true,topic:'hobbies'});const reply=intent==='do'?answerDo(state,raw):answerStart(state);state=addTurn(state,'assistant',reply,{conversation:true,topic:'hobbies',hobbyAdvisor:true});rt.setState(state,'Mochini talked hobbies 🎨')}

document.addEventListener('submit',e=>{
 const chat=e.target.closest?.('form[data-form="mochini"]');if(!chat)return;
 const raw=text(new FormData(chat).get('message')),state=rt.getState(),intent=hobbyIntent(raw,state);if(!intent)return;
 e.preventDefault();e.stopImmediatePropagation();handle(raw,intent);
},true);
