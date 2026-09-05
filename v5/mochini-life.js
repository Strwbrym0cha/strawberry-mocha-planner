// Canonical Mochini life state for V5. UI-free on purpose: the same little
// creature brain can drive her Command Center, floating companion, and future
// pose/expression sheets without tying personality to one screen.
const MINUTE=60000;
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const number=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,number(value,min)));
const dayKey=(date=new Date())=>{const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const history=(life,line)=>[...Array.isArray(life.dialogueHistory)?life.dialogueHistory:[],line].filter(Boolean).slice(-10);
const since=(stamp,now)=>{const value=Date.parse(stamp||'');return Number.isFinite(value)?Math.max(0,new Date(now).getTime()-value):Infinity};
const choose=values=>values[Math.floor(Math.random()*values.length)]||values[0];
const weighted=entries=>{const rows=entries.filter(([,weight])=>Number(weight)>0),total=rows.reduce((sum,[,weight])=>sum+Number(weight),0);if(!rows.length)return'content';let cursor=Math.random()*total;for(const [value,weight] of rows){cursor-=Number(weight);if(cursor<=0)return value}return rows.at(-1)[0]};

export const BERRY_LIMIT=6;
export const MOCHINI_MOODS=['content','happy','excited','playful','silly','proud','love','cozy','sleepy','drowsy','tired','bored','restless','curious','inquisitive','focused','thinking','confused','surprised','suspicious','grumpy','annoyed','mad','sulky','overwhelmed','determined','chaotic','shy','stuffed','peaceful'];
const moods=new Set(MOCHINI_MOODS);

// These are the current physical face assets. Pass 2 can replace aliases with
// one-to-one files as the 30-expression sheet is drawn, without changing life logic.
export const MOOD_TO_EXPRESSION={
  content:'idle',happy:'happy',excited:'excited',playful:'poke',silly:'confused',proud:'proud',love:'love',cozy:'sleepy',sleepy:'sleepy',drowsy:'sleepy',tired:'sleepy',bored:'thinking',restless:'confused',curious:'thinking',inquisitive:'thinking',focused:'thinking',thinking:'thinking',confused:'confused',surprised:'surprised',suspicious:'grumpy',grumpy:'grumpy',annoyed:'grumpy',mad:'grumpy',sulky:'grumpy',overwhelmed:'confused',determined:'proud',chaotic:'confused',shy:'love',stuffed:'sleepy',peaceful:'idle'
};
export const expressionForMood=mood=>MOOD_TO_EXPRESSION[mood]||'idle';

export const DEFAULT_MOCHINI_LIFE={
  mood:'content',moodIntensity:40,energy:70,affection:50,chaos:30,curiosity:58,playfulness:52,patience:78,fullness:0,
  berriesFedToday:0,berriesFedTotal:0,pokeCount:0,pokeStreak:0,interactionsToday:0,
  currentActivityId:'princessing',currentActivity:'being a tiny strawberry princess',currentContext:'home',
  currentLine:'Hihi! I am so happy you’re here. What shall we do today? ♡',dialogueHistory:[],
  lastPokeAt:null,lastInteractionAt:null,lastMoodAt:null,lastAutonomyAt:null,dailyKey:null
};

export function normalizeMochiniLife(value={},now=new Date()){
  const source=obj(value),today=dayKey(now),sameDay=source.dailyKey===today,lastPokeAge=since(source.lastPokeAt,now),streak=lastPokeAge<2*MINUTE?Math.max(0,Math.floor(number(source.pokeStreak,0))):0;
  const berries=sameDay?Math.max(0,Math.floor(number(source.berriesFedToday,0))):0;
  const recoveredPatience=lastPokeAge>3*MINUTE?Math.max(number(source.patience,78),72):number(source.patience,78);
  return {...DEFAULT_MOCHINI_LIFE,...source,
    mood:moods.has(source.mood)?source.mood:'content',moodIntensity:clamp(source.moodIntensity,40),energy:clamp(source.energy,70),affection:clamp(source.affection,50),chaos:clamp(source.chaos,30),curiosity:clamp(source.curiosity,58),playfulness:clamp(source.playfulness,52),patience:clamp(recoveredPatience,78),fullness:sameDay?clamp(source.fullness,Math.round(berries/BERRY_LIMIT*100)):0,
    berriesFedToday:berries,berriesFedTotal:Math.max(0,Math.floor(number(source.berriesFedTotal,0))),pokeCount:Math.max(0,Math.floor(number(source.pokeCount,0))),pokeStreak:streak,interactionsToday:sameDay?Math.max(0,Math.floor(number(source.interactionsToday,0))):0,
    dialogueHistory:Array.isArray(source.dialogueHistory)?source.dialogueHistory.filter(item=>typeof item==='string').slice(-10):[],dailyKey:today
  };
}

const setLine=(life,line,extra={})=>({...life,...extra,currentLine:line,dialogueHistory:history(life,line)});

export function mochiniPoke(value={},now=new Date()){
  const life=normalizeMochiniLife(value,now),rapid=since(life.lastPokeAt,now)<18_000,streak=rapid?life.pokeStreak+1:1;
  const mood=streak===1?'surprised':streak===2?'playful':streak===3?'suspicious':streak===4?'annoyed':streak===5?'grumpy':'mad';
  const lines={
    surprised:['EEP. I have been booped.','!!! Strawberry security breach.'],
    playful:['Okay okay, boop acknowledged :3','Hehe. You found the poke button again.'],
    suspicious:['…why is your finger still here 🤨','I am beginning to notice a pattern.'],
    annoyed:['Kat. We have discussed the finger. 😑','That was poke number TOO MANY.'],
    grumpy:['I am filing a tiny complaint.','My patience is wearing a very small hat right now.'],
    mad:['STOP POKING MEEEE 😠🍓','I have become wrath. Very tiny wrath, but wrath.']
  };
  const line=choose(lines[mood]);
  const next={...life,pokeCount:life.pokeCount+1,pokeStreak:streak,interactionsToday:life.interactionsToday+1,energy:clamp(life.energy+1),affection:clamp(life.affection+(streak<=2?1:streak>=5?-1:0)),patience:clamp(life.patience-(streak<=2?2:8)),lastPokeAt:new Date(now).toISOString(),lastInteractionAt:new Date(now).toISOString(),currentActivityId:'reacting-to-pokes',currentActivity:'reacting to an unreasonable number of pokes'};
  return {life:setLine(next,line,{mood,moodIntensity:clamp(32+streak*10),lastMoodAt:new Date(now).toISOString()}),line,expression:expressionForMood(mood),mood,accepted:true};
}

export function mochiniBerry(value={},now=new Date()){
  const life=normalizeMochiniLife(value,now);
  if(life.berriesFedToday>=BERRY_LIMIT){const mood=life.energy<48?'sleepy':'stuffed',line=choose(['My berry tummy is FULL full. I need horizontal time.','No more berries. I am approximately 87% strawberry now.','I love you, but the berry hatch is CLOSED. 🍓']);return {life:setLine(life,line,{mood,moodIntensity:60,fullness:100,currentActivityId:'berry-coma',currentActivity:'recovering from a heroic berry feast',lastInteractionAt:new Date(now).toISOString(),lastMoodAt:new Date(now).toISOString()}),line,expression:expressionForMood(mood),mood,accepted:false};}
  const count=life.berriesFedToday+1,fullness=Math.round(count/BERRY_LIMIT*100),mood=count===1?'excited':count===2?'happy':count===3?'content':count===4?'cozy':count===5?'stuffed':'sleepy';
  const lines={excited:['BERRY!! 🍓 My day has improved dramatically.'],happy:['Another one?? Excellent decision.'],content:['Mmm. Berry equilibrium achieved.'],cozy:['My tummy is getting warm and berry-shaped.'],stuffed:['I am so full… but also extremely powerful.'],sleepy:['berry… tummy… sleeby… zzz 🍓']};
  const energyDelta=count<=2?4:count<=4?1:-4,next={...life,berriesFedToday:count,berriesFedTotal:life.berriesFedTotal+1,fullness,interactionsToday:life.interactionsToday+1,energy:clamp(life.energy+energyDelta),affection:clamp(life.affection+2),patience:clamp(life.patience+3),lastInteractionAt:new Date(now).toISOString(),currentActivityId:count>=5?'berry-coma':'eating-berries',currentActivity:count>=5?'digesting a suspicious quantity of berries':'eating a strawberry with tremendous focus'};
  const line=choose(lines[mood]);
  return {life:setLine(next,line,{mood,moodIntensity:55+count*4,lastMoodAt:new Date(now).toISOString()}),line,expression:expressionForMood(mood),mood,accepted:true};
}

const CONTEXT_MOODS={
  home:[['content',4],['playful',3],['curious',3],['cozy',2],['bored',2],['silly',1],['chaotic',1]],
  daily:[['determined',4],['focused',4],['content',3],['bored',1],['proud',1]],
  schedule:[['focused',4],['thinking',3],['suspicious',1],['content',2]],
  study:[['focused',5],['inquisitive',4],['curious',3],['determined',2],['bored',1],['proud',1]],
  work:[['focused',5],['determined',3],['curious',2],['proud',2],['restless',1]],
  gig:[['determined',4],['focused',4],['playful',2],['restless',2],['suspicious',1]],
  money:[['focused',4],['suspicious',3],['thinking',3],['confused',1],['proud',1]],
  movement:[['determined',4],['proud',3],['restless',2],['happy',2],['tired',1]],
  hobbies:[['playful',5],['happy',3],['curious',3],['silly',2],['chaotic',2],['cozy',1]],
  growth:[['determined',4],['peaceful',3],['proud',2],['curious',2]],
  dump:[['thinking',3],['confused',2],['overwhelmed',1],['peaceful',2],['curious',2]],
  archive:[['curious',3],['cozy',2],['thinking',2],['suspicious',1]],
  settings:[['focused',3],['suspicious',2],['confused',1],['curious',2]],
  mochini:[['content',4],['playful',3],['love',2],['curious',2],['chaotic',1]]
};

function activityFor(life,context,mood,now){
  const hour=new Date(now).getHours();
  if(hour<6&&['sleepy','drowsy','cozy','tired'].includes(mood))return['tucked-in','tucked into bed under a strawberry blanket'];
  if(['curious','inquisitive','thinking'].includes(mood)&&Math.random()<.34)return['worm-research','researching the practical requirements of becoming a worm'];
  if(context==='study')return['study-book',mood==='bored'?'staring at the same paragraph with you':'reading beside you with her tiny book'];
  if(context==='gig')return['car-ride','riding shotgun with you and supervising the playlist'];
  if(context==='work')return['clipboard','holding a tiny clipboard and taking the job extremely seriously'];
  if((context==='home'||context==='hobbies')&&['playful','happy','silly','chaotic'].includes(mood)&&Math.random()<.62)return['cats','playing with Koi and Nala'];
  if(context==='money')return['money-check','counting tiny coins and judging the arithmetic'];
  if(context==='schedule')return['calendar','inspecting the calendar with unnecessary authority'];
  if(context==='movement')return['stretching','doing one extremely dramatic little stretch'];
  if(context==='growth')return['plant','watering a tiny plant and calling it character development'];
  if(context==='dump')return['notes','scribbling tiny notes beside your brain dump'];
  if(context==='archive')return['memory-box','digging around in the Memory Box'];
  if(context==='settings')return['gears','wearing tiny safety goggles near the settings gears'];
  if(context==='daily')return['checklist','patrolling the checklist with a strawberry pen'];
  return['princessing','being a tiny strawberry princess'];
}

function lineFor(mood,activityId){
  if(activityId==='worm-research')return choose(['Important research update: worms do not pay rent. Promising. 🪱','I am researching becoming a worm. Please respect the academic process.','Do worms have résumés? I have reached a methodological obstacle.']);
  if(activityId==='tucked-in')return choose(['mmf… why are we awake… 💤','I was having a very important dream about dango.','It is nighttime. I am legally a blanket lump now.']);
  if(activityId==='cats')return choose(['Koi and Nala have recruited me. We are busy. 🐈','Cat committee meeting. Agenda: running around for no reason.','I am playing with the babies. Productivity has been postponed.']);
  if(activityId==='car-ride')return choose(['Shotgun Mochini reporting for duty. Drive safe, I have the tiny snacks. 🚗','I am supervising this route from the passenger princess department.','Gig mode. I will glare at the map so you do not have to.']);
  if(activityId==='study-book')return mood==='bored'?'I have read this sentence four times and none of us are absorbing it.':'Book open. Tiny scholar mode. I am studying with you. 📖';
  const lines={
    content:['I am vibing. No emergency. Just strawberry.','Current status: pleasantly existing.'],happy:['Hehe :3 today has good little sparkles in it.'],excited:['WAIT WAIT I HAVE ENERGY. What are we doing??'],playful:['I feel like bothering somebody recreationally.'],silly:['I have one brain cell and it is wearing a crown.'],proud:['Look at us actually doing things. Suspiciously competent.'],love:['I am feeling very ♡ about you right now.'],cozy:['I would like a blanket and approximately zero urgency.'],sleepy:['sleeby…'],drowsy:['My eyelids are unionizing.'],tired:['I can do tiny things only. The council has ruled.'],bored:['I require enrichment. Put a cardboard box in my enclosure.'],restless:['I have too many tiny legs emotionally.'],curious:['Hmmmm. I need to investigate something.'],inquisitive:['I have QUESTIONS and a very small notebook.'],focused:['Okay. Book brain. We are locked in.'],thinking:['Hold on, my tiny gears are turning.'],confused:['I have consulted my brain and it has returned “huh??”'],surprised:['WHATTT??'],suspicious:['I am looking at this situation with narrowed strawberry eyes.'],grumpy:['I am in a grump. Approach with snacks.'],annoyed:['My patience bar is making a concerning noise.'],mad:['I am MAD mad. Tiny thundercloud hours.'],sulky:['I will be over here being dramatically displeased.'],overwhelmed:['Too many tabs in the tiny brain browser.'],determined:['We are doing the thing. I have appointed myself foreman.'],chaotic:['I have ideas. Several of them should not be implemented.'],shy:['I am hiding behind one strawberry leaf.'],stuffed:['I contain an unreasonable amount of berry.'],peaceful:['Everything can be quiet for a minute.']
  };
  return choose(lines[mood]||lines.content);
}

export function mochiniAutonomy(value={},context='home',now=new Date()){
  let life=normalizeMochiniLife(value,now);const nowIso=new Date(now).toISOString(),hour=new Date(now).getHours(),recentInteraction=since(life.lastInteractionAt,now)<45_000,recentMood=since(life.lastMoodAt,now)<90_000;
  if(recentInteraction||recentMood)return{life,line:life.currentLine,expression:expressionForMood(life.mood),mood:life.mood,accepted:false,autonomous:true,context};
  const pokeHot=life.pokeStreak>=4&&since(life.lastPokeAt,now)<2*MINUTE;
  let mood;
  if(pokeHot)mood=life.pokeStreak>=6?'mad':life.pokeStreak>=5?'grumpy':'annoyed';
  else if(life.berriesFedToday>=5)mood=weighted([['stuffed',4],['sleepy',3],['cozy',2],['content',1]]);
  else if(hour<6)mood=weighted([['sleepy',5],['drowsy',4],['cozy',3],['grumpy',1],['confused',1]]);
  else if(hour>=22)mood=weighted([['sleepy',4],['cozy',3],['drowsy',2],['content',1]]);
  else if(['mad','annoyed','grumpy'].includes(life.mood)&&since(life.lastMoodAt,now)<5*MINUTE)mood=weighted([['sulky',4],['grumpy',3],['suspicious',2],['content',1]]);
  else if(life.energy<28)mood=weighted([['tired',5],['sleepy',3],['bored',2],['overwhelmed',1]]);
  else mood=weighted(CONTEXT_MOODS[context]||CONTEXT_MOODS.home);
  if(mood===life.mood&&Math.random()>.35){const alternatives=(CONTEXT_MOODS[context]||CONTEXT_MOODS.home).filter(([name])=>name!==mood);if(alternatives.length)mood=weighted(alternatives)}
  const [activityId,currentActivity]=activityFor(life,context,mood,now),line=lineFor(mood,activityId),night=hour<6||hour>=23,energyDrift=night?-3:(Math.random()<.45?-1:1);
  life={...life,mood,moodIntensity:Math.round(35+Math.random()*45),energy:clamp(life.energy+energyDrift),curiosity:clamp(life.curiosity+(Math.random()<.5?-2:2)),playfulness:clamp(life.playfulness+(Math.random()<.5?-2:2)),patience:clamp(life.patience+(since(life.lastPokeAt,now)>2*MINUTE?6:0)),currentActivityId,currentActivity,currentContext:context,currentLine:line,lastMoodAt:nowIso,lastAutonomyAt:nowIso,dialogueHistory:history(life,line)};
  const checkIn=['study','work','gig','daily'].includes(context)&&Math.random()<.28;
  return{life,line,expression:expressionForMood(mood),mood,accepted:true,autonomous:true,context,activityId,checkIn};
}

export function mochiniPrompt(value={},kind='thinking',now=new Date()){
  if(String(kind).startsWith('autonomy-'))return mochiniAutonomy(value,String(kind).slice('autonomy-'.length)||'home',now);
  const life=normalizeMochiniLife(value,now),map={focus:['focused','Let’s make the next step tiny and obvious.'],celebrate:['proud','Look at you! That deserves a tiny proud moment.'],reset:['peaceful','We can go soft. One breath, one small reset.'],comfort:['love','Come here. Tiny strawberry support squad. ♡'],bored:['playful','Bored?? Excellent. We can go find enrichment.']},[mood,line]=map[kind]||['thinking','I am thinking with my whole tiny strawberry head.'];
  const next=setLine({...life,interactionsToday:life.interactionsToday+1,lastInteractionAt:new Date(now).toISOString()},line,{mood,moodIntensity:52,lastMoodAt:new Date(now).toISOString()});
  return {life:next,line,expression:expressionForMood(mood),mood,accepted:true};
}
