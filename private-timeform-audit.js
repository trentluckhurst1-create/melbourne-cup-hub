// Legacy run-rating completion audit retired for the private Hub.
// Private rating coverage is now presented through the unified PFR workspace.
function privateTfCoverageAudit(){
  if(!privateTimeformSession||!cupData)return null;
  const rows=(cupData.horses||[]).map(h=>{
    const p=typeof pfrProfile==='function'?pfrProfile(h.horse):null;
    return {h,p,source:p?.source||'UNRATED'};
  });
  return {
    rows,
    primary:rows.filter(x=>x.source==='PRIMARY').length,
    rasFallback:rows.filter(x=>x.source==='RAS_FALLBACK').length,
    unrated:rows.filter(x=>x.source==='UNRATED').length
  };
}
function privateTfCoveragePanel(){return '';}
