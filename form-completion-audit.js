function actualRaceRuns(horse){
  return (formIntelData?.horses?.[horse]?.runs||[]).filter(r=>!String(r.classGroup||'').toLowerCase().includes('trial')&&!String(r.race||'').toLowerCase().includes('trial')&&!String(r.race||'').toLowerCase().includes('jump-out'));
}
function formCompletionState(horse){
  const rec=formIntelData?.horses?.[horse]||{};
  const runs=actualRaceRuns(horse);
  if(runs.length>=8)return {state:'COMPLETE',runs:8,label:'8/8',className:'green'};
  if(rec.careerComplete===true)return {state:'CAREER_COMPLETE',runs:runs.length,label:`${runs.length}/${runs.length} career`,className:'green'};
  return {state:'RESEARCH_GAP',runs:runs.length,label:`${runs.length}/8`,className:runs.length>=5?'gold':'red'};
}
function formCompletionSummary(){
  const horses=cupData?.horses||[];
  const rows=horses.map(h=>({h,...formCompletionState(h.horse)}));
  return {
    rows,
    complete:rows.filter(x=>x.state==='COMPLETE').length,
    career:rows.filter(x=>x.state==='CAREER_COMPLETE').length,
    gaps:rows.filter(x=>x.state==='RESEARCH_GAP').length,
    noForm:rows.filter(x=>x.runs===0).length,
    fivePlus:rows.filter(x=>x.runs>=5).length
  };
}
function formCoverageAuditPanel(){
  const a=formCompletionSummary();
  const gaps=a.rows.filter(x=>x.state==='RESEARCH_GAP').sort((x,y)=>x.runs-y.runs||x.h.nominationNumber-y.h.nominationNumber);
  return `<section class="section-block"><div class="section-header"><div><div class="kicker">Coverage Control · Actual Race Starts Only</div><h2>101-Horse Form Completion Audit</h2><div class="section-copy">Target = latest eight actual race starts. Trials and jump-outs do not count. Horses with fewer than eight career starts can be explicitly certified Career Complete.</div></div></div>
  <section class="metric-grid">${metric('8/8 Complete',a.complete,'Full recent race window')}${metric('Career Complete',a.career,'Entire career loaded, fewer than 8')}${metric('Research Gaps',a.gaps,'Still below required coverage')}${metric('Zero Form',a.noForm,'Must be resolved')}${metric('5+ Runs',a.fivePlus,'Substantial evidence loaded')}</section>
  <div class="panel"><div class="panel-head"><div><h3>Remaining Coverage Queue</h3><div class="panel-sub">Automatically generated from the merged live form layer.</div></div><span class="tag gold">${a.gaps} OPEN</span></div>
  ${gaps.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>Trainer</th><th>Runs</th><th>Missing</th><th>TF Identity</th></tr></thead><tbody>${gaps.map(x=>`<tr><td>${x.h.nominationNumber}</td><td class="horse">${horseLink(x.h.horse)}</td><td>${x.h.trainer}</td><td><strong>${x.runs}/8</strong></td><td>${8-x.runs}</td><td>${privateTfMatched(x.h.horse)?tag('Matched','green'):'<span class="muted">Unresolved</span>'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="audit-banner"><strong>FORM COVERAGE COMPLETE</strong><span>Every nominee is either 8/8 or certified full-career complete.</span></div>'}</div></section>`;
}

const formAuditRenderBase=render;
render=function(view='dashboard'){
  formAuditRenderBase(view);
  if(view==='form'&&formIntelData&&cupData){
    const root=document.getElementById('app-content');
    root.insertAdjacentHTML('afterbegin',formCoverageAuditPanel());
  }
};
