// Horse-specific training-base evidence upgrades verified 15 Sep 2026.
// Override trainer-operation fallbacks only where horse-level/current-stable evidence supports the location.
(function(){
 const U=(trainingBase,source,sourceUrl,stateCountry='Australia')=>({trainingBase,stateCountry,verifiedDate:'2026-09-15',source,sourceUrl,confidence:'Verified horse-specific/current-stable evidence',basis:'HORSE_SPECIFIC_CURRENT',horseSpecificCurrentVerified:true,trainerOperationFallback:false});
 const entry='https://symonslaxonracing.com.au/racing-detail/26307080269/133538/N/';
 const upgrades={
  'Aethelflaed':U('Warwick Farm, NSW','Breednet horse profile — Matthew Smith, Warwick Farm','https://www.breednet.com.au/horse/aethelflaed'),
  'Aethelwulf':U('Warwick Farm, NSW','Racing Australia syndicated Melbourne Cup entry — horse Location: Warwick Farm',entry),
  'Age Of Sail':U('Newcastle, NSW','Racing Australia horse profile — Kris Lees (Newcastle)','https://www.racingaustralia.horse/InteractiveForm/HorseFullForm.aspx?Key=2026Apr04%2CNSW%2CRoyal+Randwick&horsecode=MjAxMjA2MjQ4MA%3D%3D&raceentry=NTg0Mzk0MTY0OA%3D%3D&src=horseform&stage=FinalFields'),
  'Amelia Earhart':U('Co. Tipperary, Ireland','Melbourne Cup entry — Location: Co. Tipperary (IRE)',entry,'Ireland'),
  'Changingoftheguard':U('Newcastle, NSW','Current Australian campaign under Newcastle-based Kris Lees','https://www.races.com.au/2026/04/11/sydney-cup-2026-results-changingoftheguard-wins-at-50-1/'),
  'Asterix':U('Flemington, VIC','Racing NSW horse profile — Chris Waller (Flemington)','https://mdata.racingnsw.com.au/InteractiveForm/HorseFullForm.aspx?Key=2026Mar24%2CNSW%2CRosehill+Gardens%2CTrial&horsecode=Nzk0MzQ4Mjk2Mg%3D%3D&raceentry=MjMyMDAwMDMyOTY%3D&src=horseform&stage=FinalFields'),
  'Athabascan':U('Randwick, NSW','Racing NSW current-run record — Athabascan (Randwick)','https://mdata.racingnsw.com.au/InteractiveForm/TrainerLastRuns.aspx?trainercode=OTg4OTcxNDcwMA%3D%3D&trainername=Tom+Charlton'),
  'Darkbonee':U('Warrnambool, VIC','Breednet horse profile — Symon Wilde, Warrnambool','https://www.breednet.com.au/horse/darkbonee'),
  'Deakin':U('Pakenham, VIC','Breednet horse profile — Phillip & Tommy Stokes, Pakenham OC','https://www.breednet.com.au/horse/deakin'),
  'Future History':U('Warwick Farm, NSW','Racing NSW current stable — Future History; Gregory Hickman, Warwick Farm','https://mdata.racingnsw.com.au/InteractiveForm/TrainerLastRuns.aspx?trainercode=Mjk5Mjc3OTA%3D&trainername=Gregory+Hickman'),
  'Golden Century':U('Rosehill, NSW','Racing NSW horse profile — Chris Waller (Rosehill)','https://mdata.racingnsw.com.au/InteractiveForm/HorseFullForm.aspx?Key=2026Aug08%2CNSW%2CRoyal+Randwick&horsecode=MTQ5ODE1Nzg4NzY%3D&raceentry=NDM5NjU0OTgzMDI%3D&src=horseform&stage=FinalFields'),
  'Jenni Multabella':U('Cranbourne, VIC','Breednet current horse profile — Lloyd Kennewell, Cranbourne','https://www.breednet.com.au/horse/jenni-multabella'),
  'Jennivamoose':U('Cranbourne, VIC','Breednet current horse profile — Ciaron Maher, Cranbourne','https://breednet-web.azurewebsites.net/horse/jennivamoose'),
  'Johnich':U('Mornington, VIC','Breednet current horse profile — Jason Warren, Mornington','https://www.breednet.com.au/horse/johnich'),
  'Litzdeel':U('Flemington, VIC','Breednet current horse profile — Danny O’Brien, Flemington','https://www.breednet.com.au/horse/litzdeel'),
  'Machine Gun Gracie':U('Pakenham 3, VIC','Breednet current horse profile — Ben, Will & JD Hayes, Pakenham 3','https://www.breednet.com.au/horse/machine-gun-gracie'),
  'Newlook':U('Cranbourne, VIC','Melbourne Cup entry — Location: Cranbourne',entry),
  'Nil Bua Gan Dua':U('Co. Kilkenny, Ireland','Melbourne Cup entry — Location: Co. Kilkenny (IRE)',entry,'Ireland'),
  'Ohope Wins':U('Flemington, VIC','Melbourne Cup entry — Location: Flemington',entry),
  'Okita Soushi':U('Ballarat, VIC','Melbourne Cup entry — Location: Ballarat',entry),
  'Omni Man':U('Co. Kilkenny, Ireland','Melbourne Cup entry — Location: Co. Kilkenny (IRE)',entry,'Ireland'),
  'Onesmoothoperator':U('Bendigo, VIC','Racing NSW horse profile — Tim Fitzsimmons (Bendigo)','https://mdata.racingnsw.com.au/InteractiveForm/HorseFullForm.aspx?horsecode=MjA2MDc4Njk5NzA%3D&src=horseform'),
  'Piazza San Marco':U('Co. Tipperary, Ireland','Melbourne Cup entry — Location: Co. Tipperary (IRE)',entry,'Ireland'),
  'Pierre Bonnard':U('Co. Tipperary, Ireland','Melbourne Cup entry — Location: Co. Tipperary (IRE)',entry,'Ireland'),
  'Piggyback':U('Warwick Farm, NSW','Melbourne Cup entry — Location: Warwick Farm',entry),
  'Pinhole':U('Rosehill, NSW','Melbourne Cup entry — Location: Rosehill',entry)
 };
 window.trainingBaseEvidenceUpgrades=upgrades;
 function apply(){try{if(!completeTrainingBaseData?.bases)return false;Object.entries(upgrades).forEach(([name,u])=>{completeTrainingBaseData.bases[name]={...(completeTrainingBaseData.bases[name]||{}),...u};});const all=Object.values(completeTrainingBaseData.bases);completeTrainingBaseData.coverage={...(completeTrainingBaseData.coverage||{}),nominees:all.length,baseDisplayed:all.filter(x=>x?.trainingBase).length,horseSpecificCurrentVerified:all.filter(x=>x?.horseSpecificCurrentVerified).length,trainerOperationFallback:all.filter(x=>x?.trainerOperationFallback).length};const label=document.getElementById('updated-label');if(label)label.textContent=`Official nominations loaded · ${completeTrainingBaseData.coverage.baseDisplayed}/101 bases displayed · ${completeTrainingBaseData.coverage.horseSpecificCurrentVerified} horse-specific verified`;return true;}catch(_){return false;}}
 const timer=setInterval(()=>{if(apply())clearInterval(timer);},50);setTimeout(()=>clearInterval(timer),10000);window.applyTrainingBaseEvidenceUpgrades=apply;
})();
