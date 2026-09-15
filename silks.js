let cupSilksData=null;let cupSilksPromise=null;
const silkBaseHorseLink=horseLink;
function silkNameKey(name){return String(name||'').normalize('NFKD').replace(/[’‘`]/g,"'").replace(/[^a-z0-9]/gi,'').toLowerCase();}
async function loadCupSilks(){
 if(cupSilksPromise)return cupSilksPromise;
 const files=['2026-09-13.json','2026-09-13-supplement-2.json','2026-09-13-supplement-3.json','2026-09-13-supplement-4.json','2026-09-13-supplement-5.json','2026-09-13-supplement-6.json','2026-09-15-research-completion.json'];
 cupSilksPromise=Promise.all(files.map(f=>fetch(`./data/silks/${f}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null))).then(parts=>{
  const base=parts[0];if(!base)return null;
  const horses=Object.assign({},...parts.filter(Boolean).map(p=>p.horses||{}));
  const aliases={};Object.entries(horses).forEach(([name,rec])=>aliases[silkNameKey(name)]=rec);
  cupSilksData={...base,horses,_aliases:aliases};return cupSilksData;
 }).catch(()=>null);
 return cupSilksPromise;
}
function silkRec(name){return cupSilksData?.horses?.[name]||cupSilksData?._aliases?.[silkNameKey(name)]||null;}
function silkIcon(name,size='sm'){
 const r=silkRec(name);const state=r?.status||'researching';const cls=`silk-icon silk-${size} ${state} ${r?.pattern||''}`;
 if(!r)return `<span class="${cls}" title="Silks researching"><i class="silk-body"></i><i class="silk-left"></i><i class="silk-right"></i><i class="silk-cap"></i></span>`;
 return `<span class="${cls}" title="${r.colours}" style="--silk-body:${r.body};--silk-sleeves:${r.sleeves||r.body};--silk-cap:${r.cap||r.body}"><i class="silk-body"></i><i class="silk-left"></i><i class="silk-right"></i><i class="silk-cap"></i></span>`;
}
function silkHorse(name){return `<span class="silk-horse">${silkIcon(name)}<span>${silkBaseHorseLink(name)}</span></span>`;}
horseLink=function(name){return silkHorse(name);};
function silksView(){const horses=cupData?.horses||[];const exact=horses.filter(h=>silkRec(h.horse)?.status==='exact').length;const partial=horses.filter(h=>silkRec(h.horse)?.status==='partial').length;const unresolved=horses.length-exact-partial;return `<div class="section-header"><div><h2>Silks & Colours</h2></div></div><section class="metric-grid">${metric('Nominees',horses.length,'Official Cup universe')}${metric('Exact',exact,'Verified descriptions')}${metric('Partial',partial,'Pattern pending')}${metric('Researching',unresolved,'Still to verify')}</section><div class="panel"><div class="panel-head"><h3>101-Horse Silks Board</h3><span class="tag gold">${exact} EXACT · ${partial} PARTIAL</span></div><div class="silks-grid">${horses.map(h=>{const r=silkRec(h.horse);return `<article class="silk-card ${r?.status||'pending'}">${silkIcon(h.horse,'lg')}<div><strong>${silkBaseHorseLink(h.horse)}</strong><span>${r?.colours||'Researching'}</span></div></article>`}).join('')}</div></div>`;}
const silksRenderBase=render;
render=function(view='dashboard'){
 if(view==='silks'){document.getElementById('page-title').textContent='Silks & Colours';const root=document.getElementById('app-content');if(!cupSilksData){root.innerHTML='<div class="placeholder">Loading…</div>';loadCupSilks().then(()=>render(view));return;}root.innerHTML=silksView();return;}
 silksRenderBase(view);
};
loadCupSilks().then(()=>{if(typeof currentView!=='undefined')render(currentView);});