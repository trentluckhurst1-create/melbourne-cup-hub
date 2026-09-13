let cupSilksData=null;let cupSilksPromise=null;
const silkBaseHorseLink=horseLink;
async function loadCupSilks(){
 if(cupSilksPromise)return cupSilksPromise;
 cupSilksPromise=Promise.all([
  fetch('./data/silks/2026-09-13.json',{cache:'no-store'}).then(r=>r.ok?r.json():null),
  fetch('./data/silks/2026-09-13-supplement-2.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
  fetch('./data/silks/2026-09-13-supplement-3.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
  fetch('./data/silks/2026-09-13-supplement-4.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
 ]).then(([base,supp2,supp3,supp4])=>{
  if(!base)return null;
  cupSilksData={...base,horses:{...(base.horses||{}),...(supp2?.horses||{}),...(supp3?.horses||{}),...(supp4?.horses||{})}};
  return cupSilksData;
 }).catch(()=>null);
 return cupSilksPromise;
}
function silkRec(name){return cupSilksData?.horses?.[name]||null;}
function silkIcon(name,size='sm'){
 const r=silkRec(name);const state=r?.status||'researching';const cls=`silk-icon silk-${size} ${state} ${r?.pattern||''}`;
 if(!r)return `<span class="${cls}" title="Silks researching"><i class="silk-body"></i><i class="silk-left"></i><i class="silk-right"></i><i class="silk-cap"></i></span>`;
 return `<span class="${cls}" title="${r.colours}" style="--silk-body:${r.body};--silk-sleeves:${r.sleeves||r.body};--silk-cap:${r.cap||r.body}"><i class="silk-body"></i><i class="silk-left"></i><i class="silk-right"></i><i class="silk-cap"></i></span>`;
}
function silkHorse(name){return `<span class="silk-horse">${silkIcon(name)}<span>${silkBaseHorseLink(name)}</span></span>`;}
horseLink=function(name){return silkHorse(name);};
function silksView(){const horses=cupData?.horses||[];const exact=horses.filter(h=>silkRec(h.horse)?.status==='exact').length;const partial=horses.filter(h=>silkRec(h.horse)?.status==='partial').length;const unresolved=horses.length-exact-partial;return `<div class="section-header"><div><div class="kicker">Owner Racing Colours</div><h2>Silks Registry</h2><div class="section-copy">Exact owner colours are verified horse-by-horse. Partial means the ownership/colour family is sourced but the complete registered pattern still needs transcription. No trainer colours are inferred.</div></div></div><section class="metric-grid">${metric('Nominees',horses.length,'Official Cup universe')}${metric('Exact Silks',exact,'Full racing-colour descriptions')}${metric('Partial',partial,'Sourced, pattern incomplete')}${metric('Research Queue',unresolved,'Still to verify')}${metric('Rule','OWNER','Never inferred from trainer')}</section><div class="panel"><div class="panel-head"><div><h3>101-Horse Silks Board</h3><div class="panel-sub">Silks now render beside horse names throughout the Hub. Exact, partial and researching states remain explicit.</div></div><span class="tag gold">${exact} EXACT · ${partial} PARTIAL</span></div><div class="silks-grid">${horses.map(h=>{const r=silkRec(h.horse);return `<article class="silk-card ${r?.status||'pending'}">${silkIcon(h.horse,'lg')}<div><strong>${silkBaseHorseLink(h.horse)}</strong><span>${r?.colours||'Researching exact owner colours'}</span><em>${r?.source||h.trainer}</em></div></article>`}).join('')}</div></div>`;}
const silksRenderBase=render;
render=function(view='dashboard'){
 if(view==='silks'){document.getElementById('page-title').textContent='Silks & Colours';const root=document.getElementById('app-content');if(!cupSilksData){root.innerHTML='<div class="placeholder">Loading owner silks registry…</div>';loadCupSilks().then(()=>render(view));return;}root.innerHTML=silksView();return;}
 silksRenderBase(view);
};
loadCupSilks().then(()=>{if(typeof currentView!=='undefined')render(currentView);});
