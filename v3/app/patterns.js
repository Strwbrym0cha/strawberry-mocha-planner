export const PATTERN_LAB_VERSION=1;
const list=v=>Array.isArray(v)?v:[];const text=v=>String(v??'').trim();
const confidence=count=>Math.min(.95,.35+count*.12);
function candidate(id,label,description,evidenceCount,kind='activity'){return{id,label,description,evidenceCount,confidence:confidence(evidenceCount),kind}}
export function derivePatternCandidates(state={}){const out=[];
  const movement=list(state?.movement?.sessions),pairs={};for(const s of movement){const p=text(s.pairedWith);if(p)pairs[p]=(pairs[p]||0)+1}for(const [p,count] of Object.entries(pairs))if(count>=2)out.push(candidate(`motion-pair-${p.toLowerCase().replace(/\W+/g,'-')}`,`Movement often pairs with ${p}`,`${count} logged movement sessions were paired with ${p}.`,count,'movement'));
  const sessions=list(state?.education?.sessions),energies={};for(const s of sessions){const e=text(s.context?.energy);if(e)energies[e]=(energies[e]||0)+1}for(const [e,count] of Object.entries(energies))if(count>=2)out.push(candidate(`study-energy-${e}`,`Study sessions often happen with ${e} energy`,`${count} study sessions were logged while energy was ${e}.`,count,'study'));
  const log=list(state?.insights?.activityLog),routineModes={};for(const event of log.filter(x=>x.type==='routine.completed')){const mode=text(event.context?.mode)||'normal';routineModes[mode]=(routineModes[mode]||0)+1}for(const [mode,count] of Object.entries(routineModes))if(count>=2)out.push(candidate(`routine-mode-${mode}`,`Routine completions often happen in ${mode} mode`,`${count} routine completions were logged in ${mode} mode.`,count,'routine'));
  const resets=list(state?.insights?.resetSessions).filter(x=>x.completedAt),improved=resets.filter(x=>{const before=x.before||{},after=x.after||{};return before.brain==='scattered'&&after.brain==='steady'||before.energy==='drained'&&after.energy==='okay'}).length;if(improved>=2)out.push(candidate('soft-reset-helped','Soft Reset has helped shift your state',`${improved} completed resets showed an improved brain or energy state afterward.`,improved,'reset'));
  return out.sort((a,b)=>b.evidenceCount-a.evidenceCount||a.label.localeCompare(b.label));
}
export function patternPreference(pattern){return{id:String(pattern.id),label:String(pattern.label),description:String(pattern.description||''),approvedAt:new Date().toISOString(),source:'pattern-lab'}}
