// Propagate the authoritative 2026 official-weight ledger into every horse record.
(function(){
  const norm=s=>String(s||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]/g,'');
  async function applyOfficialWeights(){
    try{
      const [oRes,pRes]=await Promise.all([fetch('./data/weights/2026-official.json',{cache:'no-store'}),fetch('./data/weights/2026-09-13-working-predictions.json',{cache:'no-store'})]);
      if(!oRes.ok)throw new Error(`Official weights HTTP ${oRes.status}`);
      const o=await oRes.json(),p=pRes.ok?await pRes.json():{predictions:[]};
      window.officialWeights=o; if(typeof officialWeights!=='undefined')officialWeights=o;
      const om=new Map((o.weights||[]).map(x=>[norm(x.horse),Number(x.weightKg)]));
      const pm=new Map((p.predictions||[]).map(x=>[norm(x.horse),Number(x.predictedKg)]));
      for(const h of (cupData?.horses||[])){const k=norm(h.horse);if(om.has(k))h.officialWeightKg=om.get(k);if(pm.has(k))h.predictedWeightKg=pm.get(k);}
      const label=document.getElementById('updated-label');if(label)label.textContent=`Official weights loaded · ${om.size} handicaps · 17 Sep`;
      if(typeof render==='function'&&typeof currentView!=='undefined')render(currentView);
    }catch(err){console.error('Official weight propagation failed',err);}
  }
  const timer=setInterval(()=>{if(typeof cupData!=='undefined'&&cupData?.horses?.length){clearInterval(timer);applyOfficialWeights();}},50);
  setTimeout(()=>clearInterval(timer),10000);
})();