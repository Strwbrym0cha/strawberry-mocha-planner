import{activeRules}from'./constitution.js';
import{normalizeKatModel}from'./kat-model.js';
import{normalizeContext,contextLabel}from'./context.js';

export const BRAIN_VERSION=1;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const ruleSet=constitution=>new Set(activeRules(constitution).map(rule=>rule.id));
const has=(rules,id)=>rules.has(id);

const MODE_PRIORITIES={
  normal:['protected commitments','time-bound plans','context-fit actions','optional momentum'],
  study:['school','protected commitments','study support','everything else'],
  boss:['work','protected commitments','time-bound plans','everything else'],
  bedtime:['before-bed pings','night routine','tomorrow prep','optional tasks'],
  'soft-reset':['recovery','essentials','tiny useful actions','optional tasks'],
  hyperfixation:['current focus','protected commitments','exit ramp','everything else'],
  'home-reset':['home reset','routines','reminders','optional tasks'],
  'going-out':['time-bound plans','leave-home prep','errands','everything else']
};

const energyRank={low:0,medium:1,high:2};
const lowerEnergy=(current,next)=>energyRank[next]<energyRank[current]?next:current;

export function evaluateBrain(input={}){
  const constitution=input.constitution||input.profile?.constitution||[];
  const katModel=normalizeKatModel(input.katModel||input.profile?.katModel);
  const context=normalizeContext(input.context);
  const rules=ruleSet(constitution);
  const reasons=[];

  let choiceCount=clamp(Number(katModel.planning.defaultChoiceCount)||3,1,5);
  let focusScope='normal';
  let taskEnergyCeiling='medium';
  let initiationStyle=katModel.initiation.prefersTinyStarts?'tiny-start':'normal';
  let nudgeLevel='gentle';
  let momentumPolicy=katModel.momentum.protectWhenUseful?'protect':'normal';
  let protectedCommitments=has(rules,'protect-important-commitments')?'surface':'normal';
  let restAllowed=has(rules,'rest-is-valid');
  let modeSuggestion=null;

  if(context.brain==='scattered'){
    if(has(rules,'reduce-choices-when-overwhelmed'))choiceCount=clamp(Number(katModel.planning.overwhelmChoiceCount)||1,1,2);
    else choiceCount=Math.min(choiceCount,2);
    focusScope='single-next-step';
    initiationStyle=katModel.initiation.prefersTinyStarts?'tiny-start':'low-friction';
    reasons.push('Scattered brain narrows the visible decision surface.');
  }

  if(context.brain==='locked-in'){
    momentumPolicy=has(rules,'protect-productive-momentum')&&katModel.momentum.protectWhenUseful?'protect':'normal';
    focusScope='protect-current-focus';
    reasons.push('Locked-in attention is treated as useful momentum unless something protected needs attention.');
  }

  if(context.energy==='drained'){
    taskEnergyCeiling='low';
    nudgeLevel='quiet';
    choiceCount=Math.min(choiceCount,2);
    reasons.push('Drained energy lowers the effort ceiling and softens nudges.');
  }else if(context.energy==='energized'){
    taskEnergyCeiling='high';
    reasons.push('Energized context allows higher-effort options without requiring them.');
  }

  if(context.capacity==='soft'){
    taskEnergyCeiling=lowerEnergy(taskEnergyCeiling,'low');
    choiceCount=Math.min(choiceCount,2);
    restAllowed=has(rules,'rest-is-valid');
    reasons.push('Soft Day favors essentials, low-friction actions, and valid rest.');
  }else if(context.capacity==='big'){
    if(context.energy!=='drained')taskEnergyCeiling='high';
    reasons.push('Big Day permits broader capacity while Constitution rules still apply.');
  }

  if(context.pressure==='some'){
    nudgeLevel=context.energy==='drained'?'gentle':'noticeable';
    protectedCommitments='surface';
    reasons.push('Some time pressure raises visibility for commitments without turning the system alarm-red.');
  }else if(context.pressure==='urgent'){
    nudgeLevel='direct';
    protectedCommitments='front';
    choiceCount=1;
    focusScope='single-next-step';
    reasons.push('Urgent pressure collapses choices to the clearest next action.');
  }

  if(context.mode==='soft-reset'){
    taskEnergyCeiling='low';
    choiceCount=Math.min(choiceCount,2);
    restAllowed=has(rules,'rest-is-valid');
  }
  if(context.mode==='bedtime'){
    taskEnergyCeiling=lowerEnergy(taskEnergyCeiling,'low');
    choiceCount=Math.min(choiceCount,2);
    nudgeLevel=context.pressure==='urgent'?'direct':'quiet';
  }
  if(context.mode==='hyperfixation'&&has(rules,'protect-productive-momentum')){
    momentumPolicy='protect-with-exit-ramp';
  }

  if(context.mode==='normal'&&context.capacity==='soft'&&context.energy==='drained'){
    modeSuggestion={
      value:'soft-reset',
      icon:'🌸',
      label:'Soft Reset',
      reason:'Low energy plus a Soft Day suggests reducing the surface area rather than pushing harder.'
    };
  }

  const priorities=[...(MODE_PRIORITIES[context.mode]||MODE_PRIORITIES.normal)];
  if(protectedCommitments==='front'&&priorities[0]!=='protected commitments'){
    const filtered=priorities.filter(item=>item!=='protected commitments');
    priorities.splice(0,priorities.length,'protected commitments',...filtered);
  }

  const reminderStyle=katModel.reminders.style||'gentle';
  const answerBeforeNudging=has(rules,'answer-before-nudging');
  const allowBonusWork=!has(rules,'do-not-invent-work');
  const partialProgressCounts=has(rules,'partial-routines-count');
  const guiltFreePlanning=has(rules,'guilt-free-planning');

  const headline=context.pressure==='urgent'
    ?'Make the next necessary thing obvious.'
    :context.brain==='scattered'&&context.energy==='drained'
      ?'Make the day smaller, not louder.'
      :context.brain==='locked-in'
        ?'Protect the useful momentum.'
        :context.capacity==='soft'
          ?'Keep the useful bits gentle.'
          :'Keep the next choice clear.';

  const policy={
    version:BRAIN_VERSION,
    headline,
    choiceCount,
    focusScope,
    taskEnergyCeiling,
    initiationStyle,
    nudgeLevel,
    momentumPolicy,
    protectedCommitments,
    restAllowed,
    reminderStyle,
    answerBeforeNudging,
    allowBonusWork,
    partialProgressCounts,
    guiltFreePlanning,
    explainWhy:katModel.decisions.explainWhyWhenHelpful!==false,
    allowMochiniToChoose:katModel.decisions.allowMochiniToChoose!==false,
    priorities,
    modeSuggestion,
    context:{...context},
    reasons
  };

  return policy;
}

export function evaluateStateBrain(state={}){
  return evaluateBrain({
    constitution:state.profile?.constitution,
    katModel:state.profile?.katModel,
    context:state.context
  });
}

export function brainStatusChips(policy){
  if(!policy)return[];
  const energy={low:'🪫 Low effort',medium:'🌱 Medium effort',high:'⚡ High effort'}[policy.taskEnergyCeiling]||policy.taskEnergyCeiling;
  const focus={
    normal:'🌷 Normal scope',
    'single-next-step':'🎯 One next step',
    'protect-current-focus':'🔥 Protect focus'
  }[policy.focusScope]||policy.focusScope;
  const nudge={quiet:'🤫 Quiet nudges',gentle:'🍡 Gentle nudges',noticeable:'🔔 Visible nudges',direct:'🚨 Direct nudges'}[policy.nudgeLevel]||policy.nudgeLevel;
  return[`${policy.choiceCount} choice${policy.choiceCount===1?'':'s'}`,energy,focus,nudge,policy.restAllowed?'🌙 Rest valid':'🌙 Rest not surfaced'];
}

export function brainContextSummary(policy){
  if(!policy?.context)return'';
  const keys=['brain','energy','capacity','pressure','mode'];
  return keys.map(key=>{const item=contextLabel(key,policy.context[key]);return `${item.icon} ${item.label}`}).join(' · ');
}
