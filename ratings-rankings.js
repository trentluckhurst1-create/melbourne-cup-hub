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
 const runs=tfRec(name)?.runs||[];
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
function componentState(name){const t=tfRec(name),w=weightRec(name),p=projectedRec(name),st=staminaEvidence(name);return {tf:Number.isFinite(t?.currentMasterRating),form:(t?.runs||[]).length>0,stamina:st.runs2400>0,weight:!!w,projection:!!p,base:!!baseRecord(name)};}
function ratingsView(){
 const horses=cupData?.horses||[];
 const ready=horses.filter(h=>{const s=componentState(h.horse);return s.tf&&s.form&&s.stamina&&s.weight;}).length;
 const staminaLoaded=horses.filter(h=>componentState(h.horse).stamina).length;
 const projectedStamina=(projectedFieldData?.projected24||[]).filter(x=>componentState(x.horse).stamina).length;
 return `<div class="section-header"><div><div class="kicker">Cup-Specific Decision Layer</div><h2>Ratings & Rankings</h2><div class="section-copy">Timeform supplies class. The Hub then evaluates whether that ability can be converted into Melbourne Cup performance under the horse's likely handicap, preparation and 3200m conditions.</div></div></div>
 <section class="metric-grid">${metric('Universe',horses.length,'Official nominees')}${metric('TF Source','TIMEFORM','Canonical class scale')}${metric('Staying Evidence',staminaLoaded,`${projectedStamina} projected-24 horses loaded`)}${metric('Model Ready',ready,'TF + form + stamina + weight')}${metric('Ranking State','BUILDING','No fake scores')}</section>
 <section class="profile-grid"><div class="panel"><h3>Melbourne Cup Rating Architecture</h3><div class="rule-list"><div class="rule-row"><span>A</span><p><strong>Class:</strong> current and peak Timeform ability.</p></div><div class="rule-row"><span>B</span><p><strong>Form:</strong> recent Timeform performance ratings and trajectory.</p></div><div class="rule-row"><span>C</span><p><strong>Stamina:</strong> explicit public race evidence at 2400m, 2800m, 3000m and 3200m before pedigree inference.</p></div><div class="rule-row"><span>D</span><p><strong>Handicap:</strong> ability relative to Melbourne Cup weight, including age/sex scale.</p></div><div class="rule-row"><span>E</span><p><strong>Conditions:</strong> Flemington, going, likely tempo/map and field size.</p></div><div class="rule-row"><span>F</span><p><strong>Campaign:</strong> lead-up quality, timing, travel, quarantine and preparation.</p></div></div></div><div class="panel"><h3>Hard Rule</h3><p class="analysis-copy">The Hub will not issue a numeric Cup rating until the minimum required inputs exist. A missing Timeform rating is not replaced by an OR, RPR or local rating. Staying suitability must also be evidence-led rather than inferred from reputation alone.</p><div class="audit-banner"><strong>PRIMARY INPUT</strong><span>Timeform ability · public staying evidence · Cup-specific overlays</span></div></div></section>
 <div class="panel"><div class="panel-head"><div><h3>Ranking Readiness Board</h3><div class="panel-sub">Shows exactly which inputs exist before a Cup score is allowed.</div></div><span class="tag gold">101 RUNNERS</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>TF</th><th>Form</th><th>Stamina</th><th>Weight</th><th>Current Base</th><th>Projected 24</th><th>Cup Rating</th></tr></thead><tbody>${horses.map(h=>{const s=componentState(h.horse),p=projectedRec(h.horse);return `<tr><td>${h.nominationNumber}</td><td class="horse">${horseLink(h.horse)}</td><td>${s.tf?tag('Ready','green'):'<span class="muted">Private / pending</span>'}</td><td>${s.form?tag('Ready','green'):'<span class="muted">Pending</span>'}</td><td>${staminaTag(h.horse)}</td><td>${s.weight?`${weightRec(h.horse).predictedKg.toFixed(1)}kg`:'—'}</td><td>${baseCell(h.horse)}</td><td>${p?`#${p.rank}`:'—'}</td><td>${s.tf&&s.form&&s.stamina&&s.weight?tag('Eligible','green'):'<span class="muted">Not scored</span>'}</td></tr>`}).join('')}</tbody></table></div></div>`;
}
const ratingsRenderBase=render;
render=function(view='dashboard'){if(view==='ratings'){document.getElementById('page-title').textContent='Ratings & Rankings';const root=document.getElementById('app-content');if(!cupRatingsData||!formIntelData){root.innerHTML='<div class="placeholder">Loading rating architecture…</div>';Promise.all([loadCupRatings(),loadFormIntel(),loadExtras(),typeof loadProjectedField==='function'?loadProjectedField():Promise.resolve()]).then(()=>render(view));return;}root.innerHTML=ratingsView();return;}ratingsRenderBase(view);};
loadCupRatings();
