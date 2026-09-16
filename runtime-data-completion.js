// Program-wide runtime data completion layer — 17 Sep 2026.
// Purpose: use the richest already-loaded factual record before rendering a dash.
// Never invents a value; it only merges canonical form, rated form and dated lead-up evidence.
(function(){
  const nonEmpty=v=>v!==undefined&&v!==null&&v!==''&&v!=='—';
  const key=r=>`${String(r?.date||'').slice(0,10)}|${String(r?.race||r?.raceName||'').trim().toLowerCase()}|${String(r?.track||r?.venue||'').trim().toLowerCase()}`;
  const mergeRich=(a,b)=>{const out={...(a||{})};for(const [k,v] of Object.entries(b||{})){if(nonEmpty(v)||!nonEmpty(out[k]))out[k]=v;}return out;};
  function eventRuns(name){
    try{return [...(leadupData?.events||[])].filter(e=>e?.horse===name&&e?.date&&e?.type==='Result').map(e=>({date:e.date,race:e.race||e.raceName,track:e.track||e.venue,distanceM:e.distanceM,going:e.going||e.trackCondition,finish:e.result||e.finish,margin:e.margin,classGroup:e.classGroup||e.class,fieldSize:e.fieldSize,status:e.status}));}catch(_){return []}
  }
  const baseActual=typeof window.publicActualRuns==='function'?window.publicActualRuns:null;
  const baseRated=typeof window.publicRatedRuns==='function'?window.publicRatedRuns:null;
  function richestRuns(name){
    const pools=[];
    try{if(baseActual)pools.push(...(baseActual(name)||[]));}catch(_){}
    try{if(formIntelData?.horses?.[name]?.runs)pools.push(...formIntelData.horses[name].runs);}catch(_){}
    try{if(baseRated)pools.push(...(baseRated(name)||[]));}catch(_){}
    pools.push(...eventRuns(name));
    const rows=[];
    for(const r of pools){
      if(!r)continue;
      const d=String(r.date||'').slice(0,10);if(!d)continue;
      let i=rows.findIndex(x=>key(x)===key(r));
      if(i<0)i=rows.findIndex(x=>String(x.date||'').slice(0,10)===d);
      if(i<0)rows.push({...r});else rows[i]=mergeRich(rows[i],r);
    }
    rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    return rows.map(r=>{let publicRating=Number(r.publicRating);if(!Number.isFinite(publicRating)&&typeof window.publicRunRating==='function'){try{publicRating=Number(window.publicRunRating(r));}catch(_){}}
      return Number.isFinite(publicRating)?{...r,publicRating}:r;
    });
  }
  window.richestPublicRuns=richestRuns;
  window.publicRatedRuns=richestRuns;
  const baseLatest=typeof window.latestLeadup==='function'?window.latestLeadup:null;
  window.latestLeadup=function(name){
    let e=null;try{e=baseLatest?baseLatest(name):null;}catch(_){}
    const r=richestRuns(name)[0]||null;
    if(e&&(!r||String(e.date||'')>=String(r.date||'')))return mergeRich(r,e);
    if(r)return {horse:name,date:r.date,race:r.race||r.raceName,track:r.track||r.venue,distanceM:r.distanceM,going:r.going||r.trackCondition,result:r.finish||r.position,status:r.classGroup||r.class||'Completed',publicRating:r.publicRating,margin:r.margin};
    return e;
  };
})();