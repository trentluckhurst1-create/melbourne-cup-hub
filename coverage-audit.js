function nominationNames(){return new Set((cupData?.horses||[]).map(h=>h.horse));}
function intersectCount(names){const official=nominationNames();return [...names].filter(x=>official.has(x)).length;}
function pct(n,d){return d?Math.round((n/d)*100):0;}
function coverageBar(label,count,total,detail){const p=pct(count,total);return `<div class="coverage-row"><div class="coverage-head"><span>${label}</span><strong>${count}/${total} · ${p}%</strong></div><div class="coverage-track"><div class="coverage-fill" style="width:${p}%"></div></div><div class="coverage-detail">${detail}</div></div>`;}

function coverageSnapshot(){
  const total=(cupData?.horses||[]).length;
  const official=nominationNames();
  const verifiedBases=intersectCount(Object.keys(trainingBaseData?.bases||{}));
  const profiles=intersectCount(Object.keys(intelligenceData?.horses||{}));
  const weights=intersectCount((weightPredictions?.predictions||[]).map(x=>x.horse));
  const projected=intersectCount((projectedFieldData?.projected24||[]).map(x=>x.horse));
  const trainers=new Set((trainerBaseData?.trainers||[]).map(x=>x.trainer));
  const trainerCoverage=(cupData?.horses||[]).filter(h=>trainers.has(h.trainer)).length;
  const qualifiedNominees=(qualificationData?.qualified||[]).filter(x=>official.has(x.horse)).length;
  return {total,verifiedBases,profiles,weights,projected,trainerCoverage,qualifiedNominees};
}

function coveragePanel(){
  const c=coverageSnapshot();
  return `<section class="section-block"><div class="section-header"><div><div class="kicker">Research Coverage Audit</div><h2>101-Horse Intelligence Completion</h2><div class="section-copy">Every percentage is calculated against the official nomination file. Non-nominees cannot inflate completion numbers.</div></div></div>
    <div class="coverage-grid">
      ${coverageBar('Trainer operation mapped',c.trainerCoverage,c.total,'Primary and secondary stable locations separated from horse location.')}
      ${coverageBar('Current horse base verified',c.verifiedBases,c.total,'Horse-specific preparation location only; unknown horses remain Researching.')}
      ${coverageBar('Rich horse profile',c.profiles,c.total,'Age/sex, campaign and Cup-relevance intelligence currently populated.')}
      ${coverageBar('Working weight estimate',c.weights,c.total,'Pre-release handicap estimate with range and reasoning.')}
      ${coverageBar('Projected-field assessment',c.projected,c.total,'Current top-24 projection; remaining horses are not yet ranked into the cut-line board.')}
    </div>
    <div class="coverage-foot"><span>${c.qualifiedNominees} current Golden Ticket winners are also official nominees.</span><span>Integrity rule: official nomination set is the denominator.</span></div>
  </section>`;
}

const coverageDashboardBase=dashboard;
dashboard=function(){
  const base=coverageDashboardBase();
  return base+coveragePanel();
};

const coverageRenderBase=render;
render=function(view='dashboard'){
  coverageRenderBase(view);
};
