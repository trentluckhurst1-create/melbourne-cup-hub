let cupSilksData=null;let cupSilksPromise=null;
function loadCupSilks(){if(cupSilksPromise)return cupSilksPromise;cupSilksPromise=fetch('./data/silks/2026-09-13.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{cupSilksData=d;return d}).catch(()=>null);return cupSilksPromise;}
function silkRec(name){return cupSilksData?.horses?.[name]||null;}
function silkIcon(name,size='sm'){
 const r=silkRec(name);const cls=`silk-icon silk-${size} ${r?.status==='verified'?'verified':'researching'} ${r?.pattern||''}`;
 if(!r)return `<span class="${cls}" title="Silks researching"><i class="silk-body"></i><i class="silk-left"></i><i class="silk-right"></i><i class="silk-cap"></i></span>`;
 return `<span class="${cls}" title="${r.colours}" style="--silk-body:${r.body};--silk-sleeves:${r.sleeves||r.body};--silk-cap:${r.cap||r.body}"><i class="silk-body"></i><i class="silk-left"></i><i class="silk-right"></i><i class="silk-cap"></i></span>`;
}
function silkHorse(name){return `<span class="silk-horse">${silkIcon(name)}<span>${horseLink(name)}</span></span>`;}
function silksView(){const horses=cupData?.horses||[];const verified=horses.filter(h=>silkRec(h.horse)?.status==='verified').length;return `<div class="section-header"><div><div class="kicker">Owner Racing Colours</div><h2>Silks Registry</h2><div class="section-copy">Exact owner colours are verified horse-by-horse. We do not assign trainer or stable colours where ownership silks are unknown.</div></div></div><section class="metric-grid">${metric('Nominees',horses.length,'Official Cup universe')}${metric('Verified Silks',verified,'Exact colour descriptions sourced')}${metric('Research Queue',horses.length-verified,'Still to verify')}${metric('Rendering','SVG/CSS','Native software silk icons')}${metric('Rule','OWNER','Never inferred from trainer')}</section><div class="panel"><div class="panel-head"><div><h3>101-Horse Silks Board</h3><div class="panel-sub">Verified patterns render immediately; unresolved silks remain visibly queued.</div></div><span class="tag gold">${verified}/101 VERIFIED</span></div><div class="silks-grid">${horses.map(h=>{const r=silkRec(h.horse);return `<article class="silk-card ${r?'verified':'pending'}">${silkIcon(h.horse,'lg')}<div><strong>${horseLink(h.horse)}</strong><span>${r?.colours||'Researching exact owner colours'}</span><em>${r?.source||h.trainer}</em></div></article>`}).join('')}</div></div>`;}
const silksRenderBase=render;
render=function(view='dashboard'){
 if(view==='silks'){document.getElementById('page-title').textContent='Silks & Colours';const root=document.getElementById('app-content');if(!cupSilksData){root.innerHTML='<div class="placeholder">Loading owner silks registry…</div>';loadCupSilks().then(()=>render(view));return;}root.innerHTML=silksView();return;}
 silksRenderBase(view);
};
loadCupSilks();
