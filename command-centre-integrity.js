// Command Centre integrity layer: universe shells are not evidence; specialist monitors retain their full applicable subset.
(function(){
  function actualMarketCount(){try{return typeof marketUniverse==='function'?marketUniverse().filter(x=>x?.last).length:0}catch(_){return 0}}
  function privatePfrIdentityCount(){try{return Number(window.timeformStatusData?.profilesMatched||0)}catch(_){return 0}}
  const priorEvidence=typeof commandEvidenceState==='function'?commandEvidenceState:null;
  if(priorEvidence){window.commandEvidenceState=function(){const s=priorEvidence();return {...s,market:actualMarketCount(),tf:privatePfrIdentityCount()};};}
  window.commandInternational=function(){
    const hs=Array.isArray(window.cupData?.horses)?window.cupData.horses:[];
    return hs.filter(h=>h.trainingRegion==='International').map(h=>({
      ...h,
      prep:typeof prepRecord==='function'?prepRecord(h.horse):null,
      projected:typeof projectedRec==='function'?projectedRec(h.horse):null
    })).sort((a,b)=>(a.projected?.rank||999)-(b.projected?.rank||999)||a.horse.localeCompare(b.horse));
  };
  const priorDashboard=typeof commandCentreDashboard==='function'?commandCentreDashboard:null;
  if(priorDashboard){window.commandCentreDashboard=function(){
    let html=priorDashboard();
    html=html.replace(/TIMEFORM IDENTITY/g,'PRIVATE PFR IDENTITY').replace(/>TF</g,'>PFR<').replace(/numeric ratings remain separate/g,'private values remain local');
    return html;
  };}
})();
