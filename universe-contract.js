// Application-wide Melbourne Cup universe contract.
// Every horse-facing workspace starts from the official nomination universe.
(function(){
  const EXPECTED=101;
  function horses(){return Array.isArray(cupData?.horses)?cupData.horses:[];}
  function names(){return horses().map(h=>h.horse);}
  function countFor(fn){return names().filter(n=>{try{return !!fn(n)}catch(_){return false}}).length;}
  function hasMarketEvidence(n){try{if(typeof marketUniverse==='function'){const r=marketUniverse().find(x=>x.horse===n);return !!r?.last;}const h=typeof horseByName==='function'?horseByName(n):null;if(Number.isFinite(Number(h?.marketOdds)))return true;if(typeof marketRecord==='function'){const r=marketRecord(n);return !!(r?.last||r?.odds||r?.best);}return false;}catch(_){return false;}}
  function hasBaseEvidence(n){try{return typeof baseRecord==='function'&&!!baseRecord(n);}catch(_){return false;}}
  function hasSilkEvidence(n){try{return typeof silkFor==='function'&&!!silkFor(n);}catch(_){return false;}}
  function coverage(){const hs=horses();return {
    universe:hs.length,
    form:countFor(n=>(typeof actualRaceRuns==='function'?actualRaceRuns(n):formIntelData?.horses?.[n]?.runs||[]).length>0),
    formComplete:countFor(n=>{const s=typeof formCompletionState==='function'?formCompletionState(n):null;return s&&['COMPLETE','CAREER_COMPLETE'].includes(s.state)}),
    publicPfr:countFor(n=>typeof publicFormRating==='function'&&!!publicFormRating(n)),
    anyPfr:countFor(n=>typeof pfrProfile==='function'&&!!pfrProfile(n)),
    weight:countFor(n=>typeof weightRec==='function'&&!!weightRec(n)),
    ras:countFor(n=>typeof publicRasPeak==='function'&&publicRasPeak(n)!==null),
    privateRating:countFor(n=>typeof pfrProfile==='function'&&pfrProfile(n)?.source==='PRIMARY'),
    market:countFor(hasMarketEvidence),
    base:countFor(hasBaseEvidence),
    silk:countFor(hasSilkEvidence),
    leadup:countFor(n=>(leadupData?.events||[]).some(e=>e.horse===n))
  };}
  function assertUniverse(rows,label='workspace'){const n=Array.isArray(rows)?rows.length:0;if(horses().length===EXPECTED&&n!==EXPECTED)console.warn(`[Universe contract] ${label}: ${n}/${EXPECTED} rows. Missing horses must remain visible.`);return rows;}
  window.cupUniverse=horses;window.cupUniverseNames=names;window.cupCoverage=coverage;window.assertCupUniverse=assertUniverse;window.CUP_UNIVERSE_EXPECTED=EXPECTED;
})();
