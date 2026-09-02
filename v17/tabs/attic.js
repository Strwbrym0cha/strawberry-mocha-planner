function renderAttic({root,router}){
 root.innerHTML=`<main class="v5-attic"><section class="v5-attic-hero"><div><p class="v5-attic-kicker">KATOS V5 • EXTRAS</p><h1>Castle Attic</h1><p>Useful rooms that do not need to live in your face every day.</p></div><div class="v5-attic-hero-icon">🗝️</div></section><section class="v5-attic-grid"><article class="v5-attic-card" data-tone="blue"><span>🧵</span><h2>Threads</h2><p>Project threads can stay here until you are ready to pick one up.</p><button type="button" data-go="projects">Open Threads</button></article></section><section class="v5-attic-note"><h2>Nothing in here was deleted.</h2><p>The Attic only changes where these rooms live in the navigation.</p></section></main>`;
 root.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>router.go(button.dataset.go)));
}
export{renderAttic};
