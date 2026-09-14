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
function orderPredWeight(name){try{const w=typeof weightRec==='function'?weightRec(name):null;return w?Number(w.predictedKg):null;}catch(e){return null;}}
function orderOfficialWeight(name){try{const map=typeof officialWeightMap==='function'?officialWeightMap():new Map();const r=map.get(name);return r?Number(r.weightKg):null;}catch(e){return null;}}
function orderWeight(name){const o=orderOfficialWeight(name);const p=orderPredWeight(name);if(Number.isFinite(o))return `<strong>${o.toFixed(1)}kg</strong><div class="muted">official · pred ${Number.isFinite(p)?p.toFixed(1):'—'}</div>`;return Number.isFinite(p)?`${p.toFixed(1)}kg`:'—';}
function orderWeightDelta(name){const o=orderOfficialWeight(name);const p=orderPredWeight(name);return Number.isFinite(o)&&Number.isFinite(p)?o-p:null;}
function orderWeightDeltaHtml(name){const d=orderWeightDelta(name);if(!Number.isFinite(d))return '<span class="muted">—</span>';const cls=Math.abs(d)<=0.5?'green':Math.abs(d)>=2?'red':'gold';return tag(`${d>0?'+':''}${d.toFixed(1)}kg`,cls);}
function orderStamina(name){try{return typeof staminaBand==='function'?staminaBand(name):'Researching';}catch(e){return 'Researching';}}
function orderReady(name){try{return typeof readinessScore==='function'?`${readinessScore(name)}/6`:'—';}catch(e){return '—';}}
function orderCampaign(name){try{return typeof currentCampaign==='function'?currentCampaign(name):'Researching';}catch(e){return 'Researching';}}
function orderQualified(name){try{return typeof qualificationState==='function'&&qualificationState(name)==='Golden Ticket';}catch(e){return false;}}
function orderInternational(name){const h=horseByName(name);return h?.trainingRegion==='International';}
function orderFormCount(name){try{return typeof actualRaceRuns==='function'?actualRaceRuns(name).length:(formIntelData?.horses?.[name]?.runs||[]).length;}catch(e){return 0;}}
function orderFormComplete(name){try{const s=typeof formCompletionState==='function'?formCompletionState(name):null;return !!s&&(s.state==='COMPLETE'||s.state==='CAREER_COMPLETE');}catch(e){return false;}}
function orderMarket(name){try{return typeof marketUniverse==='function'?marketUniverse().find(x=>x.horse===name)||null:null;}catch(e){return null;}}
function orderTf(name){try{return typeof privateTfMatched==='function'?privateTfMatched(name):!(timeformStatusData?.unresolvedHorses||[]).includes(name);}catch(e){return false;}}
function orderEvidence(name){
  const parts=[
    {k:'FORM',ok:orderFormComplete(name),state:'VERIFIED'},
    {k:'BASE',ok:!!baseRecord(name),state:'VERIFIED'},
    {k:'WT',ok:Number.isFinite(orderPredWeight(name)),state:'MODELLED'},
    {k:'MKT',ok:!!orderMarket(name),state:'DATED'},
    {k:'TF',ok:orderTf(name),state:'IDENTITY'}
  ];
  return {score:parts.filter(x=>x.ok).length,parts};
}
function orderEvidenceHtml(name){
  const e=orderEvidence(name);
  const cls=e.score>=4?'green':e.score>=3?'gold':'red';
  const detail=e.parts.map(x=>`${x.k}:${x.ok?x.state:'GAP'}`).join(' · ');
  return `<span class="tag ${cls}" title="${detail}">${e.score}/5</span>`;
}
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
    if(orderFilter==='lowevidence'&&orderEvidence(x.horse).score>=4)return false;
    if(orderFilter==='weightshock'&&!(Number.isFinite(orderWeightDelta(x.horse))&&Math.abs(orderWeightDelta(x.horse))>=1.5))return false;
    return true;
  });
}
function setOrderFilter(v){orderFilter=v;render('order');}
function setOrderQuery(v){orderQuery=v;render('order');setTimeout(()=>{const el=document.getElementById('order-search');if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}},0);}
window.setOrderFilter=setOrderFilter;window.setOrderQuery=setOrderQuery;

function orderControls(){
  const hasOfficial=(officialWeights?.weights||[]).length>0;
  const filters=[['all','All 30'],['in','Projected 24'],['bubble','Cut-line'],['qualified','Golden Ticket'],['international','International'],['stayers','2800m+ evidence'],['lowevidence','Evidence gaps'],...(hasOfficial?[['weightshock','Weight shocks']]:[])];
  return `<div class="order-tools"><input id="order-search" class="order-search" value="${orderQuery.replace(/"/g,'&quot;')}" placeholder="Search horse or trainer…" oninput="setOrderQuery(this.value)">${filters.map(([k,l])=>`<button class="order-filter ${orderFilter===k?'active':''}" onclick="setOrderFilter('${k}')">${l}</button>`).join('')}</div>`;
}

function projectedFieldView(){
  const d=projectedFieldData;
  if(!d) return '<div class="placeholder">Loading projected field…</div>';
  const projected=d.projected24||[];
  const bubble=projected.filter(x=>x.band==='Bubble').length;
  const qualified=projected.filter(x=>orderQualified(x.horse)).length;
  const lowEvidence=projected.filter(x=>orderEvidence(x.horse).score<4).length;
  const weightShocks=projected.filter(x=>Number.isFinite(orderWeightDelta(x.horse))&&Math.abs(orderWeightDelta(x.horse))>=1.5).length;
  const officialLoaded=(officialWeights?.weights||[]).length;
  const rows=orderFilteredRows();
  const in24=projected.find(x=>x.rank===24)?.horse||'—';
  const firstOut=d.nextSix?.[0]||'—';
  return `<div class="section-header"><div><div class="kicker">Hub Projection · Snapshot ${d.snapshotDate}</div><h2>Projected Order of Entry Workbench</h2><div class="section-copy">${d.disclaimer}</div></div></div>
  <section class="metric-grid">
    ${metric('Projected Field',projected.length,'Current Hub top 24')}
    ${metric('Qualified in 24',qualified,'Known Golden Ticket nominees')}
    ${metric('Bubble',bubble,'Ranks 20–24 currently fragile')}
    ${metric('Evidence Gaps',lowEvidence,'Projected runners below 4/5 maturity')}
    ${metric(officialLoaded?'Weight Shocks':'Official Weights',officialLoaded?weightShocks:'17 Sep',officialLoaded?'Projected runners ±1.5kg from model':'Projection rebuild trigger')}
    ${metric('Next Six',(d.nextSix||[]).length,'Immediate cut-line pressure')}
  </section>
  <div class="order-summary"><div><span>IN #24</span><strong>${in24}</strong></div><div><span>FIRST OUT #25</span><strong>${firstOut}</strong></div><div><span>FIELD SIZE</span><strong>24</strong></div><div><span>${officialLoaded?'WEIGHT STATE':'NEXT MAJOR RESET'}</span><strong>${officialLoaded?`${officialLoaded} official loaded`:'Weights · 17 Sep'}</strong></div></div>
  <div class="panel order-board"><div class="panel-head"><div><h3>Cut-Line Board · #1–#30</h3><div class="panel-sub">Projection and evidence maturity are shown separately. Official-weight surprises are exposed without silently rewriting the existing projection.</div></div><span class="tag gold">PROVISIONAL</span></div>${orderControls()}<div class="table-wrap"><table class="data-table"><thead><tr><th>Proj.</th><th>Horse</th><th>Trainer</th><th>Band</th><th>Evidence</th><th>${officialLoaded?'Weight':'Pred. Wt'}</th>${officialLoaded?'<th>Δ</th>':''}<th>Stamina</th><th>Form</th><th>Latest Prep</th><th>Ready</th><th>Reason</th></tr></thead><tbody>${rows.length?rows.map(x=>{
    const h=horseByName(x.horse);const rowClass=x.rank===24?'cut-line-row':x.rank===25?'first-out-row':'';const state=x.projected?bandTag(x.band):'<span class="tag">First out</span>';
    const cols=officialLoaded?12:11;
    const marker=x.rank===25?`<tr class="cut-marker"><td colspan="${cols}">CURRENT PROJECTED FIELD CUT · 24 IN / 6 IMMEDIATE CHASERS</td></tr>`:'';
    return `${marker}<tr class="${rowClass}"><td class="order-rank ${x.projected?'':'out'}">#${x.rank}</td><td class="horse">${h?horseLink(x.horse):x.horse}</td><td>${h?.trainer||'—'}</td><td>${state}</td><td>${orderEvidenceHtml(x.horse)}</td><td>${orderWeight(x.horse)}</td>${officialLoaded?`<td>${orderWeightDeltaHtml(x.horse)}</td>`:''}<td>${orderStamina(x.horse)}</td><td>${orderFormCount(x.horse)}/8</td><td class="wrap-cell">${orderCampaign(x.horse)}</td><td>${orderReady(x.horse)}</td><td class="order-reason">${x.reason}</td></tr>`;
  }).join(''):`<tr><td colspan="${officialLoaded?12:11}" class="order-empty">No horses match this filter.</td></tr>`}</tbody></table></div></div>
  <div class="panel spaced-panel"><div class="panel-head"><div><h3>Evidence Key</h3><div class="panel-sub">Maturity score counts governed FORM completion, verified BASE, modelled WT, dated MKT evidence and TF identity. It is not a performance rating.</div></div></div><div class="rule-list"><div class="rule-row"><span>V</span><p><strong>VERIFIED</strong> = factual source-backed evidence loaded.</p></div><div class="rule-row"><span>M</span><p><strong>MODELLED</strong> = Hub estimate, kept distinct from official fact.</p></div><div class="rule-row"><span>D</span><p><strong>DATED</strong> = observed market snapshot; not live unless explicitly approved and timestamped.</p></div><div class="rule-row"><span>G</span><p><strong>GAP</strong> = missing evidence remains visible and does not get silently inferred.</p></div></div></div>
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
    if(!projectedFieldData){root.innerHTML='<div class="placeholder">Loading projected field…</div>';Promise.all([loadProjectedField(),typeof loadExtras==='function'?loadExtras():Promise.resolve(),typeof loadFormIntel==='function'?loadFormIntel():Promise.resolve(),typeof loadLeadups==='function'?loadLeadups():Promise.resolve(),typeof loadMarketWorkbench==='function'?loadMarketWorkbench():Promise.resolve()]).then(()=>render('order'));return;}
    root.innerHTML=projectedFieldView();return;
  }
  projectedRenderBase(view);
};

loadProjectedField().then(()=>{if(currentView==='dashboard')render('dashboard');});
