export const CONTEXT_VERSION=1;

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
  if(/brain (is )?(soup|mush)|scattered|all over the place|can't focus|cant focus/.test(input))patch.brain='scattered';
  if(/locked in|hyperfocus|hyperfocused|hyperfixated/.test(input))patch.brain='locked-in';
  if(/exhausted|drained|dead tired|no energy|wiped/.test(input))patch.energy='drained';
  if(/energized|full of energy|wired|ready to go/.test(input))patch.energy='energized';
  if(/soft day|take it easy|low capacity|bare minimum/.test(input))patch.capacity='soft';
  if(/big day|ambitious|i can do a lot|high capacity/.test(input))patch.capacity='big';
  if(/urgent|emergency|asap|running out of time/.test(input))patch.pressure='urgent';
  if(/bedtime|going to bed|wind down|winding down/.test(input))patch.mode='bedtime';
  if(/study mode|studying|school mode/.test(input))patch.mode='study';
  if(/work mode|boss mode/.test(input))patch.mode='boss';
  if(/soft reset/.test(input))patch.mode='soft-reset';
  if(/hyperfixation mode/.test(input))patch.mode='hyperfixation';
  return patch;
}
