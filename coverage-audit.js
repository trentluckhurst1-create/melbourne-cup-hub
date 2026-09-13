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
  const formCoverage=(cupData?.horses||[]).filter(h=>(formIntelData?.horses?.[h.horse]?.runs||[]).length>0).length;
  const fullForm=(cupData?.horses||[]).filter(h=>(formIntelData?.horses?.[h.horse]?.runs||[]).length>=8).length;
  const tfIdentity=(cupData?.horses||[]).filter(h=>typeof privateTfMatched==='function'&&privateTfMatched(h.horse)).length;
  return {total,verifiedBases,profiles,weights,projected,trainerCoverage,qualifiedNominees,formCoverage,fullForm,tfIdentity};
}

function researchQueue(){
  const horses=cupData?.horses||[];
  const projectedNames=(projectedFieldData?.projected24||[]).map(x=>x.horse);
  const baseNames=new Set(Object.keys(trainingBaseData?.bases||{}));
  const profileNames=new Set(Object.keys(intelligenceData?.horses||{}));
  const weightNames=new Set((weightPredictions?.predictions||[]).map(x=>x.horse));
  const byPriority=[...projectedNames,...horses.map(h=>h.horse)].filter((x,i,a)=>a.indexOf(x)===i);
  const missingBase=byPriority.filter(x=>!baseNames.has(x)).slice(0,12);
  const missingProfile=byPriority.filter(x=>!profileNames.has(x)).slice(0,12);
  const missingWeight=byPriority.filter(x=>!weightNames.has(x)).slice(0,12);
  return {missingBase,missingProfile,missingWeight};
}

function queueColumn(title,names,kind){
  return `<div class="queue-col"><div class="queue-title">${title}</div>${names.length?names.map((name,i)=>`<button class="queue-item" onclick="${horseByName(name)?`openHorse('${name.replace(/'/g,"\\'")}')`:'void 0'}"><span>${String(i+1).padStart(2,'0')}</span><strong>${name}</strong><em>${kind}</em></button>`).join(''):'<div class="queue-empty">Complete</div>'}</div>`;
}

function coveragePanel(){
  const c=coverageSnapshot();
  const q=researchQueue();
  return `<section class="section-block"><div class="section-header"><div><div class="kicker">Research Coverage Audit</div><h2>101-Horse Intelligence Completion</h2><div class="section-copy">Every percentage is calculated against the official nomination file. Non-nominees cannot inflate completion numbers.</div></div></div>
    <div class="coverage-grid">
      ${coverageBar('Trainer operation mapped',c.trainerCoverage,c.total,'Primary and secondary stable locations separated from horse location.')}
      ${coverageBar('Current horse base verified',c.verifiedBases,c.total,'Horse-specific preparation location only; unknown horses remain Researching.')}
      ${coverageBar('Public form history loaded',c.formCoverage,c.total,`${c.fullForm} horses currently have a full eight-run verified window.`)}
      ${coverageBar('Timeform identity matched',c.tfIdentity,c.total,'Identity layer only. Numerical Timeform ratings remain pending and are not counted here.')}
      ${coverageBar('Rich horse profile',c.profiles,c.total,'Age/sex, campaign and Cup-relevance intelligence currently populated.')}
      ${coverageBar('Working weight estimate',c.weights,c.total,'Pre-release handicap estimate with range and reasoning.')}
      ${coverageBar('Projected-field assessment',c.projected,c.total,'Current top-24 projection; remaining horses are not yet ranked into the cut-line board.')}
    </div>
    <div class="coverage-foot"><span>${c.qualifiedNominees} current Golden Ticket winners are also official nominees.</span><span>Integrity rule: official nomination set is the denominator.</span></div>
    <div class="research-queue"><div class="panel-head"><div><h3>Priority Research Queue</h3><div class="panel-sub">Projected-field horses are automatically pushed to the front. Completing an item removes it from this queue.</div></div><span class="tag gold">LIVE AUDIT</span></div><div class="queue-grid">${queueColumn('Current Base Missing',q.missingBase,'verify location')}${queueColumn('Profile Missing',q.missingProfile,'build dossier')}${queueColumn('Weight Missing',q.missingWeight,'model handicap')}</div></div>
  </section>`;
}

const coverageDashboardBase=dashboard;
dashboard=function(){return coverageDashboardBase()+coveragePanel();};

const coverageRenderBase=render;
render=function(view='dashboard'){coverageRenderBase(view);};
