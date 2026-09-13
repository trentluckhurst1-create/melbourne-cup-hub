function privateTfCoverageAudit(){
  if(!privateTimeformSession||!cupData||!formIntelData)return null;
  const rows=(cupData.horses||[]).map(h=>{
    const runs=typeof actualRaceRuns==='function'?actualRaceRuns(h.horse):(formIntelData?.horses?.[h.horse]?.runs||[]);
    const rec=tfHorseRec(h.horse);
    const master=tfMasterValue(rec);
    const rated=runs.filter(r=>tfRatingValue(tfRunMatch(h.horse,r))!==null).length;
    return {h,runs:runs.length,rated,master,profile:!!rec,missing:Math.max(0,runs.length-rated)};
  });
  return {
    rows,
    profiles:rows.filter(x=>x.profile).length,
    masters:rows.filter(x=>x.master!==null).length,
    fullRated:rows.filter(x=>x.runs>0&&x.rated===x.runs).length,
    partial:rows.filter(x=>x.rated>0&&x.rated<x.runs).length,
    zeroRated:rows.filter(x=>x.runs>0&&x.rated===0).length,
    publicRuns:rows.reduce((a,x)=>a+x.runs,0),
    joinedRuns:rows.reduce((a,x)=>a+x.rated,0)
  };
}
function privateTfCoveragePanel(){
  const a=privateTfCoverageAudit(); if(!a)return '';
  const gaps=a.rows.filter(x=>x.missing>0).sort((x,y)=>y.missing-x.missing||x.h.nominationNumber-y.h.nominationNumber);
  return `<section class="section-block"><div class="section-header"><div><div class="kicker">Private Rating Join Control</div><h2>Timeform Run-Rating Completion Audit</h2><div class="section-copy">Compares the factual race starts currently loaded in the Hub against genuine run-level Timeform ratings loaded in this browser session. A rating is counted only when it joins to that horse's actual race record.</div></div></div><section class="metric-grid">${metric('Private Profiles',a.profiles,'Official nominees matched in loaded file')}${metric('Master TFR',a.masters,'Horses with master rating')}${metric('Rated Runs',`${a.joinedRuns}/${a.publicRuns}`,'Joined to factual form')}${metric('Fully Rated',a.fullRated,'Every loaded run has TFR')}${metric('Rating Gaps',gaps.length,'Horses still missing run ratings')}</section><div class="panel"><div class="panel-head"><div><h3>Run-Rating Gap Queue</h3><div class="panel-sub">Sorted by missing TFRs. This is the finish line for the private ratings layer.</div></div><span class="tag ${gaps.length?'gold':'green'}">${gaps.length?`${gaps.length} OPEN`:'COMPLETE'}</span></div>${gaps.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>Form Runs</th><th>Rated</th><th>Missing TFR</th><th>Master</th><th>Private Profile</th></tr></thead><tbody>${gaps.map(x=>`<tr><td>${x.h.nominationNumber}</td><td class="horse">${horseLink(x.h.horse)}</td><td>${x.runs}</td><td class="tf-private-value">${x.rated}</td><td><strong>${x.missing}</strong></td><td class="tf-private-value">${x.master??'—'}</td><td>${x.profile?tag('Loaded','green'):'<span class="muted">Missing</span>'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="audit-banner"><strong>RATING COVERAGE COMPLETE</strong><span>Every loaded factual run has a genuine Timeform run rating joined in the private session.</span></div>'}</div></section>`;
}
const privateTfAuditRenderBase=render;
render=function(view='dashboard'){
  privateTfAuditRenderBase(view);
  if((view==='timeform'||view==='form')&&privateTimeformSession&&formIntelData&&cupData){
    const root=document.getElementById('app-content');
    if(root&&!root.querySelector('.tf-run-rating-audit')){
      const wrap=document.createElement('div'); wrap.className='tf-run-rating-audit'; wrap.innerHTML=privateTfCoveragePanel(); root.prepend(wrap);
    }
  }
};
