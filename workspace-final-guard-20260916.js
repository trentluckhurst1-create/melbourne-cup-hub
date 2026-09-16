// Final workspace guard — runs after every legacy layer.
(function(){
  function removeSilksTab(){
    document.querySelectorAll('#nav button[data-view="silks"],#nav button').forEach(b=>{
      if(b.dataset.view==='silks'||/silks\s*&\s*colours/i.test(b.textContent||'')) b.remove();
    });
  }
  const nav=document.getElementById('nav');
  if(nav){removeSilksTab();new MutationObserver(removeSilksTab).observe(nav,{childList:true,subtree:true});}

  function weightRows(){
    return (cupData?.horses||[]).map(h=>{
      const p=typeof weightRec==='function'?weightRec(h.horse):null;
      const o=typeof orderOfficialWeight==='function'?orderOfficialWeight(h.horse):null;
      return {h,p,official:Number.isFinite(o)?o:null,wt:Number.isFinite(o)?o:Number(p?.predictedKg)};
    }).sort((a,b)=>(Number.isFinite(b.wt)?b.wt:-1)-(Number.isFinite(a.wt)?a.wt:-1)||a.h.horse.localeCompare(b.h.horse));
  }
  function wrPfr(name){try{const r=publicFormRating(name);return Number.isFinite(Number(r?.current))?Number(r.current).toFixed(1):'—';}catch(e){return '—';}}
  function wrMarket(h){try{const m=marketUniverse().find(x=>x.horse===h.horse);const o=Number(m?.last?.odds??h.marketOdds);return Number.isFinite(o)&&o>1?`$${o.toFixed(2)}`:'—';}catch(e){return '—';}}
  function wrRange(p){return p&&Number.isFinite(Number(p.rangeLow))&&Number.isFinite(Number(p.rangeHigh))?`${Number(p.rangeLow).toFixed(1)}–${Number(p.rangeHigh).toFixed(1)}`:'—';}
  function wrStatus(h){return GOLDEN_TICKETS.has(h.horse)?'<span class="nom-status qualified">QUALIFIED</span>':'<span class="nom-status">NOMINATED</span>';}
  function weightsWorkspace(){
    const rs=weightRows();const officialCount=rs.filter(x=>x.official!=null).length;const modelled=rs.filter(x=>Number.isFinite(x.wt)).length;const official=officialCount>0;const top=rs.find(x=>Number.isFinite(x.wt));
    return `<div class="section-header wh-head"><div><div class="kicker">FLEMINGTON · 3200M · GROUP 1</div><h2>Weights & Handicap</h2></div></div>
    <section class="wh-summary"><div><span>NOMINATIONS</span><strong>${rs.length}</strong></div><div><span>${official?'OFFICIAL WEIGHTS':'PROJECTED WEIGHTS'}</span><strong>${official?officialCount:modelled}</strong></div><div><span>TOP WEIGHT</span><strong>${top?top.wt.toFixed(1):'—'}<small> kg</small></strong></div><div><span>HANDICAPS</span><strong>${official?'OFFICIAL':'17 SEP'}</strong></div></section>
    <div class="toolbar wh-toolbar"><div class="filters"><button class="filter active" data-wh-filter="all">All Horses <span>${rs.length}</span></button><button class="filter" data-wh-filter="ticket">Qualified <span>${rs.filter(x=>GOLDEN_TICKETS.has(x.h.horse)).length}</span></button></div><input id="wh-search" class="search" type="search" placeholder="Search horse or trainer…"></div>
    <div class="panel wh-panel"><div class="table-wrap"><table class="data-table wh-table"><thead><tr><th>#</th><th>Horse</th><th>Country</th><th>Trainer</th><th>${official?'Official Wt':'Projected Wt'}</th><th>Range</th><th>PFR</th><th>Market</th><th>Tier</th><th>Confidence</th><th>Status</th></tr></thead><tbody id="wh-body"></tbody></table></div></div>`;
  }
  function paint(filter='all',query=''){
    const body=document.getElementById('wh-body');if(!body)return;const q=query.trim().toLowerCase();
    const rs=weightRows().filter(x=>(filter==='all'||GOLDEN_TICKETS.has(x.h.horse))&&(!q||`${x.h.horse} ${x.h.trainer} ${x.h.country}`.toLowerCase().includes(q)));
    body.innerHTML=rs.map((x,i)=>`<tr><td>${i+1}</td><td class="horse">${typeof silkHorse==='function'?silkHorse(x.h.horse):horseLink(x.h.horse)}</td><td>${x.h.country||'—'}</td><td>${x.h.trainer||'—'}</td><td class="wh-weight"><strong>${Number.isFinite(x.wt)?x.wt.toFixed(1):'—'}</strong></td><td>${wrRange(x.p)}</td><td class="wh-pfr">${wrPfr(x.h.horse)}</td><td>${wrMarket(x.h)}</td><td>${x.p?.tier||'—'}</td><td>${x.p?.confidence||'—'}</td><td>${wrStatus(x.h)}</td></tr>`).join('');
  }
  function showWeights(){
    currentView='weights';selectedHorse=null;removeSilksTab();
    document.querySelectorAll('#nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='weights'));
    document.getElementById('page-title').textContent='Weights & Handicap';
    const root=document.getElementById('app-content');
    if(!weightPredictions){root.innerHTML='<div class="placeholder">Loading…</div>';loadExtras().then(showWeights);return;}
    root.innerHTML=weightsWorkspace();paint();
  }
  const legacyRender=window.render;
  window.render=function(view='dashboard'){if(view==='weights'){showWeights();return;}const out=legacyRender(view);removeSilksTab();return out;};
  const legacyOpenView=window.openView;
  window.openView=function(view){if(view==='weights'){showWeights();return;}return legacyOpenView(view);};
  document.addEventListener('click',e=>{
    const w=e.target.closest('#nav button[data-view="weights"]');if(!w)return;
    e.preventDefault();e.stopImmediatePropagation();showWeights();
  },true);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-wh-filter]');if(!b)return;document.querySelectorAll('[data-wh-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');paint(b.dataset.whFilter,document.getElementById('wh-search')?.value||'');});
  document.addEventListener('input',e=>{if(e.target?.id==='wh-search')paint(document.querySelector('[data-wh-filter].active')?.dataset.whFilter||'all',e.target.value);});
  removeSilksTab();
})();