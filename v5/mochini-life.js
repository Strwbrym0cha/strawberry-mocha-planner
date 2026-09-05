// Canonical Mochini life state for V5. This is intentionally UI-free so the
// character rig can stay light and seasonal art can be swapped independently.
const DAY=86400000;
const moods=new Set(['content','happy','excited','sleepy','bored','proud','grumpy','chaotic','curious','confused','love']);
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const number=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,number(value,min)));
const dayKey=(date=new Date())=>{const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const history=(life,line)=>[...Array.isArray(life.dialogueHistory)?life.dialogueHistory:[],line].filter(Boolean).slice(-6);

export const BERRY_LIMIT=6;
export const DEFAULT_MOCHINI_LIFE={mood:'content',energy:70,affection:50,chaos:30,berriesFedToday:0,berriesFedTotal:0,pokeCount:0,interactionsToday:0,currentActivity:'being a tiny strawberry princess',currentLine:'Hihi! I am so happy you’re here. What shall we do today? ♡',dialogueHistory:[],lastPokeAt:null,lastInteractionAt:null,dailyKey:null};

export function normalizeMochiniLife(value={},now=new Date()){
  const source=obj(value),today=dayKey(now),sameDay=source.dailyKey===today;
  return {...DEFAULT_MOCHINI_LIFE,...source,mood:moods.has(source.mood)?source.mood:'content',energy:clamp(source.energy,70),affection:clamp(source.affection,50),chaos:clamp(source.chaos,30),berriesFedToday:sameDay?Math.max(0,Math.floor(number(source.berriesFedToday,0))):0,berriesFedTotal:Math.max(0,Math.floor(number(source.berriesFedTotal,0))),pokeCount:Math.max(0,Math.floor(number(source.pokeCount,0))),interactionsToday:sameDay?Math.max(0,Math.floor(number(source.interactionsToday,0))):0,dialogueHistory:Array.isArray(source.dialogueHistory)?source.dialogueHistory.filter(item=>typeof item==='string').slice(-6):[],dailyKey:today};
}

const pick=(lines,life)=>lines[(life.pokeCount+life.interactionsToday+life.berriesFedToday)%lines.length];
const setLine=(life,line,extra={})=>({...life,...extra,currentLine:line,dialogueHistory:history(life,line)});

export function mochiniPoke(value={},now=new Date()){
  const life=normalizeMochiniLife(value,now),next={...life,pokeCount:life.pokeCount+1,interactionsToday:life.interactionsToday+1,energy:clamp(life.energy+1),affection:clamp(life.affection+1),lastPokeAt:now.toISOString(),lastInteractionAt:now.toISOString()};
  const line=pick(['Eep! Gentle pokes, please! ♡','Hehe—hi hi! I am listening.','A tiny poke has been noted, princess.','Boop received. My strawberry hat is still on!'],next);
  return {life:setLine(next,line,{mood:next.interactionsToday>=4?'happy':'curious'}),line,expression:'poke',accepted:true};
}

export function mochiniBerry(value={},now=new Date()){
  const life=normalizeMochiniLife(value,now);
  if(life.berriesFedToday>=BERRY_LIMIT){const line='My berry tummy is full for today—but I still love you lots. ♡';return {life:setLine(life,line,{lastInteractionAt:now.toISOString()}),line,expression:'grumpy',accepted:false};}
  const count=life.berriesFedToday+1,boost=count>=3?1:5,next={...life,berriesFedToday:count,berriesFedTotal:life.berriesFedTotal+1,interactionsToday:life.interactionsToday+1,energy:clamp(life.energy+boost),affection:clamp(life.affection+(count>=3?1:3)),lastInteractionAt:now.toISOString()};
  const line=pick(['Berry!! My little heart is sparkling!','Mmm—strawberry power acquired!','A berry for me? You are the sweetest.','Nom nom! I feel extra brave now.'],next);
  return {life:setLine(next,line,{mood:'excited'}),line,expression:'berry',accepted:true};
}

export function mochiniPrompt(value={},kind='thinking',now=new Date()){
  const life=normalizeMochiniLife(value,now),map={focus:['thinking','Let’s make the next step tiny and obvious.'],celebrate:['proud','Look at you! That deserves a tiny proud moment.'],reset:['sleepy','We can go soft. One breath, one small reset.'],comfort:['happy','You are not failing. You are having a human day. ♡']},[expression,line]=map[kind]||['thinking','I am thinking with my whole tiny strawberry head.'];
  return {life:setLine({...life,interactionsToday:life.interactionsToday+1,lastInteractionAt:now.toISOString()},line,{mood:expression==='proud'?'proud':life.mood}),line,expression,accepted:true};
}
