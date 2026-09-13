import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const publicFiles=[
  'data/form/2026-09-13-form-index.json',
  'data/form/2026-09-13-form-supplement-2.json',
  'data/form/2026-09-13-form-supplement-3.json'
];
const privateTimeformPath=path.join(root,'data/timeform/private/2026-09-13.json');
const outputPath=path.join(root,'data/timeform/private/2026-09-13-form-ratings-joined.json');

function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
function normaliseText(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function runKey(r){return `${r.date||''}|${normaliseText(r.track)}|${normaliseText(r.race)}`;}
function softRunKey(r){return `${r.date||''}|${normaliseText(r.track)}`;}

if(!fs.existsSync(privateTimeformPath)){
  console.error(`Missing private Timeform snapshot: ${privateTimeformPath}`);
  process.exit(2);
}

const publicMerged={snapshotDate:'2026-09-13',horses:{},targetRunsPerHorse:8};
for(const rel of publicFiles){
  const p=path.join(root,rel);
  if(!fs.existsSync(p))continue;
  const d=readJson(p);
  for(const [horse,rec] of Object.entries(d.horses||{})){
    const dst=publicMerged.horses[horse]||{runs:[]};
    const byKey=new Map(dst.runs.map(x=>[runKey(x),x]));
    for(const r of rec.runs||[])byKey.set(runKey(r),r);
    dst.runs=[...byKey.values()].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8);
    publicMerged.horses[horse]={...dst,...rec,runs:dst.runs};
  }
}

const tf=readJson(privateTimeformPath);
const out={
  snapshotDate:'2026-09-13',
  source:'Timeform + public factual form',
  access:'PRIVATE - authorised subscriber analysis only',
  publishToPublicSite:false,
  horses:{},
  audit:{matchedRuns:0,unmatchedTimeformRuns:0,horsesWithRatings:0,horsesWithoutRatings:0}
};

for(const [horse,tfRec] of Object.entries(tf.horses||{})){
  const publicRec=publicMerged.horses[horse]||{runs:[]};
  const publicExact=new Map((publicRec.runs||[]).map(r=>[runKey(r),r]));
  const publicSoft=new Map((publicRec.runs||[]).map(r=>[softRunKey(r),r]));
  const tfRuns=(tfRec.lastRuns||tfRec.runs||[]).slice(0,8);
  const joined=[];
  for(const tr of tfRuns){
    const base=publicExact.get(runKey(tr))||publicSoft.get(softRunKey(tr))||{};
    const row={
      date:tr.date||base.date||null,
      race:base.race||tr.race||null,
      track:base.track||tr.track||null,
      country:base.country||tr.country||null,
      distanceM:base.distanceM||tr.distanceM||tr.distance||null,
      going:base.going||tr.going||null,
      classGroup:base.classGroup||tr.classGroup||tr.class||null,
      finish:base.finish||tr.finish||null,
      fieldSize:base.fieldSize??tr.fieldSize??null,
      weightCarried:base.weightCarried||tr.weight||tr.weightCarried||null,
      performanceRating:Number.isFinite(tr.performanceRating)?tr.performanceRating:(Number.isFinite(tr.tfr)?tr.tfr:null),
      timefigure:Number.isFinite(tr.timefigure)?tr.timefigure:null,
      publicFormSource:base.source||null,
      timeformSource:'Timeform authorised subscriber data'
    };
    if(row.performanceRating!==null||row.timefigure!==null)out.audit.matchedRuns++;
    else out.audit.unmatchedTimeformRuns++;
    joined.push(row);
  }
  const has=joined.some(r=>r.performanceRating!==null||r.timefigure!==null);
  if(has)out.audit.horsesWithRatings++;else out.audit.horsesWithoutRatings++;
  out.horses[horse]={
    matched:!!tfRec.matched,
    matchStatus:tfRec.matchStatus||null,
    currentMasterRating:Number.isFinite(tfRec.currentMasterRating)?tfRec.currentMasterRating:null,
    ratingAsOf:tfRec.ratingAsOf||null,
    runs:joined,
    ratedRunsCount:joined.filter(r=>r.performanceRating!==null).length
  };
}

fs.mkdirSync(path.dirname(outputPath),{recursive:true});
fs.writeFileSync(outputPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({outputPath,audit:out.audit},null,2));
