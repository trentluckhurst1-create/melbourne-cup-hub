// Optional private PFR loader. The private data file is intentionally not part of this repository.
let privatePfrLocalState='checking';
async function autoLoadPrivatePfrLocal(){
  try{
    const response=await fetch('./private/pfr-private.json',{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const parsed=await response.json();
    if(!parsed||typeof parsed!=='object'||!parsed.horses)throw new Error('Expected private PFR JSON containing horses.');
    privateTimeformSession=parsed;
    privateTfAutoState='loaded';
    privatePfrLocalState='loaded';
    if(typeof render==='function')render(currentView);
    return true;
  }catch(err){privatePfrLocalState='offline';return false;}
}
window.privatePfrLocalState=()=>privatePfrLocalState;
window.autoLoadPrivatePfrLocal=autoLoadPrivatePfrLocal;
setTimeout(autoLoadPrivatePfrLocal,0);
