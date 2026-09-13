// Global command / horse finder for desktop workspace.
(function(){
  const topbar=document.querySelector('.topbar-actions');
  if(!topbar)return;

  const trigger=document.createElement('button');
  trigger.className='quick-find-trigger';
  trigger.type='button';
  trigger.innerHTML='<span>Find horse or workspace</span><kbd>Ctrl K</kbd>';
  topbar.prepend(trigger);

  const overlay=document.createElement('div');
  overlay.className='quick-find-overlay';
  overlay.hidden=true;
  overlay.innerHTML=`<div class="quick-find-dialog" role="dialog" aria-modal="true" aria-label="Command search">
    <div class="quick-find-input-wrap"><span class="quick-find-icon">⌕</span><input id="quick-find-input" autocomplete="off" placeholder="Search horse, trainer, country or workspace…"><kbd>Esc</kbd></div>
    <div class="quick-find-meta"><span id="quick-find-count">Ready</span><span>↑ ↓ navigate · Enter open</span></div>
    <div id="quick-find-results" class="quick-find-results"></div>
  </div>`;
  document.body.appendChild(overlay);

  const input=overlay.querySelector('#quick-find-input');
  const results=overlay.querySelector('#quick-find-results');
  const count=overlay.querySelector('#quick-find-count');
  let activeIndex=0;
  let currentItems=[];

  function workspaceItems(){
    return (typeof navItems!=='undefined'?navItems:[]).map(([id,label])=>({type:'workspace',id,label,meta:'Workspace'}));
  }
  function horseItems(){
    return (typeof cupData!=='undefined'?(cupData?.horses||[]):[]).map(h=>({type:'horse',id:h.horse,label:h.horse,meta:`${h.trainer} · ${h.country}`,search:`${h.horse} ${h.trainer} ${h.country} ${typeof currentBase==='function'?currentBase(h.horse):''}`.toLowerCase()}));
  }
  function allItems(){return [...workspaceItems(),...horseItems()];}
  function score(item,q){
    const label=item.label.toLowerCase();
    const hay=(item.search||`${item.label} ${item.meta}`).toLowerCase();
    if(label===q)return 0;
    if(label.startsWith(q))return 1;
    if(label.includes(q))return 2;
    if(hay.includes(q))return 3;
    return 99;
  }
  function search(){
    const q=input.value.trim().toLowerCase();
    const pool=allItems();
    currentItems=(q?pool.map(x=>({...x,_score:score(x,q)})).filter(x=>x._score<99).sort((a,b)=>a._score-b._score||a.label.localeCompare(b.label)):pool.filter(x=>x.type==='workspace')).slice(0,16);
    activeIndex=Math.min(activeIndex,Math.max(0,currentItems.length-1));
    count.textContent=q?`${currentItems.length} result${currentItems.length===1?'':'s'}`:'Workspaces';
    results.innerHTML=currentItems.length?currentItems.map((x,i)=>`<button class="quick-find-row ${i===activeIndex?'active':''}" data-index="${i}"><span class="quick-find-type">${x.type==='horse'?'HORSE':'VIEW'}</span><span class="quick-find-main"><strong>${x.label}</strong><em>${x.meta}</em></span><span class="quick-find-open">↵</span></button>`).join(''):'<div class="quick-find-empty">No matching horse or workspace.</div>';
  }
  function openItem(item){
    if(!item)return;
    close();
    if(item.type==='horse'&&typeof openHorse==='function')openHorse(item.id);
    else if(item.type==='workspace'&&typeof openView==='function')openView(item.id);
  }
  function open(){overlay.hidden=false;document.body.classList.add('quick-find-open');input.value='';activeIndex=0;search();requestAnimationFrame(()=>input.focus());}
  function close(){overlay.hidden=true;document.body.classList.remove('quick-find-open');}

  trigger.addEventListener('click',open);
  overlay.addEventListener('mousedown',e=>{if(e.target===overlay)close();});
  results.addEventListener('click',e=>{const row=e.target.closest('[data-index]');if(row)openItem(currentItems[Number(row.dataset.index)]);});
  input.addEventListener('input',()=>{activeIndex=0;search();});
  input.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){e.preventDefault();activeIndex=Math.min(currentItems.length-1,activeIndex+1);search();}
    if(e.key==='ArrowUp'){e.preventDefault();activeIndex=Math.max(0,activeIndex-1);search();}
    if(e.key==='Enter'){e.preventDefault();openItem(currentItems[activeIndex]);}
    if(e.key==='Escape'){e.preventDefault();close();}
  });
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();overlay.hidden?open():close();}
    if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&overlay.hidden&&!["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)){e.preventDefault();open();}
    if(e.key==='Escape'&&!overlay.hidden)close();
  });
})();
