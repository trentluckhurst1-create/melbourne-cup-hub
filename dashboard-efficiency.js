// Dashboard efficiency audit — 16 Sep 2026.
// Pre-weights mode: the intelligence table covers the complete original nomination universe.
(function(){
  if(typeof formPulseRows!=='function'||typeof formPulsePanel!=='function')return;

  formPulseRows=function(){
    const projected=new Map((projectedFieldData?.projected24||[]).map(x=>[x.horse,x]));
    return (cupData?.horses||[]).map(h=>{
      const proj=projected.get(h.horse)||null;
      const p={horse:h.horse,rank:h.nominationNumber,band:proj?.band||'NOMINATED',projectedRank:proj?.rank||null};
      const r=typeof publicFormRating==='function'?publicFormRating(h.horse):null;
      const runs=typeof publicRatedRuns==='function'?publicRatedRuns(h.horse):[];
      const lens=typeof cupPublicLens==='function'?cupPublicLens(h.horse):null;
      const ras=typeof publicRasPeak==='function'?publicRasPeak(h.horse):null;
      const market=typeof marketUniverse==='function'?marketUniverse().find(x=>x.horse===h.horse)||null:null;
      const form=typeof formCompletionState==='function'?formCompletionState(h.horse):{state:r?.runs>=8?'COMPLETE':'RESEARCH_GAP',runs:r?.runs||0};
      const weight=typeof weightRec==='function'?weightRec(h.horse):null;
      const official=typeof orderOfficialWeight==='function'?orderOfficialWeight(h.horse):null;
      const kg=Number.isFinite(official)?official:(weight?Number(weight.predictedKg):null);
      const latest=runs[0]||null;
      const recent=runs.slice(0,3);
      return {p,r,runs,lens,ras,market,form,kg,latest,recent};
    });
  };

  formPulseControls=function(){
    const opts=[['all','All nominations'],['improving','Improving'],['stayers','2800m+'],['fresh','Ran ≤21d'],['market','Market movers'],['gaps','Form gaps']];
    return `<div class="fp-controls">${opts.map(([k,l])=>`<button class="${formPulseFilter===k?'active':''}" onclick="setFormPulseFilter('${k}')">${l}</button>`).join('')}</div>`;
  };

  const basePanel=formPulsePanel;
  formPulsePanel=function(){
    const total=cupData?.horses?.length||101;
    return basePanel()
      .replace('Projected 24 · Form Pulse','All Nominations · Form Pulse')
      .replace(/\/24/g,`/${total}`)
      .replace('No projected runners match this filter.','No nominations match this filter.')
      .replace('<th>#</th>','<th>Nom.</th>');
  };
})();
