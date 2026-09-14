// Public factual form rating layer.
// This is NOT Timeform and never populates Timeform fields.
// PFR remains a transparent Hub scale. RAS values below are the best explicitly verified published Racing And Sports values currently available.

const PUBLIC_FORM_RATING_VERSION='PFR-1.3';
const RAS_PUBLIC_PEAKS={
  'Half Yours':122,'Aeliana':123,'Christmas Day':123,'Defiantly':121,'Pierre Bonnard':120,'Enfjaar':119,'Causeway':118,
  'Hopewell Rock':117,'Stinger Glass':117,'Trustyourinstinct':117,'Wine Dark Sea':117,'Starford':116,'Tawny Port':116,
  'Goodie Two Shoes':114,'James J Braddock':114,'Small Fry':113,'Constitution Hill':111,'Omni Man':111,'Kizlyar':109,
  'Amelia Earhart':108,'Highwayman':107,'Nil Bua Gan Dua':108,'Piazza San Marco':104,'Winday':88,
  'Zakouma':109,'Birdman':124,'Middle Earth':119,'Zahrann':115,'Land Legend':115,'King Pedro':110,'Ohope Wins':111,
  'Green Spaces':116,'Light Infantry Man':122,'Litzdeel':108,"She's A Hustler":116,'Royal Supremacy':114,'Vauban':122,
  'Athabascan':113,'Changingoftheguard':118,'River Of Stars':118
};
function publicRasPeak(name){const v=RAS_PUBLIC_PEAKS[name];return Number.isFinite(v)?v:null;}

function pfrClassBaseline(run){
  const c=String(run?.classGroup||'').toLowerCase();
  const race=String(run?.race||'').toLowerCase();
  if(c.includes('group 1')||c==='g1'||race.includes('group 1'))return 108;
  if(c.includes('group 2')||c==='g2'||race.includes('group 2'))return 103;
  if(c.includes('group 3')||c==='g3'||race.includes('group 3'))return 99;
  if(c.includes('listed')||race.includes('listed'))return 95;
  const bm=(c.match(/bm\s?(\d+)/i)||race.match(/bm\s?(\d+)/i));
  if(bm){const n=Number(bm[1]);return Math.max(70,Math.min(94,70+(n-60)*0.6));}
  if(c.includes('class 1'))return 92;if(c.includes('class 2'))return 88;if(c.includes('class 3'))return 84;if(c.includes('class 4'))return 80;if(c.includes('class 5'))return 76;
  if(c.includes('handicap'))return 82;if(c.includes('novice'))return 74;if(c.includes('maiden'))return 69;return 82;
}
function pfrFinishNumber(run){const s=String(run?.finish||'').trim().toLowerCase();const m=s.match(/^(\d+)/);return m?Number(m[1]):null;}
function pfrFinishAdjustment(run){const n=pfrFinishNumber(run);if(!n)return -2;if(n===1)return 8;if(n===2)return 5;if(n===3)return 3;if(n===4)return 1;if(n===5)return 0;if(n===6)return -1;if(n===7)return -2;if(n===8)return -3;return Math.max(-8,-3-(n-8)*0.65);}
function pfrFieldAdjustment(run){const n=Number(run?.fieldSize);if(!Number.isFinite(n)||n<=0)return 0;if(n>=18)return 2;if(n>=14)return 1.5;if(n>=10)return 1;if(n<=5)return -1;return 0;}
function pfrMarginAdjustment(run){const raw=run?.margin;if(raw===null||raw===undefined||raw==='')return 0;const m=Number(String(raw).replace(/[^0-9.\-]/g,''));if(!Number.isFinite(m))return 0;const pos=pfrFinishNumber(run);if(pos===1)return Math.min(3,Math.max(0,m)*0.65);return -Math.min(5,Math.max(0,m)*0.35);}
function publicRunRating(run){const score=pfrClassBaseline(run)+pfrFinishAdjustment(run)+pfrFieldAdjustment(run)+pfrMarginAdjustment(run);return Math.round(Math.max(55,Math.min(120,score))*10)/10;}
function publicRatedRuns(name){
  const raw=(typeof publicActualRuns==='function'?publicActualRuns(name):(formIntelData?.horses?.[name]?.runs||[]));
  const seen=new Set();
  return [...raw]
    .sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||'')))
    .filter(r=>{const d=String(r?.date||'').slice(0,10);if(!d||seen.has(d))return false;seen.add(d);return true;})
    .map(r=>({...r,publicRating:publicRunRating(r)}));
}
function publicFormRating(name){
  const runs=publicRatedRuns(name);if(!runs.length)return null;const weights=[0.50,0.30,0.20];const recent=runs.slice(0,3);
  const current=recent.reduce((s,r,i)=>s+r.publicRating*(weights[i]||0),0)/recent.reduce((s,r,i)=>s+(weights[i]||0),0);const peak=Math.max(...runs.map(r=>r.publicRating));
  const staying=runs.filter(r=>Number(r.distanceM)>=2400);const longStay=runs.filter(r=>Number(r.distanceM)>=2800);const stayingPeak=staying.length?Math.max(...staying.map(r=>r.publicRating)):null;const longStayPeak=longStay.length?Math.max(...longStay.map(r=>r.publicRating)):null;
  const older=runs.slice(3,8);const olderAvg=older.length?older.reduce((s,r)=>s+r.publicRating,0)/older.length:null;const trajectory=olderAvg===null?null:current-olderAvg;const latest=runs[0]||null;let trajectoryLabel='Limited data';
  if(trajectory!==null){if(trajectory>=4)trajectoryLabel='Improving';else if(trajectory<=-4)trajectoryLabel='Regressing';else trajectoryLabel='Stable';}
  return {version:PUBLIC_FORM_RATING_VERSION,current:Math.round(current*10)/10,peak:Math.round(peak*10)/10,rasPeak:publicRasPeak(name),stayingPeak:stayingPeak===null?null:Math.round(stayingPeak*10)/10,longStayPeak:longStayPeak===null?null:Math.round(longStayPeak*10)/10,trajectory:trajectory===null?null:Math.round(trajectory*10)/10,trajectoryLabel,runs:runs.length,latest};
}
function publicFormBand(r){if(!r)return 'UNRATED';if(r.current>=108)return 'ELITE';if(r.current>=103)return 'G1/G2';if(r.current>=98)return 'GROUP';if(r.current>=93)return 'LISTED+';if(r.current>=88)return 'STRONG';if(r.current>=82)return 'COMPETITIVE';return 'DEVELOPING';}
function cupOfficialWeight(name){try{if(typeof officialWeightMap!=='function')return null;const rec=officialWeightMap().get(name);return rec&&Number.isFinite(Number(rec.weightKg))?Number(rec.weightKg):null;}catch(e){return null;}}
function cupPublicLens(name){const r=publicFormRating(name);if(!r)return null;const w=typeof weightRec==='function'?weightRec(name):null;const officialKg=cupOfficialWeight(name);const kg=Number.isFinite(officialKg)?officialKg:(w&&Number.isFinite(Number(w.predictedKg))?Number(w.predictedKg):null);let stamina=0;if(r.longStayPeak!==null)stamina=8;else if(r.stayingPeak!==null)stamina=5;const formDepth=Math.min(5,r.runs/8*5);const trend=r.trajectory===null?0:Math.max(-3,Math.min(3,r.trajectory/2));const handicap=kg===null?0:Math.max(-3,Math.min(4,(57-Number(kg))*0.8));const raw=r.current+stamina+formDepth+trend+handicap;return {score:Math.round(raw*10)/10,weightKg:kg,weightState:Number.isFinite(officialKg)?'OFFICIAL':kg!==null?'MODELLED':'PENDING',stamina,formDepth:Math.round(formDepth*10)/10,trend:Math.round(trend*10)/10,handicap:Math.round(handicap*10)/10};}
window.publicRunRating=publicRunRating;window.publicRatedRuns=publicRatedRuns;window.publicFormRating=publicFormRating;window.publicFormBand=publicFormBand;window.publicRasPeak=publicRasPeak;window.cupPublicLens=cupPublicLens;