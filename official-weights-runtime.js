// Propagate the authoritative 2026 official-weight ledger and frozen prediction snapshot.
(function(){
  const norm=s=>String(s||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]/g,'');
  let loading=null;
  function expose(o,p){
    window.officialWeights=o;
    window.weightPredictions=p;
    window.officialWeightMap=()=>new Map((window.officialWeights?.weights||[]).map(x=>[norm(x.horse),x]));
    window.weightPredictionMap=()=>new Map((window.weightPredictions?.predictions||[]).map(x=>[norm(x.horse),x]));
    window.weightRec=name=>window.weightPredictionMap().get(norm(name))||null;
    window.officialWeightRec=name=>window.officialWeightMap().get(norm(name))||null;
  }
  async function loadExtras(){
    if(window.officialWeights&&window.weightPredictions)return {officialWeights:window.officialWeights,weightPredictions:window.weightPredictions};
    if(loading)return loading;
    loading=Promise.all([
      fetch('./data/weights/2026-official.json',{cache:'no-store'}),
      fetch('./data/weights/2026-09-13-working-predictions.json',{cache:'no-store'})
    ]).then(async([oRes,pRes])=>{
      if(!oRes.ok)throw new Error(`Official weights HTTP ${oRes.status}`);
      if(!pRes.ok)throw new Error(`Frozen predictions HTTP ${pRes.status}`);
      const o=await oRes.json(),p=await pRes.json();
      expose(o,p);
      return {officialWeights:o,weightPredictions:p};
    }).finally(()=>{loading=null;});
    return loading;
  }
  window.loadExtras=loadExtras;
  async function applyOfficialWeights(){
    try{
      const {officialWeights:o,weightPredictions:p}=await loadExtras();
      const om=new Map((o.weights||[]).map(x=>[norm(x.horse),Number(x.weightKg)]));
      const pm=new Map((p.predictions||[]).map(x=>[norm(x.horse),Number(x.predictedKg)]));
      const horses=(typeof cupData!=='undefined'&&Array.isArray(cupData?.horses))?cupData.horses:[];
      for(const h of horses){const k=norm(h.horse);if(om.has(k))h.officialWeightKg=om.get(k);if(pm.has(k))h.predictedWeightKg=pm.get(k);}
      const officialNames=new Set(om.keys()),predictionNames=new Set(pm.keys()),nominationNames=new Set(horses.map(h=>norm(h.horse)));
      const integrity={nominations:nominationNames.size,official:officialNames.size,predicted:predictionNames.size,officialMissingFromNominations:[...officialNames].filter(x=>!nominationNames.has(x)),predictionMissingFromNominations:[...predictionNames].filter(x=>!nominationNames.has(x)),nominationsMissingOfficial:[...nominationNames].filter(x=>!officialNames.has(x)),nominationsMissingPrediction:[...nominationNames].filter(x=>!predictionNames.has(x))};
      integrity.pass=integrity.nominations===101&&integrity.official===101&&integrity.predicted===101&&!integrity.officialMissingFromNominations.length&&!integrity.predictionMissingFromNominations.length&&!integrity.nominationsMissingOfficial.length&&!integrity.nominationsMissingPrediction.length;
      window.weightUniverseIntegrity=integrity;
      const label=document.getElementById('updated-label');if(label)label.textContent=`Official weights loaded · ${om.size} handicaps · 17 Sep${integrity.pass?' · 101/101 verified':''}`;
      if(typeof render==='function'&&typeof currentView!=='undefined')render(currentView);
    }catch(err){console.error('Official weight propagation failed',err);}
  }
  const timer=setInterval(()=>{if(typeof cupData!=='undefined'&&cupData?.horses?.length){clearInterval(timer);applyOfficialWeights();}},50);
  setTimeout(()=>clearInterval(timer),10000);
})();