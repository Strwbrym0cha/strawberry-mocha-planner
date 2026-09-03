export const BEHAVIOR_SUPPORT_VERSION=1;

export const BEHAVIOR_PRINCIPLES=[
  {id:'antecedent-arrangement',icon:'🧺',label:'Set up the environment first',description:'Make the helpful behavior easier to start before relying on motivation.'},
  {id:'task-analysis',icon:'🪜',label:'Break sticky things into steps',description:'Turn a vague or sticky activity into the smallest concrete next action.'},
  {id:'shaping',icon:'🌱',label:'Build gradually',description:'Reinforce useful approximations and grow the behavior instead of demanding the full version immediately.'},
  {id:'behavioral-momentum',icon:'🔥',label:'Use momentum',description:'Start with an easy response or pair the behavior with something already happening, then roll forward.'},
  {id:'premack',icon:'🍓',label:'First this, then that',description:'Pair a less-preferred action with reliable access to something already wanted.'},
  {id:'differential-reinforcement',icon:'✨',label:'Strengthen what we want more of',description:'Celebrate and make useful behavior rewarding without shaming competing behavior.'},
  {id:'prompt-fading',icon:'🔔',label:'Prompts should fade',description:'Use prompts to help initiation, then reduce them when the behavior becomes reliable.'},
  {id:'self-monitoring',icon:'📓',label:'Track what actually happened',description:'Use logs as information for future decisions, not as a scorecard.'},
  {id:'choice-architecture',icon:'🎯',label:'Reduce the decision surface',description:'When choices become friction, show fewer context-fit options.'},
  {id:'response-effort',icon:'🪽',label:'Lower response effort',description:'If the desired behavior takes too many taps, steps, or setup actions, simplify the system.'},
  {id:'reinforce-initiation',icon:'🌷',label:'Starting counts',description:'Initiating the behavior is worth reinforcing even when the full activity is not completed.'}
];

export const DEFAULT_BEHAVIOR_SUPPORT={
  enabled:true,
  reinforceInitiation:true,
  antecedentArrangement:true,
  taskAnalysis:true,
  shaping:true,
  behavioralMomentum:true,
  premack:true,
  differentialReinforcement:true,
  promptFading:true,
  selfMonitoring:true,
  choiceArchitecture:true,
  responseEffortReduction:true
};

const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};

export function normalizeBehaviorSupport(value){
  const saved=object(value);
  return Object.fromEntries(Object.entries(DEFAULT_BEHAVIOR_SUPPORT).map(([key,defaultValue])=>[key,saved[key]===undefined?defaultValue:!!saved[key]]));
}

export function ensureBehaviorSupport(state={}){
  const profile=object(state.profile),preferences=object(profile.preferences);
  return{
    ...state,
    profile:{
      ...profile,
      preferences:{...preferences,behaviorSupport:normalizeBehaviorSupport(preferences.behaviorSupport)}
    }
  };
}

export function evaluateBehaviorSupport(state={}){
  const settings=normalizeBehaviorSupport(state.profile?.preferences?.behaviorSupport);
  const context=state.context||{};
  const tactics=[];
  if(!settings.enabled)return{settings,tactics,primary:null};

  const add=(id,reason)=>{const principle=BEHAVIOR_PRINCIPLES.find(item=>item.id===id);if(principle&&!tactics.some(item=>item.id===id))tactics.push({...principle,reason})};

  if(settings.reinforceInitiation)add('reinforce-initiation','Reward the start, not only the finished product.');
  if(settings.responseEffortReduction&&(context.brain==='scattered'||context.energy==='drained'||context.capacity==='soft'))add('response-effort','Today-Kat benefits from fewer steps between intention and action.');
  if(settings.choiceArchitecture&&context.brain==='scattered')add('choice-architecture','Scattered attention makes fewer visible choices more useful.');
  if(settings.taskAnalysis&&context.brain==='scattered')add('task-analysis','One concrete next action is easier to initiate than a broad instruction.');
  if(settings.shaping&&(context.energy==='drained'||context.capacity==='soft'))add('shaping','A smaller version today can still strengthen the behavior.');
  if(settings.behavioralMomentum&&context.brain==='locked-in')add('behavioral-momentum','Protect useful momentum and attach compatible actions instead of interrupting it.');
  if(settings.antecedentArrangement)add('antecedent-arrangement','Set up cues, supplies, or the environment so the next response is easier.');
  if(settings.selfMonitoring)add('self-monitoring','Log what happened so KatOS can learn from actual behavior rather than assumptions.');
  if(settings.promptFading)add('prompt-fading','Prompts are support, not a permanent dependency.');

  return{settings,tactics:tactics.slice(0,6),primary:tactics[0]||null};
}
