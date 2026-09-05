// Lightweight, explicit lifecycle: no app-wide observers and no animation loop.
// The illustrated source stays canonical; CSS only rigs a few visual layers.
const expressions=['idle','happy','sleepy','surprised','grumpy','thinking','proud','berry','poke'];
let active=null,blinkTimer=null,visible=true,reactionTimer=null;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const mode=()=>document.body.className.match(/mode-([a-z-]+)/)?.[1]||'normal';
const escape=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

function markup(hero){
  const line=escape(hero.dataset.mochiniLine||'Hihi! What shall we do today? ♡');
  return `<div class="mochini-live" data-mochini-live data-expression="idle" tabindex="0" role="button" aria-label="Poke Mochini"><div class="mochini-speech-bubble" data-mochini-speech role="status" aria-live="polite"><p>${line}</p></div><div class="mochini-layer mochini-layer--sparkles" aria-hidden="true">✦ ♡</div><div class="mochini-layer mochini-layer--hat-lag" aria-hidden="true"></div><div class="mochini-layer mochini-layer--dango" aria-hidden="true"></div><div class="mochini-art-wrap"><img class="mochini-art" src="./assets/mochini/mochini-canonical-hero.webp" width="1024" height="1536" alt="Mochini, a Black strawberry-princess mochi sprite holding dango"><span class="mochini-face-rig" aria-hidden="true"><i class="mochini-blush mochini-blush--left"></i><i class="mochini-blush mochini-blush--right"></i><i class="mochini-eyelid mochini-eyelid--left"></i><i class="mochini-eyelid mochini-eyelid--right"></i><i class="mochini-mouth"></i></span></div></div>`;
}

function stopBlink(){if(blinkTimer){clearTimeout(blinkTimer);blinkTimer=null}}
function scheduleBlink(){
  stopBlink();if(!active||!visible||document.hidden||reduced())return;
  blinkTimer=setTimeout(()=>{if(!active||!visible||document.hidden)return;active.classList.add('is-blinking');setTimeout(()=>active?.classList.remove('is-blinking'),170);scheduleBlink()},3000+Math.random()*4000);
}
function setExpression(expression='idle',transient=false){
  if(!active)return;const next=expressions.includes(expression)?expression:'idle';active.dataset.expression=next;
  if(transient){clearTimeout(reactionTimer);reactionTimer=setTimeout(()=>{if(active)active.dataset.expression=active.closest('.mochini-hero')?.dataset.mochiniMood==='sleepy'?'sleepy':'idle'},next==='sleepy'?1200:900)}
}
function sync(hero){
  if(!active||!hero)return;const mood=hero.dataset.mochiniMood||'content',activity=hero.dataset.mochiniActivity||'';
  active.dataset.mode=mode();active.dataset.mood=mood;
  if(mood==='sleepy')setExpression('sleepy');else if(/focus|study|work/i.test(activity)||mode()==='power')setExpression('thinking');else setExpression('idle');
  const bubble=active.querySelector('[data-mochini-speech] p');if(bubble)bubble.textContent=hero.dataset.mochiniLine||'Hihi! What shall we do today? ♡';scheduleBlink();
}
function mount(){
  const hero=document.querySelector('.mochini-hero[data-mochini-life]'),anchor=hero?.querySelector('[data-mochini-visual-anchor]');
  if(!hero||!anchor){active=null;stopBlink();return}
  if(!anchor.querySelector('[data-mochini-live]')){anchor.innerHTML=markup(hero);active=anchor.querySelector('[data-mochini-live]');active.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('katos:mochini-action',{detail:{type:'poke'}})));active.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();window.dispatchEvent(new CustomEvent('katos:mochini-action',{detail:{type:'poke'}}))}})}else active=anchor.querySelector('[data-mochini-live]');
  sync(hero);
}
function runReaction(detail={}){if(!active)return;const raw=detail.expression||detail.reaction||'happy',expression=raw==='focused'?'thinking':raw;setExpression(expression,true);const bubble=active.querySelector('[data-mochini-speech] p');if(bubble&&detail.line)bubble.textContent=detail.line;}

window.addEventListener('katos:rendered',mount);
window.addEventListener('katos:mochini',event=>runReaction(event.detail||{}));
window.addEventListener('katos:mochini-action',event=>{const type=event.detail?.type;if(type)document.querySelector(`[data-mochini-action="${type}"]`)?.click()});
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;scheduleBlink()});
if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);scheduleBlink()},{threshold:.08}).observe(document.getElementById('app'));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.KatOSMochini={setState:detail=>runReaction(detail),nudge:expression=>runReaction({expression})};
