let tfPendingGuardSavedSession=null;

function tfPendingGuardStats(session){
  const hs=session?.horses||{};
  const rows=Object.values(hs);
  let masters=0,ratedRuns=0;
  for(const rec of rows){
    if(typeof tfMasterValue==='function'&&tfMasterValue(rec)!==null)masters++;
    const runs=typeof tfRuns==='function'?tfRuns(rec):(rec?.lastRuns||rec?.runs||[]);
    if(typeof tfRatingValue==='function')ratedRuns+=runs.filter(r=>tfRatingValue(r)!==null).length;
  }
  return {horses:rows.length,masters,ratedRuns,hasRatings:masters>0||ratedRuns>0};
}

const pendingGuardControlsBase=privateTfControls;
privateTfControls=function(){
  const effective=privateTimeformSession||tfPendingGuardSavedSession;
  if(!effective)return pendingGuardControlsBase();
  const s=tfPendingGuardStats(effective);
  if(s.hasRatings)return pendingGuardControlsBase();
  return `<div class="private-tf-box"><div><span class="private-tf-kicker">PRIVATE · RECOVERY SCAFFOLD</span><strong>Timeform structure loaded — rating values absent</strong><em>${s.horses} horse records loaded · 0 master ratings · 0 rated runs. Identity work is preserved; numerical TFRs will be restored later.</em></div><div class="private-tf-actions"><button class="ghost-button private-tf-load" id="private-tf-connect">Choose Different JSON</button><input id="private-tf-file" type="file" accept="application/json,.json" hidden><button class="ghost-button" id="private-tf-clear">Forget file</button></div></div>`;
};

const pendingGuardTimeformBase=timeformView;
timeformView=function(){
  const session=privateTimeformSession;
  if(!session||tfPendingGuardStats(session).hasRatings)return pendingGuardTimeformBase();
  tfPendingGuardSavedSession=session;
  privateTimeformSession=null;
  try{return pendingGuardTimeformBase();}
  finally{privateTimeformSession=session;tfPendingGuardSavedSession=null;}
};

const pendingGuardFormBase=formGuideView;
formGuideView=function(){
  const session=privateTimeformSession;
  if(!session||tfPendingGuardStats(session).hasRatings)return pendingGuardFormBase();
  tfPendingGuardSavedSession=session;
  privateTimeformSession=null;
  try{return pendingGuardFormBase();}
  finally{privateTimeformSession=session;tfPendingGuardSavedSession=null;}
};

const pendingGuardBindBase=bindPrivateTfControls;
bindPrivateTfControls=function(){
  pendingGuardBindBase();
  const session=privateTimeformSession;
  if(!session||tfPendingGuardStats(session).hasRatings)return;
  const connect=document.getElementById('private-tf-connect');
  if(connect){connect.dataset.bound='1';connect.onclick=connectTfFile;}
};
