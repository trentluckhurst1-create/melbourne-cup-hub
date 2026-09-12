let matrixReady=false;

function latestLeadup(name){return (leadupData?.events||[]).filter(x=>x.horse===name).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;}
function publicFormRec(name){return publicFormData?.horses?.[name]||null;}
function tfStatusRec(name){
  const unresolved=new Set(timeformPublicStatus?.unresolved||[]);
  return unresolved.has(name)?'Unresolved':'Matched';
}
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
function intelligenceMatrixView(){
  const horses=cupData?.horses||[];
  const full=horses.filter(h=>readinessScore(h.horse)>=5).length;
  const tfMatched=horses.filter(h=>tfStatusRec(h.horse)==='Matched').length;
  const bases=horses.filter(h=>!!baseRecord(h.horse)).length;
  const weights=horses.filter(h=>!!weightRec(h.horse)).length;
  return `<div class="section-header"><div><div class="kicker">101-Horse Decision Board</div><h2>Cup Intelligence Matrix</h2><div class="section-copy">One row per official nominee. This joins public form, staying evidence, predicted handicap, Timeform profile coverage, current horse base, qualification, projected field status and latest campaign activity without mixing rating scales.</div></div></div>
  <section class="metric-grid">${metric('Official Nominees',horses.length,'1 Sep nomination universe')}${metric('Weights',weights,'Predicted pre-release')}${metric('TF Profiles',tfMatched,'Public-safe match state')}${metric('Current Bases',bases,'Horse-specific verified')}${metric('5+ Inputs',full,'Research maturity')}</section>
  <div class="panel"><div class="panel-head"><div><h3>Full Nomination Matrix</h3><div class="panel-sub">Readiness is evidence coverage, not a betting score.</div></div><span class="tag gold">LIVE RESEARCH BOARD</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>Form</th><th>Stamina</th><th>Pred. Wt</th><th>Timeform</th><th>Current Base</th><th>Qualification</th><th>Projected</th><th>Latest Campaign</th><th>Ready</th></tr></thead><tbody>${horses.map(h=>{const name=h.horse;const f=(publicFormRec(name)?.runs||[]).length;const w=weightRec(name);const p=projectedRec(name);const tf=tfStatusRec(name);const score=readinessScore(name);return `<tr><td>${h.nominationNumber}</td><td class="horse">${horseLink(name)}</td><td>${f?`${f}/8`:'—'}</td><td>${staminaBand(name)}</td><td>${w?`${w.predictedKg.toFixed(1)}kg`:'—'}</td><td>${tf==='Matched'?tag('Matched','green'):tag('Unresolved','red')}</td><td>${baseCell(name)}</td><td>${qualificationState(name)==='Golden Ticket'?tag('Golden Ticket','green'):'<span class="muted">No exemption</span>'}</td><td>${p?`#${p.rank}`:'—'}</td><td class="wrap-cell">${currentCampaign(name)}</td><td>${score}/6</td></tr>`}).join('')}</tbody></table></div></div>`;
}

const matrixRenderBase=render;
render=function(view='dashboard'){
 if(view==='analysis'){
   document.getElementById('page-title').textContent='Race Analysis';
   const root=document.getElementById('app-content');
   if(!cupData||!publicFormData||!timeformPublicStatus||!weightPredictions||!projectedFieldData||!qualificationData){root.innerHTML='<div class="placeholder">Loading full-field intelligence matrix…</div>';Promise.all([loadCupData?.(),loadPublicForm?.(),loadTimeformPublicStatus?.(),loadExtras(),loadProjectedField(),loadLeadups?.()]).then(()=>render(view));return;}
   root.innerHTML=intelligenceMatrixView();return;
 }
 matrixRenderBase(view);
};
matrixReady=true;
