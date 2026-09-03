export const KAT_MODEL_VERSION=1;

export const DEFAULT_KAT_MODEL={
  planning:{
    style:'flexible',
    defaultChoiceCount:3,
    overwhelmChoiceCount:1,
    allowReschedule:true
  },
  initiation:{
    prefersGatewayTasks:true,
    prefersTinyStarts:true,
    reduceActivationFriction:true
  },
  reminders:{
    style:'gentle',
    contextualMentions:true,
    repeatedNagging:false
  },
  momentum:{
    protectWhenUseful:true,
    redirectBeforeStopping:true
  },
  decisions:{
    allowMochiniToChoose:true,
    explainWhyWhenHelpful:true
  },
  language:{
    tone:'cute-direct',
    avoidCorporateDoom:true,
    celebratePartialProgress:true
  }
};

export const DEFAULT_PATTERNS=[];

const clone=value=>structuredClone(value);
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};

export function normalizeKatModel(value){
  const saved=object(value);
  return{
    ...clone(DEFAULT_KAT_MODEL),
    ...saved,
    planning:{...DEFAULT_KAT_MODEL.planning,...object(saved.planning)},
    initiation:{...DEFAULT_KAT_MODEL.initiation,...object(saved.initiation)},
    reminders:{...DEFAULT_KAT_MODEL.reminders,...object(saved.reminders)},
    momentum:{...DEFAULT_KAT_MODEL.momentum,...object(saved.momentum)},
    decisions:{...DEFAULT_KAT_MODEL.decisions,...object(saved.decisions)},
    language:{...DEFAULT_KAT_MODEL.language,...object(saved.language)}
  };
}

export function normalizePatterns(value){
  if(!Array.isArray(value))return[];
  return value.filter(item=>item&&typeof item==='object').map((pattern,index)=>({
    id:String(pattern.id||`pattern-${index}`),
    label:String(pattern.label||pattern.pattern||'Observed pattern'),
    description:String(pattern.description||''),
    confidence:Math.max(0,Math.min(1,Number(pattern.confidence)||0)),
    evidenceCount:Math.max(0,Math.floor(Number(pattern.evidenceCount)||0)),
    status:['candidate','observed','dismissed'].includes(pattern.status)?pattern.status:'candidate',
    createdAt:String(pattern.createdAt||''),
    updatedAt:String(pattern.updatedAt||'')
  }));
}

export function addPattern(patterns,input={}){
  const now=new Date().toISOString();
  const next={
    id:String(input.id||`pattern-${Date.now().toString(36)}`),
    label:String(input.label||'Observed pattern').trim(),
    description:String(input.description||'').trim(),
    confidence:Math.max(0,Math.min(1,Number(input.confidence)||0)),
    evidenceCount:Math.max(0,Math.floor(Number(input.evidenceCount)||1)),
    status:'candidate',
    createdAt:now,
    updatedAt:now
  };
  return[...normalizePatterns(patterns),next];
}
