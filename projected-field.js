let projectedFieldData=null;
let projectedFieldPromise=null;
let orderFilter='all';
let orderQuery='';

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
function orderWeight(name){try{const w=typeof weightRec==='function'?weightRec(name):null;return w?`${Number(w.predictedKg).toFixed(1)}kg`:'—';}catch(e){return '—';}}
function orderStamina(name){try{return typeof staminaBand==='function'?staminaBand(name):'Researching';}catch(e){return 'Researching';}}
function orderReady(name){try{return typeof readinessScore==='function'?`${readinessScore(name)}/6`:'—';}catch(e){return '—';}}
function orderCampaign(name){try{return typeof currentCampaign==='function'?currentCampaign(name):'Researching';}catch(e){return 'Researching';}}
function orderQualified(name){
  try{return typeof qualificationState==='function'&&qualificationState(name)==='Golden Ticket';}catch(e){return false;}
}
function orderInternational(name){const h=horseByName(name);return h?.trainingRegion==='International';}
function orderFormCount(name){try{return (formIntelData?.horses?.[name]?.runs||[]).length;}catch(e){return 0;}}
function orderProjectedRows(){
  const d=projectedFieldData||{};
  const inside=(d.projected24||[]).map(x=>({...x,state:'IN',projected:true}));
  const outside=(d.nextSix||[]).map((horse,i)=>({rank:25+i,horse,band:'Next six',reason:'First six outside the current Hub projection.',state:'OUT',projected:false}));
  return [...inside,...outside];
}
function orderFilteredRows(){
  const q=orderQuery.trim().toLowerCase();
  return orderProjectedRows().filter(x=>{
    const h=horseByName(x.horse);
    if(q&&!`${x.horse} ${h?.trainer||''}`.toLowerCase().includes(q))return false;
    if(orderFilter==='in'&&!x.projected)return false;
    if(orderFilter==='bubble'&&x.band!=='Bubble'&&x.rank>24)return false;
    if(orderFilter==='qualified'&&!orderQualified(x.horse))return false;
    if(orderFilter==='international'&&!orderInternational(x.horse))return false;
    if(orderFilter==='stayers'&&!/3200|3000|2800/.test(orderStamina(x.horse)))return false;
    return true;
  });
}
function setOrderFilter(v){orderFilter=v;render('order');}
function setOrderQuery(v){orderQuery=v;render('order');setTimeout(()=>{const el=document.getElementById('order-search');if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}},0);}
window.setOrderFilter=setOrderFilter;window.setOrderQuery=setOrderQuery;

function orderControls(){
  const filters=[['all','All 30'],['in','Projected 24'],['bubble','Cut-line'],['qualified','Golden Ticket'],['international','International'],['stayers','2800m+ evidence']];
  return `<div class="order-tools"><input id="order-search" class="order-search" value="${orderQuery.replace(/"/g,'&quot;')}" placeholder="Search horse or trainer…" oninput="setOrderQuery(this.value)">${filters.map(([k,l])=>`<button class="order-filter ${orderFilter===k?'active':''}" onclick="setOrderFilter('${k}')">${l}</button>`).join('')}</div>`;
}

function projectedFieldView(){
  const d=projectedFieldData;
  if(!d) return '<div class="placeholder">Loading projected field…</div>';
  const projected=d.projected24||[];
  const bubble=projected.filter(x=>x.band==='Bubble').length;
  const qualified=projected.filter(x=>orderQualified(x.horse)).length;
  const rows=orderFilteredRows();
  const in24=projected.find(x=>x.rank===24)?.horse||'—';
  const firstOut=d.nextSix?.[0]||'—';
  return `<div class="section-header"><div><div class="kicker">Hub Projection · Snapshot ${d.snapshotDate}</div><h2>Projected Order of Entry Workbench</h2><div class="section-copy">${d.disclaimer}</div></div></div>
  <section class="metric-grid">
    ${metric('Projected Field',projected.length,'Current Hub top 24')}
    ${metric('Qualified in 24',qualified,'Known Golden Ticket nominees')}
    ${metric('Bubble',bubble,'Ranks 20–24 currently fragile')}
    ${metric('Next Six',(d.nextSix||[]).length,'Immediate cut-line pressure')}
    ${metric('Official Weights','17 Sep','Projection rebuild trigger')}
  </section>
  <div class="order-summary"><div><span>IN #24</span><strong>${in24}</strong></div><div><span>FIRST OUT #25</span><strong>${firstOut}</strong></div><div><span>FIELD SIZE</span><strong>24</strong></div><div><span>NEXT MAJOR RESET</span><strong>Weights · 17 Sep</strong></div></div>
  <div class="panel order-board"><div class="panel-head"><div><h3>Cut-Line Board · #1–#30</h3><div class="panel-sub">One decision board joining projection, handicap estimate, staying evidence, latest preparation and research maturity.</div></div><span class="tag gold">PROVISIONAL</span></div>${orderControls()}<div class="table-wrap"><table class="data-table"><thead><tr><th>Proj.</th><th>Horse</th><th>Trainer</th><th>Band</th><th>Pred. Wt</th><th>Stamina</th><th>Form</th><th>Latest Prep</th><th>Ready</th><th>Reason</th></tr></thead><tbody>${rows.length?rows.map((x,i)=>{
    const h=horseByName(x.horse);const rowClass=x.rank===24?'cut-line-row':x.rank===25?'first-out-row':'';const state=x.projected?bandTag(x.band):'<span class="tag">First out</span>';
    const marker=x.rank===25?`<tr class="cut-marker"><td colspan="10">CURRENT PROJECTED FIELD CUT · 24 IN / 6 IMMEDIATE CHASERS</td></tr>`:'';
    return `${marker}<tr class="${rowClass}"><td class="order-rank ${x.projected?'':'out'}">#${x.rank}</td><td class="horse">${h?horseLink(x.horse):x.horse}</td><td>${h?.trainer||'—'}</td><td>${state}</td><td>${orderWeight(x.horse)}</td><td>${orderStamina(x.horse)}</td><td>${orderFormCount(x.horse)}/8</td><td class="wrap-cell">${orderCampaign(x.horse)}</td><td>${orderReady(x.horse)}</td><td class="order-reason">${x.reason}</td></tr>`;
  }).join(''):`<tr><td colspan="10" class="order-empty">No horses match this filter.</td></tr>`}</tbody></table></div></div>
  <div class="panel spaced-panel"><div class="panel-head"><div><h3>Qualification Control</h3><div class="panel-sub">Golden Ticket status is a ballot exemption, not an automatic handicap or projected-ranking advantage.</div></div></div>${qualificationData?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Horse</th><th>Official Nominee?</th><th>Qualifying Race</th><th>Projected Position</th><th>Status</th></tr></thead><tbody>${qualificationData.qualified.map(x=>{const p=projected.find(y=>y.horse===x.horse);return `<tr><td class="horse">${horseByName(x.horse)?horseLink(x.horse):x.horse}</td><td>${horseByName(x.horse)?tag('Yes','green'):'<span class="muted">No / unconfirmed</span>'}</td><td>${x.race}</td><td>${p?`#${p.rank}`:'—'}</td><td>${tag(x.status.includes('uncertain')?'Qualified · uncertain':'Qualified','green')}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="placeholder compact">Qualification layer loading…</div>'}</div>
  <div class="panel spaced-panel"><div class="panel-head"><div><h3>Projection Integrity Notes</h3><div class="panel-sub">Rules currently governing this provisional field.</div></div></div><div class="rule-list">${(d.integrityNotes||[]).map((n,i)=>`<div class="rule-row"><span>${String(i+1).padStart(2,'0')}</span><p>${n}</p></div>`).join('')}</div></div>`;
}

const projectedDashboardBase=dashboard;
dashboard=function(){
  const base=projectedDashboardBase();
  if(!projectedFieldData) return base;
  const p=projectedFieldData.projected24||[];
  const inHorse=p.find(x=>x.rank===24)?.horse||'—';
  const outHorse=projectedFieldData.nextSix?.[0]||'—';
  const q=(qualificationData?.qualified||[]).filter(x=>horseByName(x.horse)).length;
  const w=weightPredictions?.predictions?.length??0;
  return base+`<section class="section-block"><div class="section-header"><div><div class="kicker">Field Pulse</div><h2>Projected Cut Line</h2><div class="section-copy">Current research projection before official handicaps.</div></div><button class="mini-button" onclick="openView('order')">Open cut-line workbench →</button></div><div class="cut-line-strip"><div><span>PROJECTED IN #24</span><strong>${inHorse}</strong></div><div class="cut-divider">CUT</div><div><span>FIRST OUT #25</span><strong>${outHorse}</strong></div></div><div class="metric-grid spaced-panel">${metric('Projected',p.length,'Current Hub field')}${metric('Nominated Tickets',q,'Known ballot exemptions in 101')}${metric('Weights Modelled',w,'Pre-release estimates')}${metric('First Acceptances','29 Sep','Major field reduction')}${metric('Final Field','24','Cup starters')}</div></section>`;
};

const projectedRenderBase=render;
render=function(view='dashboard'){
  if(view==='order'){
    document.getElementById('page-title').textContent='Order of Entry';
    const root=document.getElementById('app-content');
    if(!projectedFieldData){root.innerHTML='<div class="placeholder">Loading projected field…</div>';Promise.all([loadProjectedField(),typeof loadExtras==='function'?loadExtras():Promise.resolve(),typeof loadFormIntel==='function'?loadFormIntel():Promise.resolve(),typeof loadLeadups==='function'?loadLeadups():Promise.resolve()]).then(()=>render('order'));return;}
    root.innerHTML=projectedFieldView();return;
  }
  projectedRenderBase(view);
};

loadProjectedField().then(()=>{if(currentView==='dashboard')render('dashboard');});
