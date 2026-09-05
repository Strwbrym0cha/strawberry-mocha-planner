const app=document.getElementById('app');
function polish(){
  app?.querySelectorAll('.mochini-command-hero .mochini-status span,.mochini-hero .mochini-status span').forEach(node=>{
    const text=node.textContent||'';
    if(/energy/i.test(text)){
      const match=text.match(/-?\d+(?:\.\d+)?/);
      if(match){const value=Math.max(0,Math.min(100,Math.round(Number(match[0]))));node.textContent=`⚡ ${value}% energy`;}
    }
  });
}
window.addEventListener('katos:rendered',polish);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',polish,{once:true});else polish();
