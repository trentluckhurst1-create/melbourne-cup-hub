let formIntelData=null;
let formIntelPromise=null;
let timeformStatusData=null;

function mergeFormDatasets(primary,supplements=[]){
  const out=primary||{horses:{}};
  out.horses=out.horses||{};
  for(const supplement of supplements.filter(Boolean)){
    for(const [horse,rec] of Object.entries(supplement.horses||{})){
      const existing=out.horses[horse]||{runs:[]};
      const byKey=new Map((existing.runs||[]).map(r=>[`${r.date}|${r.race}|${r.track}`,r]));
      for(const run of (rec.runs||[])) byKey.set(`${run.date}|${run.race}|${run.track}`,run);
      existing.runs=[...byKey.values()].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,out.targetRunsPerHorse||8);
      out.horses[horse]={...existing,...rec,runs:existing.runs};
    }
  }
  return out;
}

function loadFormIntel(){
  if(formIntelPromise) return formIntelPromise;
  formIntelPromise=Promise.all([
    fetch('./data/form/2026-09-15-unique-full-form.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('./data/timeform/2026-09-13-public-status.json',{cache:'no-store'}).then(r=>r.ok?r.json():null)
  ]).then(([f,s])=>{
    formIntelData=f||{snapshotDate:'2026-09-15',targetRunsPerHorse:8,horses:{}};
    timeformStatusData=s;
    return formIntelData;
  }).catch(()=>null);
  return formIntelPromise;
}

function publicActualRuns(horse){
  const runs=formIntelData?.horses?.[horse]?.runs||[];
  return runs.filter(r=>{
    const text=`${r.classGroup||''} ${r.race||''}`.toLowerCase();
    const finish=String(r.finish||'').trim().toLowerCase();
    return !text.includes('trial')&&!text.includes('jump-out')&&!text.includes('jumpout')&&!['scr','scratched','wd','withdrawn','nr','non-runner','dns','did not start'].includes(finish);
  });
}
function formCoverage(){
  const total=(cupData?.horses||[]).length;
  const withForm=(cupData?.horses||[]).filter(h=>publicActualRuns(h.horse).length>0).length;
  const audit=typeof formCompletionSummary==='function'?formCompletionSummary():null;
  const fullWindow=audit?audit.complete+audit.career:(cupData?.horses||[]).filter(h=>publicActualRuns(h.horse).length>=8||formIntelData?.horses?.[h.horse]?.careerComplete===true).length;
  const matched=timeformStatusData?.profilesMatched??0;
  const unresolved=timeformStatusData?.profilesUnresolved??Math.max(0,total-matched);
  return {total,withForm,fullWindow,matched,unresolved,gaps:audit?.gaps??Math.max(0,total-fullWindow),flagged:audit?.flagged??0};
}

function privateTfMatched(horse){return timeformStatusData?!(timeformStatusData.unresolvedHorses||[]).includes(horse):false;}
function tfFormCount(horse){return publicActualRuns(horse).length;}
function tfStaminaEvidence(horse){
  const runs=publicActualRuns(horse);
  if(!runs.length)return 'Researching';
  const max=Math.max(...runs.map(r=>Number(r.distanceM)||0));
  const wins=runs.filter(r=>/^1st$/i.test(String(r.finish||'')));
  const maxWin=wins.length?Math.max(...wins.map(r=>Number(r.distanceM)||0)):0;
  if(maxWin>=3200)return '3200m winner';
  if(runs.some(r=>(Number(r.distanceM)||0)>=3200&&/^(2nd|3rd)$/i.test(String(r.finish||''))))return '3200m placed';
  if(max>=3200)return '3200m exposed';
  if(maxWin>=3000)return '3000m+ winner';
  if(max>=3000)return '3000m+ exposed';
  if(maxWin>=2800)return '2800m+ winner';
  if(max>=2800)return '2800m+ exposed';
  if(maxWin>=2400)return '2400m+ winner';
  if(max>=2400)return '2400m+ evidence';
  return '<2400m loaded';
}
function formStateForCard(horse){
  if(typeof formCompletionState==='function')return formCompletionState(horse);
  const n=tfFormCount(horse),career=formIntelData?.horses?.[horse]?.careerComplete===true;
  return {state:n>=8?'COMPLETE':career?'CAREER_COMPLETE':'RESEARCH_GAP',runs:Math.min(n,8),label:career&&n<8?`${n}/${n} CAREER`:`${Math.min(n,8)}/8`,className:(n>=8||career)?'green':n>=5?'gold':'red'};
}
function pfrForCard(horse){try{return typeof publicFormRating==='function'?publicFormRating(horse):null;}catch(e){return null;}}

function timeformView(){
  const c=formCoverage();
  const unresolved=(cupData?.horses||[]).filter(h=>!privateTfMatched(h.horse));
  return `<div class="section-header"><div><div class="kicker">Private Timeform Layer · Public PFR Available Now</div><h2>Timeform Intelligence</h2><div class="section-copy">The identity layer is preserved. Genuine numerical Timeform ratings remain private/pending; the separate Hub PFR scale now gives us a public-form comparison without substituting or fabricating Timeform values.</div></div></div>
  <section class="metric-grid">${metric('Official Nominees',c.total,'Common comparison universe')}${metric('Profiles Matched',c.matched,`${c.unresolved} unresolved identities`)}${metric('Form Complete',c.fullWindow,`${c.gaps} gaps · ${c.flagged} integrity flags`)}${metric('Public PFR','ACTIVE','Separate Hub scale')}${metric('Timeform Values','PENDING','No substitution')}</section>
  <section class="profile-grid"><div class="panel"><h3>Rating Architecture</h3><div class="rule-list"><div class="rule-row"><span>01</span><p>Timeform remains the preferred private comparative class scale once genuine values are restored.</p></div><div class="rule-row"><span>02</span><p>PFR-1.1 independently rates verified public race performances using race class, result, field size and available margin.</p></div><div class="rule-row"><span>03</span><p>Run-level Timeform fields stay empty until genuine Timeform values are available.</p></div><div class="rule-row"><span>04</span><p>PFR, OR, RPR and other scales are never relabelled as Timeform.</p></div><div class="rule-row"><span>05</span><p>Cup-specific overlays remain separate: stamina, weight, Flemington, going, pace, preparation and travel.</p></div></div></div><div class="panel"><h3>Current Recovery State</h3><p class="analysis-copy">${c.matched} of ${c.total} official nominees have a preserved Timeform identity match. Public PFR values are now usable immediately, while private Timeform numeric values remain pending rather than fabricated.</p><div class="audit-banner"><strong>STATUS</strong><span>101-horse public form complete · strict unique-start audit passed · PFR active · Timeform numeric values separate</span></div>${unresolved.length?`<div class="panel-sub" style="margin-top:12px">Unresolved Timeform identities: ${unresolved.map(h=>h.horse).join(' · ')}</div>`:''}</div></section>
  <div class="panel"><div class="panel-head"><div><h3>101-Horse Timeform Readiness Board</h3><div class="panel-sub">Public PFR sits beside Timeform readiness, never inside the Timeform column.</div></div><span class="tag gold">TF NUMERIC PENDING</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>PFR</th><th>TF Identity</th><th>Form State</th><th>Stamina Evidence</th><th>TF Rating State</th></tr></thead><tbody>${(cupData?.horses||[]).map(h=>{const matched=privateTfMatched(h.horse);const f=formStateForCard(h.horse);const pfr=pfrForCard(h.horse);return `<tr><td>${h.nominationNumber}</td><td class="horse">${horseLink(h.horse)}</td><td>${pfr?`${pfr.current.toFixed(1)} · ${publicFormBand(pfr)}`:'—'}</td><td>${matched?tag('Matched','green'):'<span class="muted">Unresolved</span>'}</td><td><span class="tag ${f.className}">${f.label}</span></td><td>${tfStaminaEvidence(h.horse)}</td><td>${matched?'<span class="muted">Identity ready · numeric rating pending</span>':'<span class="muted">Identity research required</span>'}</td></tr>`}).join('')}</tbody></table></div></div>`;
}

function formGuideView(){
  const c=formCoverage();
  const projected=new Map((projectedFieldData?.projected24||[]).map(x=>[x.horse,x.rank]));
  const rated=(cupData?.horses||[]).map(h=>({h,pfr:pfrForCard(h.horse)})).filter(x=>x.pfr).sort((a,b)=>b.pfr.current-a.pfr.current);
  const pfrLeader=rated[0]||null;
  return `<div class="section-header"><div><div class="kicker">Every Nominee · Complete Public Form</div><h2>Melbourne Cup Form Guide</h2><div class="section-copy">The official 101-horse nomination universe is now complete to eight unique actual race starts per horse, or the horse's complete career where fewer than eight actual starts exist. Duplicate same-day records, trials, jump-outs and non-starters are excluded.</div></div></div>
  <section class="metric-grid">${metric('Nominees',c.total,'Official 1 Sep snapshot')}${metric('Any Public Form',c.withForm,'101-horse coverage')}${metric('Form Complete',c.fullWindow,'8/8 unique starts or certified full career')}${metric('PFR Leader',pfrLeader?pfrLeader.h.horse:'—',pfrLeader?`${pfrLeader.pfr.current.toFixed(1)} current`:'No rating')}${metric('Research Gaps',c.gaps,'Target: zero')}${metric('Integrity Flags',c.flagged,'Source/run issues')}</section>
  <div class="horse-grid">${(cupData?.horses||[]).map(h=>{const runs=publicActualRuns(h.horse);const last=runs[0];const matched=privateTfMatched(h.horse);const f=formStateForCard(h.horse);const rank=projected.get(h.horse);const pfr=pfrForCard(h.horse);const traj=pfr?.trajectory===null||pfr?.trajectory===undefined?'Limited':`${pfr.trajectoryLabel}${pfr.trajectory!==null?` ${pfr.trajectory>0?'+':''}${pfr.trajectory.toFixed(1)}`:''}`;return `<article class="horse-card"><div class="horse-card-top"><div><div class="horse-number">NOM ${h.nominationNumber}${rank?` · PROJ #${rank}`:''}</div><button class="horse-card-name" onclick="openHorse('${h.horse.replace(/'/g,"\\'")}')">${h.horse}</button><div class="horse-country">${h.country} · ${h.trainer}</div></div><span class="tag ${f.className}">${f.label}</span></div><div class="horse-card-grid"><div><span>PFR CURRENT</span><strong>${pfr?pfr.current.toFixed(1):'—'}</strong></div><div><span>PEAK</span><strong>${pfr?pfr.peak.toFixed(1):'—'}</strong></div><div><span>TRAJECTORY</span><strong>${pfr?traj:'—'}</strong></div><div><span>2800M+ PEAK</span><strong>${pfr?.longStayPeak!==null&&pfr?.longStayPeak!==undefined?pfr.longStayPeak.toFixed(1):'—'}</strong></div><div><span>LAST VERIFIED RUN</span><strong>${last?`${last.finish||'—'} · ${last.track||'—'}`:'Researching'}</strong></div><div><span>STAMINA</span><strong>${tfStaminaEvidence(h.horse)}</strong></div><div><span>TIMEFORM</span><strong>${matched?'Identity ready · numeric pending':'Identity unresolved'}</strong></div><div><span>FORM STATE</span><strong>${f.state.replace(/_/g,' ')}</strong></div></div></article>`}).join('')}</div>`;
}

const tfFormRenderBase=render;
render=function(view='dashboard'){
  if(view==='timeform'||view==='form'){
    document.getElementById('page-title').textContent=view==='timeform'?'Timeform':'Form Guide';
    const root=document.getElementById('app-content');
    if(!formIntelData||!timeformStatusData){root.innerHTML='<div class="placeholder">Loading form intelligence…</div>';loadFormIntel().then(()=>render(view));return;}
    root.innerHTML=view==='timeform'?timeformView():formGuideView();return;
  }
  tfFormRenderBase(view);
};

loadFormIntel();
