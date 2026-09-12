let projectedFieldData=null;
let projectedFieldPromise=null;

function loadProjectedField(){
  if(projectedFieldPromise) return projectedFieldPromise;
  projectedFieldPromise=fetch('./data/projected-field/2026-09-13.json',{cache:'no-store'})
    .then(r=>r.ok?r.json():null)
    .then(d=>{projectedFieldData=d;return d;})
    .catch(()=>null);
  return projectedFieldPromise;
}

function bandTag(band){
  if(band==='Qualified') return tag('Qualified','green');
  if(band==='Very likely') return tag('Very likely','green');
  if(band==='Likely') return tag('Likely','gold');
  return '<span class="tag">Bubble</span>';
}

function projectedFieldView(){
  const d=projectedFieldData;
  if(!d) return '<div class="placeholder">Loading projected field…</div>';
  const projected=d.projected24||[];
  const bubble=projected.filter(x=>x.band==='Bubble').length;
  const qualified=projected.filter(x=>x.band==='Qualified').length;
  return `<div class="section-header"><div><div class="kicker">Hub Projection · Snapshot ${d.snapshotDate}</div><h2>Projected Melbourne Cup Field</h2><div class="section-copy">${d.disclaimer}</div></div></div>
  <section class="metric-grid">
    ${metric('Projected Field',projected.length,'Current Hub top 24')}
    ${metric('Qualified',qualified,'Golden Ticket horses in projected 24')}
    ${metric('Bubble',bubble,'Currently around the cut line')}
    ${metric('Next Six',(d.nextSix||[]).length,'First horses outside projection')}
    ${metric('Rebuild','17 Sep','After official handicaps')}
  </section>
  <div class="panel"><div class="panel-head"><div><h3>Projected 24</h3><div class="panel-sub">Research projection only — not official Order of Entry.</div></div><span class="tag gold">PROVISIONAL</span></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Proj.</th><th>Horse</th><th>Trainer</th><th>Trainer Base</th><th>Current Horse Base</th><th>Band</th><th>Reason</th></tr></thead><tbody>${projected.map(x=>{const h=horseByName(x.horse);const tr=h&&typeof trainerRecord==='function'?trainerRecord(h.trainer):null;return `<tr class="${x.rank===24?'cut-line-row':''}"><td>${x.rank}</td><td class="horse">${h?horseLink(x.horse):x.horse}</td><td>${h?.trainer||'—'}</td><td>${tr?.primaryBase||'Researching'}</td><td>${h?currentBase(h.horse):'—'}</td><td>${bandTag(x.band)}</td><td class="wrap-cell">${x.reason}</td></tr>`}).join('')}</tbody></table></div>
  </div>
  <div class="panel spaced-panel"><div class="panel-head"><div><h3>Cut Line</h3><div class="panel-sub">#24 is the present projection boundary. This will move materially after handicaps and declarations.</div></div></div>
    <div class="cut-line-strip"><div><span>IN #24</span><strong>${projected.find(x=>x.rank===24)?.horse||'—'}</strong></div><div class="cut-divider">CUT</div><div><span>NEXT #25</span><strong>${d.nextSix?.[0]||'—'}</strong></div></div>
    <div class="next-six">${(d.nextSix||[]).map((name,i)=>`<button onclick="${horseByName(name)?`openHorse('${name.replace(/'/g,"\\'")}')`:'void 0'}"><span>${25+i}</span><strong>${name}</strong></button>`).join('')}</div>
  </div>
  <div class="panel spaced-panel"><h3>Known Ballot-Exempt Horses</h3><div class="section-copy">Golden Ticket status is a qualification advantage, not the same thing as handicap merit or our projected ranking.</div>${qualificationData?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Horse</th><th>Qualifying Race</th><th>Status</th></tr></thead><tbody>${qualificationData.qualified.map(x=>`<tr><td class="horse">${horseByName(x.horse)?horseLink(x.horse):x.horse}</td><td>${x.race}</td><td>${tag(x.status.includes('uncertain')?'Qualified · uncertain':'Qualified','green')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="placeholder compact">Qualification layer loading…</div>'}</div>`;
}

const projectedDashboardBase=dashboard;
dashboard=function(){
  const base=projectedDashboardBase();
  if(!projectedFieldData) return base;
  const p=projectedFieldData.projected24||[];
  const inHorse=p.find(x=>x.rank===24)?.horse||'—';
  const outHorse=projectedFieldData.nextSix?.[0]||'—';
  const q=qualificationData?.qualified?.length??0;
  const w=weightPredictions?.predictions?.length??0;
  return base+`<section class="section-block"><div class="section-header"><div><div class="kicker">Field Pulse</div><h2>Projected Cut Line</h2><div class="section-copy">Current research projection before official handicaps.</div></div><button class="mini-button" onclick="openView('order')">Projected 24 →</button></div><div class="cut-line-strip"><div><span>PROJECTED IN #24</span><strong>${inHorse}</strong></div><div class="cut-divider">CUT</div><div><span>FIRST OUT #25</span><strong>${outHorse}</strong></div></div><div class="metric-grid spaced-panel">${metric('Projected',p.length,'Current Hub field')}${metric('Golden Tickets',q,'Known ballot exemptions')}${metric('Weights Modelled',w,'Pre-release estimates')}${metric('First Acceptances','29 Sep','Major field reduction')}${metric('Final Field','24','Cup starters')}</div></section>`;
};

const projectedRenderBase=render;
render=function(view='dashboard'){
  if(view==='order'){
    document.getElementById('page-title').textContent='Order of Entry';
    const root=document.getElementById('app-content');
    if(!projectedFieldData){root.innerHTML='<div class="placeholder">Loading projected field…</div>';Promise.all([loadProjectedField(),typeof loadExtras==='function'?loadExtras():Promise.resolve()]).then(()=>render('order'));return;}
    root.innerHTML=projectedFieldView();return;
  }
  projectedRenderBase(view);
};

loadProjectedField().then(()=>{if(currentView==='dashboard')render('dashboard');});
