// Adds 15 Sep public-form completion batch without disturbing the existing form loader.
(function(){
  if(typeof formIntelPromise==='undefined'||typeof mergeFormDatasets!=='function')return;
  const prior=formIntelPromise||Promise.resolve(formIntelData);
  formIntelPromise=Promise.resolve(prior).then(base=>fetch('./data/form/2026-09-15-form-supplement-14.json',{cache:'no-store'})
    .then(r=>r.ok?r.json():null)
    .catch(()=>null)
    .then(supp=>{
      if(supp){formIntelData=mergeFormDatasets(base||formIntelData,[supp]);}
      return formIntelData;
    }));
})();