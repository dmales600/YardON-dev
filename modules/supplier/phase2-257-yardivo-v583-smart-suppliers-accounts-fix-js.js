(()=>{'use strict';
const MASTER='yardivo_master_data_registry_v583';
function master(){try{return JSON.parse(localStorage.getItem(MASTER)||'{}')||{}}catch(_){return{}}}
function smartState(){return {...{enabled:false,mode:'PAUSED'},...(master().smart||{})}}
async function saveMaster(m){localStorage.setItem(MASTER,JSON.stringify(m));try{return await Promise.resolve(window.YardivoMasterDataV583?.save?.(m))}catch(e){throw e}}
function ensureSmart(){try{window.YardivoSmartEngineSettingsV583?.render?.()}catch(_){} }
async function toggleSmart(){const m=master(),st=smartState(),on=!!st.enabled&&st.mode!=='PAUSED';m.smart={...st,enabled:!on,mode:!on?'ASSIST':'PAUSED'};m.__masterUpdatedAtV583=new Date().toISOString();try{await saveMaster(m);window.dispatchEvent(new CustomEvent('yardivo:master-data-changed',{detail:{reason:'smart.toggle'}}))}catch(e){console.error(e);alert('YARDIVO SMART nije spremljen u bazu.')}ensureSmart()}
/* Supplier Master and account panels stay with their canonical owners. No Settings DOM moves. */
function ensure(){ensureSmart();try{window.YardivoSettingsHardFixV583?.refresh?.()}catch(_){} }
document.addEventListener('click',e=>{if(e.target?.closest?.('#yardivoUnifiedSmartDbSwitchV583')){e.preventDefault();toggleSmart()}},true);
window.addEventListener('yardivo:login',()=>setTimeout(ensure,180));
window.addEventListener('yardivo:master-data-changed',()=>{
  /* Master CRUD already has a canonical UI owner. Updating SMART state here is
     enough; rebuilding the whole Settings shell would detach active inputs. */
  setTimeout(ensureSmart,100);
});
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')setTimeout(ensure,100)});
window.YardivoSmartSupplierAccountsFixV583={ensure,toggleSmart};
})();
