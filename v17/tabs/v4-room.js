const room=(root,view,title)=>{
 root.innerHTML=`<iframe class="v5-v4-room" title="${title}" src="../v4/?view=${view}&embed=1&v=4.1.27"></iframe>`;
};

function renderMoneyV4({root}){room(root,'money','Money Café')}
function renderWorkV4({root}){room(root,'boss','Boss Bitch')}

export{renderMoneyV4,renderWorkV4};
