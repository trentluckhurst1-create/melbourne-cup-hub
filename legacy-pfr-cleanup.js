// Public UI terminology guard. Protected source provenance stays private; the product-facing rating workspace is PFR.
(function(){
  function relabel(){
    try{
      if(Array.isArray(window.navItems)){
        const row=window.navItems.find(x=>x?.[0]==='timeform');
        if(row)row[1]='PFR';
      } else if(typeof navItems!=='undefined'&&Array.isArray(navItems)){
        const row=navItems.find(x=>x?.[0]==='timeform');
        if(row)row[1]='PFR';
      }
      if(typeof descriptions!=='undefined'&&descriptions?.timeform){
        descriptions.timeform=['PFR','Performance Form Ratings across the permanent 101-horse universe. Private PFR remains local; public PFR and verified public benchmarks fill evidence visibility without pretending to be private ratings.'];
      }
    }catch(err){console.warn('PFR label guard',err)}
  }
  relabel();
  const priorDashboard=typeof dashboard==='function'?dashboard:null;
  if(priorDashboard){window.dashboard=function(){return priorDashboard().replace(/Timeform rating/g,'PFR rating');};}
  const priorHorse=typeof horseDetailView==='function'?horseDetailView:null;
  if(priorHorse){window.horseDetailView=function(name){return priorHorse(name).replace(/>Timeform</g,'>PFR<').replace(/Timeform history/g,'PFR history').replace(/User-supplied subscription data/g,'Private PFR when locally available');};}
  const priorNav=typeof renderNav==='function'?renderNav:null;
  if(priorNav){window.renderNav=function(){relabel();return priorNav();};}
})();
