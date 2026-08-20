export const CONTEXT_VERSION=2;

export const CONTEXT_OPTIONS={
  brain:[
    {value:'scattered',icon:'🫧',label:'Scattered'},
    {value:'steady',icon:'🌷',label:'Steady'},
    {value:'locked-in',icon:'🔥',label:'Locked In'}
  ],
  energy:[
    {value:'drained',icon:'🪫',label:'Drained'},
    {value:'okay',icon:'🌱',label:'Okay'},
    {value:'energized',icon:'⚡',label:'Energized'}
  ],
  capacity:[
    {value:'soft',icon:'🌙',label:'Soft Day'},
    {value:'normal',icon:'🍓',label:'Normal Day'},
    {value:'big',icon:'🔥',label:'Big Day'}
  ],
  pressure:[
    {value:'chill',icon:'☁️',label:'Chill'},
    {value:'some',icon:'⏰',label:'Some Pressure'},
    {value:'urgent',icon:'🚨',label:'Urgent'}
  ],
  socialBattery:[
    {value:'hiding',icon:'🐚',label:'Hiding'},
    {value:'neutral',icon:'🌿',label:'Neutral'},
    {value:'social',icon:'✨',label:'People-Compatible'}
  ],
  mode:[
    {value:'normal',icon:'🍓',label:'Normal'},
    {value:'study',icon:'🎓',label:'Study'},
    {value:'boss',icon:'💼',label:'Boss'},
    {value:'bedtime',icon:'🌙',label:'Bedtime'},
    {value:'soft-reset',icon:'🌸',label:'Soft Reset'},
    {value:'hyperfixation',icon:'🔥',label:'Hyperfixation'},
    {value:'home-reset',icon:'🏡',label:'Home Reset'},
    {value:'going-out',icon:'🚗',label:'Going Out'}
  ]
};

export const DEFAULT_CONTEXT={
  brain:'steady',
  energy:'okay',
  capacity:'normal',
  pressure:'chill',
  socialBattery:'neutral',
  mode:'normal',
  currentActivity:'',
  note:'',
  updatedAt:''
};

const allowed=(key,value)=>CONTEXT_OPTIONS[key]?.some(option=>option.value===value);

export function normalizeContext(value){
  const saved=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const next={...DEFAULT_CONTEXT,...saved};
  for(const key of ['brain','energy','capacity','pressure','socialBattery','mode']){
    if(!allowed(key,next[key]))next[key]=DEFAULT_CONTEXT[key];
  }
  next.currentActivity=String(next.currentActivity||'').trim();
  next.note=String(next.note||'').trim();
  next.updatedAt=String(next.updatedAt||'');
  return next;
}

export function updateContext(context,patch={}){
  return normalizeContext({...normalizeContext(context),...patch,updatedAt:new Date().toISOString()});
}

export function contextLabel(key,value){
  return CONTEXT_OPTIONS[key]?.find(option=>option.value===value)||{value,icon:'',label:String(value||'')};
}

export function inferContextPatch(text){
  const input=String(text||'').toLowerCase();
  const patch={};

  if(/brain (?:is )?(?:soup|mush|fried)|scattered|all over the place|can(?:not|'t|t) focus|cannot focus|too many thoughts|overwhelmed|overstimulated/.test(input))patch.brain='scattered';
  if(/locked in|hyperfocus(?:ed)?|hyperfixated|in the zone|on a roll|super focused|really focused/.test(input))patch.brain='locked-in';
  if(/feeling (?:pretty )?(?:okay|fine|steady)|brain (?:is )?(?:okay|fine|steady)|focus is okay/.test(input))patch.brain='steady';

  if(/exhausted|drained|dead tired|no energy|zero energy|wiped|so tired|really tired|low energy|running on empty/.test(input))patch.energy='drained';
  if(/energized|full of energy|wired|ready to go|tons of energy|so much energy/.test(input))patch.energy='energized';
  if(/energy (?:is )?(?:okay|fine|normal)|i feel okay|feeling okay/.test(input))patch.energy='okay';

  if(/soft day|take it easy|low capacity|bare minimum|don(?:'t|t) wanna do anything|do not want to do anything|can(?:'t|t) do much|cannot do much|keep it small|easy day/.test(input))patch.capacity='soft';
  if(/big day|ambitious|i can do a lot|high capacity|feeling ambitious|let(?:'s|s) get a lot done/.test(input))patch.capacity='big';
  if(/normal day|regular day|capacity (?:is )?(?:okay|normal)/.test(input))patch.capacity='normal';

  if(/urgent|emergency|asap|running out of time|time crunch|crunch time|has to happen now|need this now/.test(input))patch.pressure='urgent';
  else if(/some pressure|kinda rushed|kind of rushed|a little rushed|deadline coming up|getting close/.test(input))patch.pressure='some';
  if(/no rush|not urgent|plenty of time|we have time/.test(input))patch.pressure='chill';

  if(/don(?:'t|t) wanna talk to anyone|do not want to talk to anyone|social battery (?:is )?(?:dead|empty|low)|leave me alone|people are too much|hiding from people/.test(input))patch.socialBattery='hiding';
  if(/feeling social|social battery (?:is )?(?:good|full)|i wanna see people|want to see people|people-compatible/.test(input))patch.socialBattery='social';

  if(/bedtime|going to bed|go to bed|wind down|winding down|getting ready for bed/.test(input))patch.mode='bedtime';
  if(/study mode|i(?:'m| am) studying|school mode|time to study|about to study/.test(input))patch.mode='study';
  if(/work mode|boss mode|i(?:'m| am) working|time to work/.test(input))patch.mode='boss';
  if(/soft reset/.test(input))patch.mode='soft-reset';
  if(/hyperfixation mode/.test(input))patch.mode='hyperfixation';
  if(/home reset|cleaning the house|reset the house|apartment reset/.test(input))patch.mode='home-reset';
  if(/going out|leaving the house|about to leave|getting ready to go out/.test(input))patch.mode='going-out';
  if(/normal mode|back to normal|regular mode/.test(input))patch.mode='normal';

  return patch;
}

export function describeContextPatch(patch={}){
  return Object.entries(patch).filter(([key,value])=>CONTEXT_OPTIONS[key]?.some(option=>option.value===value)).map(([key,value])=>({key,...contextLabel(key,value)}));
}
