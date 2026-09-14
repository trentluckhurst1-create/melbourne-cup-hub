let cupRatingsData=null;
let cupRatingsPromise=null;

function loadCupRatings(){
 if(cupRatingsPromise)return cupRatingsPromise;
 cupRatingsPromise=fetch('./data/ratings/2026-09-13-framework.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{cupRatingsData=d;return d;}).catch(()=>null);return cupRatingsPromise;
}
function weightRec(name){return (weightPredictions?.predictions||[]).find(x=>x.horse===name)||null;}
function projectedRec(name){return (projectedFieldData?.projected24||[]).find(x=>x.horse===name)||null;}
function tfRec(name){return formIntelData?.horses?.[name]||null;}
function staminaEvidence(name){
 const runs=typeof publicRatedRuns==='function'?publicRatedRuns(name):(tfRec(name)?.runs||[]);
 const staying=runs.filter(r=>Number(r.distanceM)>=2400);
 const d2800=staying.filter(r=>Number(r.distanceM)>=2800);
 const d3000=staying.filter(r=>Number(r.distanceM)>=3000);
 const d3200=staying.filter(r=>Number(r.distanceM)>=3200);
 let state='Pending';
 if(d3200.length)state='3200m proven';
 else if(d3000.length)state='3000m+ proven';
 else if(d2800.length)state='2800m+ evidence';
 else if(staying.length)state='2400m+ evidence';
 return {runs2400:staying.length,runs2800:d2800.length,runs3000:d3000.length,runs3200:d3200.length,state};
}
function staminaTag(name){
 const s=staminaEvidence(name);
 if(s.runs3200)return tag('3200m proven','green');
 if(s.runs3000)return tag('3000m+ proven','green');
 if(s.runs2800)return tag('2800m+ evidence','gold');
 if(s.runs2400)return tag('2400m+ evidence','gold');
 return '<span class="muted">Pending</span>';
}
function componentState(name){const t=tfRec(name),w=weightRec(name),p=projectedRec(name),st=staminaEvidence(name),pub=typeof publicFormRating==='function'?publicFormRating(name):null;return {tf:Number.isFinite(t?.currentMasterRating),tfIdentity:typeof privateTfMatched==='function'?privateTfMatched(name):false,public:!!pub,form:(t?.runs||[]).length>0,stamina:st.runs2400>0,weight:!!w,projection:!!p,base:!!baseRecord(name)};}
function publicRatingTag(name){const r=publicFormRating(name);if(!r)return '<span class="muted">Unrated</span>';const band=publicFormBand(r);const cls=r.current>=98?'green':r.current>=88?'gold':'';return `<span class="tag ${cls}" title="${band} · ${r.version}">${r.current.toFixed(1)}</span>`;}
function trajectoryTag(name){const r=publicFormRating(name);if(!r)return '<span class="muted">—</span>';if(r.trajectory===null)return '<span class="muted">Limited data</span>';const cls=r.trajectory>=4?'green':r.trajectory<=-4?'red':'gold';const sign=r.trajectory>0?'+':'';return `<span class="tag ${cls}">${r.trajectoryLabel} ${sign}${r.trajectory.toFixed(1)}</span>`;}
function publicRankingRows(){
 return (cupData?.horses||[]).map(h=>{
   const r=typeof publicFormRating==='function'?publicFormRating(h.horse):null;
   const lens=typeof cupPublicLens==='function'?cupPublicLens(h.horse):null;
   return {h,r,lens,p:projectedRec(h.horse),w:weightRec(h.horse),st:staminaEvidence(h.horse)};
 }).sort((a,b)=>(b.lens?.score??-999)-(a.lens?.score??-999)||(b.r?.current??-999)-(a.r?.current??-999)||a.h.horse.localeCompare(b.h.horse));
}
function ratingsView(){
 const horses=cupData?.horses||[];
 const rows=publicRankingRows();
 const publicRated=rows.filter(x=>x.r).length;
 const staminaLoaded=horses.filter(h=>componentState(h.horse).stamina).length;
 const projectedStamina=(projectedFieldData?.projected24||[]).filter(x=>componentState(x.horse).stamina).length;
 const tfMatched=horses.filter(h=>componentState(h.horse).tfIdentity).length;
 const leader=rows.find(x=>x.lens)||null;
 return `<div class="section-header"><div><div class="kicker">Public Form + Private Timeform Architecture</div><h2>Ratings & Rankings</h2><div class="section-copy">The Hub now scores factual public race performances on its own transparent PFR scale so the whole field can be compared immediately. Timeform remains a separate private class layer and is never fabricated or back-filled by this score.</div></div></div>
 <section class="metric-grid">${metric('Universe',horses.length,'Official nominees')}${metric('Public Rated',publicRated,'PFR-1.0 from loaded factual form')}${metric('Public Leader',leader?leader.h.horse:'—',leader?`Cup Lens ${leader.lens.score.toFixed(1)}`:'No public form')}${metric('Staying Evidence',staminaLoaded,`${projectedStamina} projected-24 horses`)}${metric('TF Identity',tfMatched,'Numeric Timeform values remain separate/private')}</section>
 <section class="profile-grid"><div class="panel"><h3>Public Form Rating · PFR-1.0</h3><div class="rule-list"><div class="rule-row"><span>A</span><p><strong>Race class:</strong> Group 1, Group 2, Group 3, Listed and handicap grade establish the public baseline.</p></div><div class="rule-row"><span>B</span><p><strong>Performance:</strong> finishing position, field size and available margin modify that baseline.</p></div><div class="rule-row"><span>C</span><p><strong>Current:</strong> the latest three public run ratings are weighted 50% / 30% / 20%.</p></div><div class="rule-row"><span>D</span><p><strong>Peak:</strong> best loaded public performance in the recent window.</p></div><div class="rule-row"><span>E</span><p><strong>Trajectory:</strong> current form is compared with older loaded runs to flag improving, stable or regressing profiles.</p></div><div class="rule-row"><span>F</span><p><strong>Cup Lens:</strong> public current rating plus staying evidence, form depth, trajectory and current projected/official handicap. It is a Hub decision aid, not a Timeform number.</p></div></div></div><div class="panel"><h3>Timeform Separation</h3><p class="analysis-copy">Timeform remains the preferred private class scale once genuine subscriber values are restored. Until then, the PFR layer lets us inspect current public form and relative race strength without pretending that a Hub-generated number is Timeform.</p><div class="audit-banner"><strong>RULE</strong><span>PFR ≠ Timeform · public evidence only · no subscriber value inference</span></div></div></section>
 <div class="panel"><div class="panel-head"><div><h3>Public Cup Rating Board</h3><div class="panel-sub">Ranked by Hub Cup Lens. Click any horse for run-by-run public ratings inside the dossier.</div></div><span class="tag gold">PFR-1.0</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Rank</th><th>Horse</th><th>PFR Current</th><th>Peak</th><th>2400m+</th><th>2800m+</th><th>Trajectory</th><th>Wt</th><th>Proj.</th><th>Cup Lens</th><th>TF</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${x.r?i+1:'—'}</td><td class="horse">${horseLink(x.h.horse)}</td><td>${publicRatingTag(x.h.horse)}</td><td>${x.r?x.r.peak.toFixed(1):'—'}</td><td>${x.r?.stayingPeak!==null&&x.r?.stayingPeak!==undefined?x.r.stayingPeak.toFixed(1):'—'}</td><td>${x.r?.longStayPeak!==null&&x.r?.longStayPeak!==undefined?x.r.longStayPeak.toFixed(1):'—'}</td><td>${trajectoryTag(x.h.horse)}</td><td>${x.w?`${x.w.predictedKg.toFixed(1)}kg`:'—'}</td><td>${x.p?`#${x.p.rank}`:'—'}</td><td><strong>${x.lens?x.lens.score.toFixed(1):'—'}</strong></td><td>${componentState(x.h.horse).tf?tag('Numeric','green'):componentState(x.h.horse).tfIdentity?'<span class="muted">Identity matched</span>':'<span class="muted">Pending</span>'}</td></tr>`).join('')}</tbody></table></div></div>
 <div class="panel spaced-panel"><div class="panel-head"><div><h3>Ranking Readiness Board</h3><div class="panel-sub">Public rating availability and private Timeform readiness are kept separate.</div></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>Public Rating</th><th>Form</th><th>Stamina</th><th>Weight</th><th>Current Base</th><th>Projected 24</th><th>Timeform</th></tr></thead><tbody>${horses.map(h=>{const s=componentState(h.horse),p=projectedRec(h.horse),r=publicFormRating(h.horse);return `<tr><td>${h.nominationNumber}</td><td class="horse">${horseLink(h.horse)}</td><td>${r?`${r.current.toFixed(1)} · ${publicFormBand(r)}`:'—'}</td><td>${s.form?tag('Loaded','green'):'<span class="muted">Pending</span>'}</td><td>${staminaTag(h.horse)}</td><td>${s.weight?`${weightRec(h.horse).predictedKg.toFixed(1)}kg`:'—'}</td><td>${baseCell(h.horse)}</td><td>${p?`#${p.rank}`:'—'}</td><td>${s.tf?tag('Numeric ready','green'):s.tfIdentity?'<span class="muted">Identity ready · rating pending</span>':'<span class="muted">Identity pending</span>'}</td></tr>`}).join('')}</tbody></table></div></div>`;
}
const ratingsRenderBase=render;
render=function(view='dashboard'){if(view==='ratings'){document.getElementById('page-title').textContent='Ratings & Rankings';const root=document.getElementById('app-content');if(!cupRatingsData||!formIntelData){root.innerHTML='<div class="placeholder">Loading rating architecture…</div>';Promise.all([loadCupRatings(),loadFormIntel(),loadExtras(),typeof loadProjectedField==='function'?loadProjectedField():Promise.resolve()]).then(()=>render(view));return;}root.innerHTML=ratingsView();return;}ratingsRenderBase(view);};
loadCupRatings();
