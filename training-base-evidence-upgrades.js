// Horse-specific training-base evidence upgrades verified 15 Sep 2026.
// These records override trainer-operation fallbacks only where a horse-level source states a current location.
(function(){
  const upgrades={
    'Aethelflaed':{trainingBase:'Warwick Farm, NSW',stateCountry:'Australia',verifiedDate:'2026-09-15',source:'Breednet horse profile — Trainer: Matthew Smith, Warwick Farm',sourceUrl:'https://www.breednet.com.au/horse/aethelflaed',confidence:'Verified horse-specific current profile',basis:'HORSE_SPECIFIC_CURRENT',horseSpecificCurrentVerified:true,trainerOperationFallback:false},
    'Aethelwulf':{trainingBase:'Warwick Farm, NSW',stateCountry:'Australia',verifiedDate:'2026-09-15',source:'Racing Australia syndicated Melbourne Cup entry — horse Location: Warwick Farm',sourceUrl:'https://symonslaxonracing.com.au/racing-detail/26307080269/133538/N/',confidence:'Verified horse-specific current entry location',basis:'HORSE_SPECIFIC_CURRENT',horseSpecificCurrentVerified:true,trainerOperationFallback:false},
    'Age Of Sail':{trainingBase:'Newcastle, NSW',stateCountry:'Australia',verifiedDate:'2026-09-15',source:'Racing Australia horse profile — Trainer: Kris Lees (Newcastle)',sourceUrl:'https://www.racingaustralia.horse/InteractiveForm/HorseFullForm.aspx?Key=2026Apr04%2CNSW%2CRoyal+Randwick&horsecode=MjAxMjA2MjQ4MA%3D%3D&raceentry=NTg0Mzk0MTY0OA%3D%3D&src=horseform&stage=FinalFields',confidence:'Verified horse-specific current profile',basis:'HORSE_SPECIFIC_CURRENT',horseSpecificCurrentVerified:true,trainerOperationFallback:false},
    'Amelia Earhart':{trainingBase:'Co. Tipperary, Ireland',stateCountry:'Ireland',verifiedDate:'2026-09-15',source:'Racing Australia syndicated Melbourne Cup entry — horse Location: Co. Tipperary (IRE)',sourceUrl:'https://symonslaxonracing.com.au/racing-detail/26307080269/133538/N/',confidence:'Verified horse-specific current entry location',basis:'HORSE_SPECIFIC_CURRENT',horseSpecificCurrentVerified:true,trainerOperationFallback:false},
    'Changingoftheguard':{trainingBase:'Newcastle, NSW',stateCountry:'Australia',verifiedDate:'2026-09-15',source:'Racing NSW / Racing.com — Changingoftheguard listed Newcastle under Kris Lees; Lees described as Newcastle-based trainer',sourceUrl:'https://www.racing.com/news/2026/05/10/news-preview-ramsden-stakes-100526',confidence:'Verified horse-specific current trainer/location evidence',basis:'HORSE_SPECIFIC_CURRENT',horseSpecificCurrentVerified:true,trainerOperationFallback:false}
  };
  window.trainingBaseEvidenceUpgrades=upgrades;
  function apply(){
    try{
      if(!completeTrainingBaseData?.bases)return false;
      Object.entries(upgrades).forEach(([name,u])=>{const old=completeTrainingBaseData.bases[name]||{};completeTrainingBaseData.bases[name]={...old,...u};});
      const all=Object.values(completeTrainingBaseData.bases);
      completeTrainingBaseData.coverage={...(completeTrainingBaseData.coverage||{}),nominees:all.length,baseDisplayed:all.filter(x=>x?.trainingBase).length,horseSpecificCurrentVerified:all.filter(x=>x?.horseSpecificCurrentVerified).length,trainerOperationFallback:all.filter(x=>x?.trainerOperationFallback).length};
      const label=document.getElementById('updated-label');if(label)label.textContent=`Official nominations loaded · ${completeTrainingBaseData.coverage.baseDisplayed}/101 bases displayed · ${completeTrainingBaseData.coverage.horseSpecificCurrentVerified} horse-specific verified`;
      return true;
    }catch(_){return false;}
  }
  const timer=setInterval(()=>{if(apply())clearInterval(timer);},50);setTimeout(()=>clearInterval(timer),10000);
  window.applyTrainingBaseEvidenceUpgrades=apply;
})();
