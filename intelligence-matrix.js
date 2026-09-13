let matrixReady=false;
let matrixFilter='all';
let matrixSearch='';
let matrixSort='projected';

function latestLeadup(name){return (leadupData?.events||[]).filter(x=>x.horse===name).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;}
function publicFormRec(name){return formIntelData?.horses?.[name]||null;}
function tfStatusRec(name){return privateTfMatched(name)?'Matched':'Unresolved';}
function staminaBand(name){
  const runs=publicFormRec(name)?.runs||[];
  if(!runs.length)return 'Researching';
  const distances=runs.map(r=>Number(r.distanceM)||0);
  const max=Math.max(...distances);
  const wins=runs.filter(r=>/^1st$/i.test(r.finish||''));
  const winMax=wins.length?Math.max(...wins.map(r=>Number(r.distanceM)||0)):0;
  if(winMax>=3200)return '3200m winner';
  if(runs.some(r=>Number(r.distanceM)>=3200 && /^(2nd|3rd)$/i.test(r.finish||'')))return '3200m placed';
  if(max>=3200)return '3200m exposed';
  if(winMax>=3000)return '3000m+ winner';
  if(max>=3000)return '3000m+ exposed';
  if(winMax>=2800)return '2800m+ winner';
  if(max>=2800)return '2800m+ exposed';
  if(max>=2400)return '2400m+ evidence';
  return '<2400m loaded';
}
function qualificationState(name){
  const q=(qualificationData?.qualified||[]).find(x=>x.horse===name);
  if(q)return 'Golden Ticket';
  const l=latestLeadup(name);
  if(l?.status==='Golden Ticket')return 'Golden Ticket';
  return 'No exemption';
}
function currentCampaign(name){
  const l=latestLeadup(name);
  if(!l)return 'Researching';
  if(l.status==='Golden Ticket')return `${l.result||'Qualified'} · ${l.race}`;
  if(l.result&&l.result!=='Pending')return `${l.result} · ${l.race}`;
  return `${l.status||l.type} · ${l.race}`;
}
function readinessScore(name){
  let n=0;
  if((publicFormRec(name)?.runs||[]).length)n++;
  if(staminaBand(name)!=='Researching')n++;
  if(weightRec(name))n++;
  if(tfStatusRec(name)==='Matched')n++;
  if(baseRecord(name))n++;
  if(qualificationState(name)==='Golden Ticket'||projectedRec(name))n++;
  return n;
}
function stayingEvidence(name){return /3200m winner|3200m placed|3000m\+ winner|2800m\+ winner/i.test(staminaBand(name));}
function researchGap(name){return readinessScore(name)<5||(publicFormRec(name)?.runs||[]).length<5||!baseRecord(name)||tfStatusRec(name)!=='Matched';}
function matrixFilterMatch(h){
  const name=h.horse;
  const q=matrixSearch.trim().toLowerCase();
  if(q&&!`${name} ${h.trainer} ${h.country}`.toLowerCase().includes(q))return false;
  if(matrixFilter==='projected'&&!projectedRec(name))return false;
  if(matrixFilter==='golden'&&qualificationState(name)!=='Golden Ticket')return false;
  if(matrixFilter==='international'&&h.trainingRegion!=='International')return false;
  if(matrixFilter==='stayers'&&!stayingEvidence(name))return false;
  if(matrixFilter==='gaps'&&!researchGap(name))return false;
  return true;
}
function matrixSortedRows(){
  const rows=(cupData?.horses||[]).filter(matrixFilterMatch);
  return rows.sort((a,b)=>{
    if(matrixSort==='weight')return (weightRec(b.horse)?.predictedKg??-999)-(weightRec(a.horse)?.predictedKg??-999)||a.nominationNumber-b.nominationNumber;
    if(matrixSort==='readiness')return readinessScore(b.horse)-readinessScore(a.horse)||a.nominationNumber-b.nominationNumber;
    if(matrixSort==='nomination')return a.nominationNumber-b.nominationNumber;
    const ar=projectedRec(a.horse)?.rank??999;const br=projectedRec(b.horse)?.rank??999;
    return ar-br||readinessScore(b.horse)-readinessScore(a.horse)||a.nominationNumber-b.nominationNumber;
  });
}
function matrixFilterButton(id,label,count=''){
  return `<button class="ghost-button matrix-filter ${matrixFilter===id?'active':''}" data-matrix-filter="${id}">${label}${count!==''?` <span>${count}</span>`:''}</button>`;
}
function intelligenceMatrixView(){
  const horses=cupData?.horses||[];
  const full=horses.filter(h=>readinessScore(h.horse)>=5).length;
  const tfMatched=horses.filter(h=>tfStatusRec(h.horse)==='Matched').length;
  const bases=horses.filter(h=>!!baseRecord(h.horse)).length;
  const weights=horses.filter(h=>!!weightRec(h.horse)).length;
  const projected=horses.filter(h=>!!projectedRec(h.horse)).length;
  const golden=horses.filter(h=>qualificationState(h.horse)==='Golden Ticket').length;
  const international=horses.filter(h=>h.trainingRegion==='International').length;
  const stayers=horses.filter(h=>stayingEvidence(h.horse)).length;
  const gaps=horses.filter(h=>researchGap(h.horse)).length;
  const visible=matrixSortedRows();
  return `<div class="section-header"><div><div class="kicker">101-Horse Decision Board</div><h2>Cup Intelligence Workbench</h2><div class="section-copy">One row per official nominee. Filter the entire Cup universe by projected field, qualification, international status, staying evidence or research gaps without mixing rating scales.</div></div></div>
  <section class="metric-grid">${metric('Official Nominees',horses.length,'1 Sep nomination universe')}${metric('Projected 24',projected,'Current cut-line board')}${metric('Weights',weights,'Predicted pre-release')}${metric('TF Identities',tfMatched,'Ratings pending separately')}${metric('5+ Inputs',full,'Research maturity')}</section>
  <div class="panel"><div class="panel-head"><div><h3>Contender Workbench</h3><div class="panel-sub">Readiness measures evidence coverage only. It is not a betting score or predicted finishing order.</div></div><span class="tag gold">${visible.length}/${horses.length} VISIBLE</span></div>
    <div class="matrix-toolbar" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;border-bottom:1px solid var(--line,#202a36)">
      <input id="matrix-search" value="${matrixSearch.replace(/"/g,'&quot;')}" placeholder="Search horse, trainer, country…" style="min-width:250px;flex:1;background:#0a111b;border:1px solid #263241;color:inherit;padding:9px 10px;border-radius:4px"/>
      <select id="matrix-sort" style="background:#0a111b;border:1px solid #263241;color:inherit;padding:9px 10px;border-radius:4px"><option value="projected" ${matrixSort==='projected'?'selected':''}>Sort: Projected rank</option><option value="weight" ${matrixSort==='weight'?'selected':''}>Sort: Predicted weight</option><option value="readiness" ${matrixSort==='readiness'?'selected':''}>Sort: Research readiness</option><option value="nomination" ${matrixSort==='nomination'?'selected':''}>Sort: Nomination #</option></select>
    </div>
    <div class="matrix-toolbar" style="display:flex;gap:8px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--line,#202a36)">${matrixFilterButton('all','All',horses.length)}${matrixFilterButton('projected','Projected',projected)}${matrixFilterButton('golden','Golden Ticket',golden)}${matrixFilterButton('international','International',international)}${matrixFilterButton('stayers','Staying Evidence',stayers)}${matrixFilterButton('gaps','Research Gaps',gaps)}</div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>Form</th><th>Stamina</th><th>Pred. Wt</th><th>Timeform</th><th>Current Base</th><th>Qualification</th><th>Projected</th><th>Latest Campaign</th><th>Ready</th></tr></thead><tbody>${visible.map(h=>{const name=h.horse;const f=(publicFormRec(name)?.runs||[]).length;const w=weightRec(name);const p=projectedRec(name);const tf=tfStatusRec(name);const score=readinessScore(name);return `<tr><td>${h.nominationNumber}</td><td class="horse">${horseLink(name)}</td><td>${f?`${f}/8`:'—'}</td><td>${staminaBand(name)}</td><td>${w?`${w.predictedKg.toFixed(1)}kg`:'—'}</td><td>${tf==='Matched'?tag('Identity','green'):tag('Unresolved','red')}</td><td>${baseCell(name)}</td><td>${qualificationState(name)==='Golden Ticket'?tag('Golden Ticket','green'):'<span class="muted">No exemption</span>'}</td><td>${p?`#${p.rank}`:'—'}</td><td class="wrap-cell">${currentCampaign(name)}</td><td>${score}/6</td></tr>`}).join('')||'<tr><td colspan="11" class="muted">No horses match the current filters.</td></tr>'}</tbody></table></div></div>`;
}
function bindMatrixControls(){
  const search=document.getElementById('matrix-search');
  if(search){search.oninput=e=>{matrixSearch=e.target.value;const pos=e.target.selectionStart;document.getElementById('app-content').innerHTML=intelligenceMatrixView();bindMatrixControls();const next=document.getElementById('matrix-search');if(next){next.focus();next.setSelectionRange(pos,pos);}};}
  const sort=document.getElementById('matrix-sort');if(sort)sort.onchange=e=>{matrixSort=e.target.value;document.getElementById('app-content').innerHTML=intelligenceMatrixView();bindMatrixControls();};
  document.querySelectorAll('[data-matrix-filter]').forEach(btn=>btn.onclick=()=>{matrixFilter=btn.dataset.matrixFilter;document.getElementById('app-content').innerHTML=intelligenceMatrixView();bindMatrixControls();});
}

const matrixRenderBase=render;
render=function(view='dashboard'){
 if(view==='analysis'){
   document.getElementById('page-title').textContent='Race Analysis';
   const root=document.getElementById('app-content');
   if(!cupData||!formIntelData||!timeformStatusData||!weightPredictions||!projectedFieldData||!qualificationData){
     root.innerHTML='<div class="placeholder">Loading full-field intelligence matrix…</div>';
     Promise.all([
       typeof loadFormIntel==='function'?loadFormIntel():Promise.resolve(),
       typeof loadExtras==='function'?loadExtras():Promise.resolve(),
       typeof loadProjectedField==='function'?loadProjectedField():Promise.resolve(),
       typeof loadLeadups==='function'?loadLeadups():Promise.resolve()
     ]).then(()=>render(view));return;
   }
   root.innerHTML=intelligenceMatrixView();setTimeout(bindMatrixControls,0);return;
 }
 matrixRenderBase(view);
};
matrixReady=true;
