let privateTimeformSession=null;
let privateTfHandle=null;
let privateTfAutoState='checking';

function tfNorm(v){return String(v??'').trim().toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ');}
function tfRuns(rec){return rec?.lastRuns||rec?.runs||rec?.ratedRuns||rec?.performanceRuns||[];}
function tfHorseRec(name){return privateTimeformSession?.horses?.[name]||privateTimeformSession?.horses?.[Object.keys(privateTimeformSession?.horses||{}).find(k=>tfNorm(k)===tfNorm(name))]||null;}
function tfRunMatch(horse,run){
  const rec=tfHorseRec(horse); if(!rec)return null;
  const candidates=tfRuns(rec);
  const exact=candidates.find(x=>String(x.date||'')===String(run.date||'')&&tfNorm(x.track)===tfNorm(run.track)&&tfNorm(x.race)===tfNorm(run.race));
  if(exact)return exact;
  const dateTrack=candidates.find(x=>String(x.date||'')===String(run.date||'')&&tfNorm(x.track)===tfNorm(run.track));
  if(dateTrack)return dateTrack;
  return candidates.find(x=>String(x.date||'')===String(run.date||''))||null;
}
function tfRatingValue(x){for(const k of ['performanceRating','tfr','TFR','rating','timeformRating']) if(Number.isFinite(Number(x?.[k]))) return Number(x[k]);return null;}
function tfTimefigureValue(x){for(const k of ['timefigure','timeFigure','TF','timefig']) if(Number.isFinite(Number(x?.[k]))) return Number(x[k]);return null;}
function tfMasterValue(rec){for(const k of ['currentMasterRating','masterRating','timeformRating','rating']) if(Number.isFinite(Number(rec?.[k]))) return Number(rec[k]);return null;}
function privateTfStats(){const hs=privateTimeformSession?.horses||{};const rows=Object.values(hs);let ratedRuns=0;rows.forEach(r=>ratedRuns+=tfRuns(r).filter(x=>tfRatingValue(x)!==null).length);return {horses:rows.length,masters:rows.filter(r=>tfMasterValue(r)!==null).length,ratedRuns};}

function tfDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open('melbourne-cup-hub-private',1);req.onupgradeneeded=()=>req.result.createObjectStore('files');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function saveTfHandle(handle){try{const db=await tfDb();await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(handle,'timeform-json');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});privateTfHandle=handle;}catch(e){console.warn('Could not remember Timeform file handle',e);}}
async function getTfHandle(){try{const db=await tfDb();return await new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly');const req=tx.objectStore('files').get('timeform-json');req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}catch(e){return null;}}
async function clearTfHandle(){try{const db=await tfDb();await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete('timeform-json');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch(e){}privateTfHandle=null;}
async function parseTfFile(file){const parsed=JSON.parse(await file.text());if(!parsed||typeof parsed!=='object'||!parsed.horses)throw new Error('Expected a JSON object containing horses.');return parsed;}
async function loadTfHandle(handle,{request=false}={}){
  if(!handle)return false;
  let permission='granted';
  try{if(handle.queryPermission)permission=await handle.queryPermission({mode:'read'});if(permission!=='granted'&&request&&handle.requestPermission)permission=await handle.requestPermission({mode:'read'});}catch(e){permission='prompt';}
  if(permission!=='granted')return false;
  const file=await handle.getFile();privateTimeformSession=await parseTfFile(file);privateTfHandle=handle;privateTfAutoState='loaded';return true;
}
async function connectTfFile(){
  try{
    if(privateTfHandle&&await loadTfHandle(privateTfHandle,{request:true})){render(currentView);return;}
    if(window.showOpenFilePicker){
      const [handle]=await window.showOpenFilePicker({id:'melbourne-cup-timeform',multiple:false,startIn:'documents',types:[{description:'Timeform JSON',accept:{'application/json':['.json']}}]});
      await saveTfHandle(handle);await loadTfHandle(handle,{request:true});render(currentView);return;
    }
    document.getElementById('private-tf-file')?.click();
  }catch(err){if(err?.name!=='AbortError')alert(`Could not connect Timeform JSON: ${err.message}`);}
}
async function autoLoadRememberedTf(){
  if(privateTimeformSession)return true;
  privateTfAutoState='checking';
  privateTfHandle=await getTfHandle();
  if(!privateTfHandle){privateTfAutoState='not-connected';return false;}
  try{const ok=await loadTfHandle(privateTfHandle,{request:false});privateTfAutoState=ok?'loaded':'permission-needed';if(ok&&typeof render==='function')render(currentView);return ok;}catch(e){privateTfAutoState='error';return false;}
}

function privateTfControls(){
  const s=privateTfStats();
  const connected=!!privateTfHandle;
  const title=privateTimeformSession?'Timeform data loaded':connected?'Timeform file remembered':'Connect your private Timeform JSON once';
  const sub=privateTimeformSession?`${s.horses} horses · ${s.masters} master ratings · ${s.ratedRuns} rated runs`:connected?'Click Load Timeform if browser permission is needed. Future visits will auto-load when permission remains granted.':'First connection requires browser approval. The file handle is then remembered locally on this device.';
  const button=privateTimeformSession?'Reload Timeform':connected?'Load Timeform':'Connect Timeform';
  return `<div class="private-tf-box"><div><span class="private-tf-kicker">PRIVATE · LOCAL FILE</span><strong>${title}</strong><em>${sub}</em></div><div class="private-tf-actions"><button class="ghost-button private-tf-load" id="private-tf-connect">${button}</button><input id="private-tf-file" type="file" accept="application/json,.json" hidden>${privateTimeformSession||connected?'<button class="ghost-button" id="private-tf-clear">Forget file</button>':''}</div></div>`;
}
function bindPrivateTfControls(){
  const connect=document.getElementById('private-tf-connect');if(connect&&!connect.dataset.bound){connect.dataset.bound='1';connect.onclick=connectTfFile;}
  const input=document.getElementById('private-tf-file');if(input&&!input.dataset.bound){input.dataset.bound='1';input.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{privateTimeformSession=await parseTfFile(f);privateTfAutoState='loaded-session-only';render(currentView);}catch(err){alert(`Could not load private Timeform JSON: ${err.message}`);}});}
  const clear=document.getElementById('private-tf-clear');if(clear)clear.onclick=async()=>{privateTimeformSession=null;await clearTfHandle();closePrivateTfPanel();render(currentView);};
}
function privateTfRunTable(horse,runs){return `<div class="private-tf-run-table"><table class="data-table"><thead><tr><th>Date</th><th>Race</th><th>Track</th><th>Dist.</th><th>Finish</th><th>TFR</th><th>Timefig</th></tr></thead><tbody>${runs.map(r=>{const tr=tfRunMatch(horse,r);const rt=tfRatingValue(tr);const tf=tfTimefigureValue(tr);return `<tr><td>${r.date||'—'}</td><td>${r.race||'—'}</td><td>${r.track||'—'}</td><td>${r.distanceM?`${r.distanceM}m`:'—'}</td><td>${r.finish||'—'}</td><td><button class="tf-rating-link" onclick="openPrivateTfPanel('${horse.replace(/'/g,"\\'")}')">${rt??'—'}</button></td><td class="tf-private-value">${tf??'—'}</td></tr>`}).join('')}</tbody></table></div>`;}
function tfWindowStats(horse){const rec=tfHorseRec(horse);const vals=tfRuns(rec).map(tfRatingValue).filter(Number.isFinite);if(!vals.length)return {count:0,peak:null,avg:null,last:null};return {count:vals.length,peak:Math.max(...vals),avg:(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1),last:vals[0]};}
function closePrivateTfPanel(){document.getElementById('private-tf-modal')?.remove();document.body.classList.remove('tf-modal-open');}
function openPrivateTfPanel(horse){
  if(!privateTimeformSession){connectTfFile();return;}
  const rec=tfHorseRec(horse);const publicRec=formIntelData?.horses?.[horse]||{};const runs=publicRec.runs||[];const master=tfMasterValue(rec);const stats=tfWindowStats(horse);
  const matchedRows=runs.map(r=>{const tr=tfRunMatch(horse,r);return {r,tr,rating:tfRatingValue(tr),timefig:tfTimefigureValue(tr)};});
  const html=`<div class="tf-modal-backdrop" id="private-tf-modal" onclick="if(event.target===this)closePrivateTfPanel()"><section class="tf-modal-panel" role="dialog" aria-modal="true" aria-label="${horse} Timeform ratings"><div class="tf-modal-head"><div><span class="private-tf-kicker">PRIVATE TIMEFORM DETAIL</span><h2>${horse}</h2><p>${rec?'Private Timeform profile loaded':'No private Timeform profile matched'}</p></div><button class="tf-modal-close" onclick="closePrivateTfPanel()" aria-label="Close">×</button></div><div class="tf-modal-metrics"><div><span>MASTER TFR</span><strong>${master??'—'}</strong></div><div><span>LATEST TFR</span><strong>${stats.last??'—'}</strong></div><div><span>PEAK WINDOW</span><strong>${stats.peak??'—'}</strong></div><div><span>AVG WINDOW</span><strong>${stats.avg??'—'}</strong></div><div><span>RATED RUNS</span><strong>${stats.count}</strong></div></div><div class="tf-modal-table"><table class="data-table"><thead><tr><th>Date</th><th>Race</th><th>Track</th><th>Dist.</th><th>Finish</th><th>TFR</th><th>Timefig</th><th>Match</th></tr></thead><tbody>${matchedRows.map(x=>`<tr><td>${x.r.date||'—'}</td><td>${x.r.race||'—'}</td><td>${x.r.track||'—'}</td><td>${x.r.distanceM?`${x.r.distanceM}m`:'—'}</td><td>${x.r.finish||'—'}</td><td class="tf-private-value">${x.rating??'—'}</td><td class="tf-private-value">${x.timefig??'—'}</td><td>${x.tr?'<span class="tf-match-ok">Matched</span>':'<span class="tf-match-miss">No join</span>'}</td></tr>`).join('')}</tbody></table></div></section></div>`;
  closePrivateTfPanel();document.body.insertAdjacentHTML('beforeend',html);document.body.classList.add('tf-modal-open');
}
window.openPrivateTfPanel=openPrivateTfPanel;window.closePrivateTfPanel=closePrivateTfPanel;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePrivateTfPanel();});

const publicTimeformView=timeformView;
timeformView=function(){
  const base=publicTimeformView();if(!privateTimeformSession)return privateTfControls()+base;
  const s=privateTfStats();const board=(cupData?.horses||[]).map(h=>{const rec=tfHorseRec(h.horse);const m=tfMasterValue(rec);const rr=tfRuns(rec).filter(x=>tfRatingValue(x)!==null);const safe=h.horse.replace(/'/g,"\\'");return `<tr class="tf-click-row" onclick="openPrivateTfPanel('${safe}')"><td>${h.nominationNumber}</td><td class="horse"><button class="tf-horse-link" onclick="event.stopPropagation();openPrivateTfPanel('${safe}')">${h.horse}</button></td><td>${h.trainer}</td><td><button class="tf-rating-link" onclick="event.stopPropagation();openPrivateTfPanel('${safe}')">${m??'—'}</button></td><td>${rr.length}</td><td>${rec?tag('Private loaded','green'):'<span class="muted">No private match</span>'}</td></tr>`}).join('');
  return privateTfControls()+`<section class="metric-grid private-tf-metrics">${metric('Private Horses',s.horses,'Loaded this session')}${metric('Master Ratings',s.masters,'Timeform values')}${metric('Rated Runs',s.ratedRuns,'Run-level TFR values')}${metric('File','REMEMBERED','Auto-load on this device')}</section><div class="panel"><div class="panel-head"><div><h3>Private Timeform Rating Board</h3><div class="panel-sub">Click a horse or TFR to open its full private Timeform history.</div></div><span class="tag green">PRIVATE</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Horse</th><th>Trainer</th><th>Master TFR</th><th>Rated Runs</th><th>State</th></tr></thead><tbody>${board}</tbody></table></div></div>`+base;
};

const publicFormGuideView=formGuideView;
formGuideView=function(){
  if(!privateTimeformSession)return privateTfControls()+publicFormGuideView();
  const cards=(cupData?.horses||[]).map(h=>{const r=formIntelData?.horses?.[h.horse]||{};const runs=r.runs||[];const last=runs[0];const rec=tfHorseRec(h.horse);const master=tfMasterValue(rec);const lastTf=last?tfRatingValue(tfRunMatch(h.horse,last)):null;const safe=h.horse.replace(/'/g,"\\'");return `<article class="horse-card private-tf-card"><div class="horse-card-top"><div><div class="horse-number">NOM ${h.nominationNumber}</div><button class="horse-card-name" onclick="openPrivateTfPanel('${safe}')">${h.horse}</button><div class="horse-country">${h.country} · ${h.trainer}</div></div>${rec?tag('TF private','green'):tag('TF unresolved')}</div><div class="horse-card-grid"><div><span>MASTER TFR</span><button class="tf-rating-link tf-rating-large" onclick="openPrivateTfPanel('${safe}')">${master??'—'}</button></div><div><span>LAST RUN TFR</span><button class="tf-rating-link tf-rating-large" onclick="openPrivateTfPanel('${safe}')">${lastTf??'—'}</button></div><div><span>FORM RUNS</span><strong>${runs.length}/8</strong></div><div><span>LAST RUN</span><strong>${last?`${last.finish||'—'} · ${last.track||'—'}`:'Researching'}</strong></div></div>${privateTfRunTable(h.horse,runs)}</article>`}).join('');
  return privateTfControls()+`<div class="section-header"><div><div class="kicker">Private Timeform + Public Form</div><h2>Melbourne Cup Form Guide</h2><div class="section-copy">The connected Timeform file is remembered on this device and automatically reloaded when browser permission allows.</div></div></div><div class="horse-grid private-form-grid">${cards}</div>`;
};

const privateTfRenderBase=render;
render=function(view='dashboard'){closePrivateTfPanel();privateTfRenderBase(view);if(view==='timeform'||view==='form')setTimeout(bindPrivateTfControls,0);};

autoLoadRememberedTf();