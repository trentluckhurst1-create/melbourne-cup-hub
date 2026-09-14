function actualRaceRuns(horse){
  return (formIntelData?.horses?.[horse]?.runs||[]).filter(r=>!String(r.classGroup||'').toLowerCase().includes('trial')&&!String(r.race||'').toLowerCase().includes('trial')&&!String(r.race||'').toLowerCase().includes('jump-out'));
}
function formRunKey(r){return `${r.date||''}|${r.track||''}|${r.race||''}`;}
function formLatestDate(horse){return actualRaceRuns(horse).map(r=>r.date).filter(Boolean).sort().at(-1)||null;}
function formDaysOld(date){if(!date)return null;const ms=Date.now()-new Date(`${date}T12:00:00`).getTime();return Math.max(0,Math.floor(ms/86400000));}
function formSourceState(horse){
  const runs=actualRaceRuns(horse);
  if(!runs.length)return {known:0,total:0,label:'NO FORM',className:'red'};
  const known=runs.filter(r=>String(r.source||'').trim()).length;
  return {known,total:runs.length,label:known===runs.length?'SOURCED':`${known}/${runs.length} SOURCED`,className:known===runs.length?'green':'gold'};
}
function formIntegrityIssues(horse){
  const runs=actualRaceRuns(horse);const issues=[];
  const keys=runs.map(formRunKey);if(new Set(keys).size!==keys.length)issues.push('duplicate run');
  if(runs.some(r=>!r.date))issues.push('missing date');
  if(runs.some(r=>!r.track))issues.push('missing track');
  if(runs.some(r=>!r.race))issues.push('missing race');
  if(runs.some(r=>!r.source))issues.push('missing source');
  return issues;
}
function formCompletionState(horse){
  const rec=formIntelData?.horses?.[horse]||{};
  const runs=actualRaceRuns(horse);
  const issues=formIntegrityIssues(horse);
  const latest=formLatestDate(horse);
  const ageDays=formDaysOld(latest);
  if(issues.length)return {state:'INTEGRITY_FLAG',runs:Math.min(runs.length,8),label:`${Math.min(runs.length,8)}/8 flagged`,className:'red',issues,latest,ageDays};
  if(runs.length>=8)return {state:'COMPLETE',runs:8,label:'8/8',className:'green',issues:[],latest,ageDays};
  if(rec.careerComplete===true&&runs.length>0)return {state:'CAREER_COMPLETE',runs:runs.length,label:`${runs.length}/${runs.length} career`,className:'green',issues:[],latest,ageDays};
  return {state:'RESEARCH_GAP',runs:runs.length,label:`${runs.length}/8`,className:runs.length>=5?'gold':'red',issues:[],latest,ageDays};
}
function formCompletionSummary(){
  const horses=cupData?.horses||[];
  const projected=new Map((projectedFieldData?.projected24||[]).map(x=>[x.horse,x.rank]));
  const rows=horses.map(h=>({h,projectedRank:projected.get(h.horse)||null,source:formSourceState(h.horse),...formCompletionState(h.horse)}));
  return {
    rows,
    complete:rows.filter(x=>x.state==='COMPLETE').length,
    career:rows.filter(x=>x.state==='CAREER_COMPLETE').length,
    gaps:rows.filter(x=>x.state==='RESEARCH_GAP').length,
    flagged:rows.filter(x=>x.state==='INTEGRITY_FLAG').length,
    noForm:rows.filter(x=>x.runs===0).length,
    fivePlus:rows.filter(x=>x.runs>=5).length,
    sourced:rows.filter(x=>x.source.total>0&&x.source.known===x.source.total).length,
    current30:rows.filter(x=>x.ageDays!==null&&x.ageDays<=30).length
  };
}
function formCoveragePriority(x){
  if(x.state==='INTEGRITY_FLAG')return -1000+(x.projectedRank||99);
  if(x.projectedRank)return -500+x.projectedRank;
  if(x.runs===0)return -200;
  return x.runs;
}
function formCoverageAuditPanel(){
  const a=formCompletionSummary();
  const gaps=a.rows.filter(x=>x.state==='RESEARCH_GAP'||x.state==='INTEGRITY_FLAG').sort((x,y)=>formCoveragePriority(x)-formCoveragePriority(y)||x.runs-y.runs||x.h.nominationNumber-y.h.nominationNumber);
  return `<section class="section-block"><div class="section-header"><div><div class="kicker">Coverage Control · Actual Race Starts Only</div><h2>101-Horse Form Completion Audit</h2><div class="section-copy">Target = latest eight actual race starts. Trials and jump-outs never count. A horse with fewer than eight career starts is complete only when the dataset explicitly certifies its full career; missing or unsourced rows are flagged rather than silently accepted.</div></div></div>
  <section class="metric-grid">${metric('8/8 Complete',a.complete,'Full recent race window')}${metric('Career Complete',a.career,'Explicitly certified full career')}${metric('Research Gaps',a.gaps,'Below required coverage')}${metric('Integrity Flags',a.flagged,'Run/source problems')}${metric('Fully Sourced',a.sourced,'Every loaded run has provenance')}${metric('≤30d Latest Run',a.current30,'Recent evidence present')}</section>
  <div class="panel"><div class="panel-head"><div><h3>Priority Coverage Queue</h3><div class="panel-sub">Projected-field runners and integrity failures are automatically promoted above ordinary gaps.</div></div><span class="tag gold">${gaps.length} OPEN</span></div>
  ${gaps.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Priority</th><th>#</th><th>Horse</th><th>Trainer</th><th>Runs</th><th>Missing</th><th>Latest</th><th>Sources</th><th>TF Identity</th><th>Issue</th></tr></thead><tbody>${gaps.map(x=>`<tr><td>${x.projectedRank?`PROJ #${x.projectedRank}`:(x.state==='INTEGRITY_FLAG'?'FLAG':'OPEN')}</td><td>${x.h.nominationNumber}</td><td class="horse">${horseLink(x.h.horse)}</td><td>${x.h.trainer}</td><td><strong>${x.runs}/8</strong></td><td>${Math.max(0,8-x.runs)}</td><td>${x.latest||'—'}${x.ageDays!==null?`<div class="muted">${x.ageDays}d ago</div>`:''}</td><td><span class="tag ${x.source.className}">${x.source.label}</span></td><td>${privateTfMatched(x.h.horse)?tag('Matched','green'):'<span class="muted">Unresolved</span>'}</td><td>${x.issues.length?`<span class="tag red">${x.issues.join(' · ')}</span>`:'<span class="muted">coverage gap</span>'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="audit-banner"><strong>FORM COVERAGE COMPLETE</strong><span>Every nominee is either 8/8 or explicitly certified full-career complete, with no integrity flags.</span></div>'}</div></section>`;
}

const formAuditRenderBase=render;
render=function(view='dashboard'){
  formAuditRenderBase(view);
  if(view==='form'&&formIntelData&&cupData){
    const root=document.getElementById('app-content');
    root.insertAdjacentHTML('afterbegin',formCoverageAuditPanel());
  }
};
