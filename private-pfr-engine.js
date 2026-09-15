// Private PFR resolver. Protected primary values are loaded only from the user's local private dataset.
// Public R&S values are used only when no private primary rating exists.
(function(){
  function num(v){const m=String(v??'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null;}
  function rec(name){return typeof tfHorseRec==='function'?tfHorseRec(name):null;}
  function runs(name){const r=rec(name);return r&&typeof tfRuns==='function'?tfRuns(r):[];}
  function ratedRuns(name){return runs(name).map(x=>({...x,pfr:num(typeof tfRatingDisplay==='function'?tfRatingDisplay(x):x.ratingDisplay)})).filter(x=>Number.isFinite(x.pfr));}
  function primaryMaster(name){const r=rec(name);if(!r||r.matchStatus==='NOT_FOUND')return null;const display=typeof tfMasterDisplay==='function'?tfMasterDisplay(r):null;const value=num(display);return Number.isFinite(value)?{value,display:String(display),source:'PRIMARY'}:null;}
  function rasFallback(name){const value=typeof publicRasPeak==='function'?publicRasPeak(name):null;return Number.isFinite(value)?{value,display:String(value),source:'RAS_FALLBACK'}:null;}
  function pfrRating(name){return primaryMaster(name)||rasFallback(name)||{value:null,display:'—',source:'UNRATED'};}
  function pfrTrajectory(name){const rr=ratedRuns(name).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));if(rr.length)return rr.map(x=>({date:x.date||'',track:x.track||'',race:x.race||'',finish:x.finish||'',pfr:x.pfr,display:typeof tfRatingDisplay==='function'?tfRatingDisplay(x):String(x.pfr),source:'PRIMARY'}));const fb=rasFallback(name);return fb?[{date:'',track:'',race:'Verified R&S fallback',finish:'',pfr:fb.value,display:fb.display,source:'RAS_FALLBACK'}]:[];}
  function pfrProfile(name){const rating=pfrRating(name),trajectory=pfrTrajectory(name),vals=trajectory.filter(x=>x.source==='PRIMARY').map(x=>x.pfr);const latest=vals.length?vals[vals.length-1]:rating.value;const peak=vals.length?Math.max(...vals):rating.value;let trend=null,label='Limited data';if(vals.length>=2){const recent=vals.slice(-3);const older=vals.slice(Math.max(0,vals.length-6),Math.max(0,vals.length-3));const recentAvg=recent.reduce((a,b)=>a+b,0)/recent.length;const base=older.length?older.reduce((a,b)=>a+b,0)/older.length:vals[0];trend=Math.round((recentAvg-base)*10)/10;if(trend>=4)label='Improving';else if(trend<=-4)label='Regressing';else label='Stable';}
    return {name,current:rating.value,currentDisplay:rating.display,source:rating.source,latest,peak,trend,trajectoryLabel:label,trajectory};
  }
  window.pfrRating=pfrRating;window.pfrTrajectory=pfrTrajectory;window.pfrProfile=pfrProfile;
})();
