import{MOCHINI_FACE_KEYS,setMoodFace}from'./mochini-face-manifest.js?v=6.4.0-face-slots';

// V5 Mochini rig: body/activity and emotion are separate systems.
// Emotion always swaps one whole-face asset. We never assemble eyes/nose/mouth independently.
let active=null,blinkTimer=null,visible=true,reactionTimer=null;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const mode=()=>document.body.className.match(/mode-([a-z-]+)/)?.[1]||'normal';
const escape=value=>String(value??'').replace(/[&<>'\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[char]));
const aliases={idle:'content',berry:'excited',poke:'playful',celebrate:'proud',comfort:'love',closed:'sleepy'};
const moodKey=value=>MOCHINI_FACE_KEYS.includes(value)?value:(aliases[value]||'content');

function markup(hero){
  const line=escape(hero.dataset.mochiniLine||'Hihi! What shall we do today? ♡');
  return `<div class="mochini-live" data-mochini-live data-expression="content" tabindex="0" role="button" aria-label="Poke Mochini"><div class="mochini-speech-bubble" data-mochini-speech role="status" aria-live="polite"><p>${line}</p></div><div class="mochini-layer mochini-layer--sparkles" aria-hidden="true">✦ ♡</div><div class="mochini-layer mochini-layer--hat-lag" aria-hidden="true"></div><div class="mochini-layer mochini-layer--dango" aria-hidden="true"></div><div class="mochini-art-wrap"><img class="mochini-art" data-mochini-art data-mochini-sprite="content" src="./assets/mochini/mochini-canonical-hero.webp" width="1024" height="1536" decoding="async" alt="Mochini, a Black strawberry-princess mochi sprite holding dango"></div></div>`;
}
function stopBlink(){if(blinkTimer){clearTimeout(blinkTimer);blinkTimer=null}}
function setExpression(value='content',transient=false){
  if(!active)return;const key=moodKey(value),art=active.querySelector('[data-mochini-art]');
  active.dataset.expression=key;setMoodFace(art,key);
  if(transient){clearTimeout(reactionTimer);reactionTimer=setTimeout(()=>{if(active)setExpression(moodExpression(active.closest('.mochini-hero')),false)},key==='sleepy'?1500:1000)}
}
function blink(){
  const art=active?.querySelector('[data-mochini-art]');if(!art)return;
  active.dataset.blinking='true';setMoodFace(art,active.dataset.expression||'content',{blink:true});
  setTimeout(()=>{if(active){delete active.dataset.blinking;setExpression(active.dataset.expression||'content')}},170);
}
function scheduleBlink(){
  stopBlink();if(!active||!visible||document.hidden||reduced())return;
  blinkTimer=setTimeout(()=>{if(!active||!visible||document.hidden)return;blink();scheduleBlink()},3000+Math.random()*4000);
}
function moodExpression(hero){
  const mood=moodKey(hero?.dataset.mochiniMood||active?.dataset.mood||'content'),activity=hero?.dataset.mochiniActivity||'';
  if(mood==='content'&&(/focus|study|work/i.test(activity)||mode()==='power'))return'thinking';
  return mood;
}
function sync(hero){
  if(!active||!hero)return;const mood=moodKey(hero.dataset.mochiniMood||'content');
  active.dataset.mode=mode();active.dataset.mood=mood;setExpression(moodExpression(hero));
  const bubble=active.querySelector('[data-mochini-speech] p');if(bubble)bubble.textContent=hero.dataset.mochiniLine||'Hihi! What shall we do today? ♡';scheduleBlink();
}
function mount(){
  const hero=document.querySelector('.mochini-hero[data-mochini-life]'),anchor=hero?.querySelector('[data-mochini-visual-anchor]');
  if(!hero||!anchor){active=null;stopBlink();return}
  if(!anchor.querySelector('[data-mochini-live]')){
    anchor.innerHTML=markup(hero);active=anchor.querySelector('[data-mochini-live]');
    active.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('katos:mochini-action',{detail:{type:'poke'}})));
    active.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();window.dispatchEvent(new CustomEvent('katos:mochini-action',{detail:{type:'poke'}}))}})
  }else active=anchor.querySelector('[data-mochini-live]');
  sync(hero);
}
function runReaction(detail={}){
  if(!active)return;const expression=moodKey(detail.mood||detail.expression||detail.reaction||'happy');
  if(detail.mood)active.dataset.mood=moodKey(detail.mood);setExpression(expression,!detail.autonomous);
  const bubble=active.querySelector('[data-mochini-speech] p');if(bubble&&detail.line)bubble.textContent=detail.line;
}
window.addEventListener('katos:rendered',mount);
window.addEventListener('katos:mochini',event=>runReaction(event.detail||{}));
window.addEventListener('katos:mochini-action',event=>{const type=event.detail?.type;if(type)document.querySelector(`[data-mochini-action="${type}"]`)?.click()});
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;scheduleBlink()});
if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);scheduleBlink()},{threshold:.08}).observe(document.getElementById('app'));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.KatOSMochini={setState:detail=>runReaction(detail),nudge:expression=>runReaction({expression})};
