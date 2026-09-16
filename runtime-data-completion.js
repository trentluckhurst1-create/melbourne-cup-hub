// Program-wide runtime data completion layer — 17 Sep 2026.
// Uses the richest loaded factual record before rendering a dash.
(function(){
 try{if(typeof GOLDEN_TICKETS!=='undefined')GOLDEN_TICKETS.add('Shockletz');}catch(_){}
 const nonEmpty=v=>v!==undefined&&v!==null&&v!==''&&v!=='—';
 const norm=v=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');
 const key=r=>`${String(r?.date||'').slice(0,10)}|${norm(r?.race||r?.raceName)}|${norm(r?.track||r?.venue)}`;
 const raceKey=r=>`${String(r?.date||'').slice(0,10)}|${norm(r?.race||r?.raceName)}|${norm(r?.track||r?.venue)}`;
 const mergeRich=(a,b)=>{const out={...(a||{})};for(const [k,v] of Object.entries(b||{})){if(nonEmpty(v)||!nonEmpty(out[k]))out[k]=v;}return out;};
 function eventRuns(name){try{return [...(leadupData?.events||[])].filter(e=>e?.horse===name&&e?.date&&e?.type==='Result').map(e=>({date:e.date,race:e.race||e.raceName,track:e.track||e.venue,distanceM:e.distanceM,going:e.going||e.trackCondition,finish:e.result||e.finish,margin:e.margin,classGroup:e.classGroup||e.class,fieldSize:e.fieldSize,status:e.status,publicRating:e.publicRating??e.pfr}));}catch(_){return []}}
 const baseActual=typeof window.publicActualRuns==='function'?window.publicActualRuns:null;
 const baseRated=typeof window.publicRatedRuns==='function'?window.publicRatedRuns:null;
 function allRawRuns(){const out=[];try{for(const h of (cupData?.horses||[])){const n=h.horse;if(baseActual)out.push(...(baseActual(n)||[]));if(formIntelData?.horses?.[n]?.runs)out.push(...formIntelData.horses[n].runs);if(baseRated)out.push(...(baseRated(n)||[]));out.push(...eventRuns(n));}}catch(_){}return out}
 function conditionIndex(){const idx=new Map();for(const r of allRawRuns()){const g=r?.going||r?.trackCondition;if(nonEmpty(g)){const k=raceKey(r);if(k&&!idx.has(k))idx.set(k,g);}}return idx}
 function richestRuns(name){
  const pools=[];try{if(baseActual)pools.push(...(baseActual(name)||[]));}catch(_){}try{if(formIntelData?.horses?.[name]?.runs)pools.push(...formIntelData.horses[name].runs);}catch(_){}try{if(baseRated)pools.push(...(baseRated(name)||[]));}catch(_){}pools.push(...eventRuns(name));
  const rows=[];for(const r of pools){if(!r)continue;const d=String(r.date||'').slice(0,10);if(!d)continue;let i=rows.findIndex(x=>key(x)===key(r));if(i<0)i=rows.findIndex(x=>String(x.date||'').slice(0,10)===d);if(i<0)rows.push({...r});else rows[i]=mergeRich(rows[i],r);}
  const ci=conditionIndex();for(const r of rows){if(!nonEmpty(r.going)&&!nonEmpty(r.trackCondition)){const g=ci.get(raceKey(r));if(nonEmpty(g))r.going=g;}}
  rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  return rows.map(r=>{let publicRating=Number(r.publicRating??r.pfr??r.rating);if(!Number.isFinite(publicRating)&&typeof window.publicRunRating==='function'){try{publicRating=Number(window.publicRunRating(r));}catch(_){}}return Number.isFinite(publicRating)?{...r,publicRating}:r;});
 }
 window.richestPublicRuns=richestRuns;window.publicRatedRuns=richestRuns;
 window.goingBadgeHtml=function(v){const label=String(v||'').trim();if(!label||label==='—')return '—';const s=label.toLowerCase();const c=/heavy/.test(s)?'heavy':/soft|yield|slow/.test(s)?'soft':/fast|firm/.test(s)?'fast':/good/.test(s)?'good':'other';return `<span class="hd-going-badge ${c}">${label}</span>`};
 const baseLatest=typeof window.latestLeadup==='function'?window.latestLeadup:null;
 window.latestLeadup=function(name){let e=null;try{e=baseLatest?baseLatest(name):null;}catch(_){}const r=richestRuns(name)[0]||null;if(e&&(!r||String(e.date||'')>=String(r.date||'')))return mergeRich(r,e);if(r)return {horse:name,date:r.date,race:r.race||r.raceName,track:r.track||r.venue,distanceM:r.distanceM,going:r.going||r.trackCondition,result:r.finish||r.position,status:r.classGroup||r.class||'Completed',publicRating:r.publicRating,margin:r.margin};return e;};
})();