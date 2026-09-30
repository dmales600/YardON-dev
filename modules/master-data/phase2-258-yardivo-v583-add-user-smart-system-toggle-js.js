(()=>{'use strict';
const MASTER='yardivo_master_data_registry_v583';
function master(){try{return JSON.parse(localStorage.getItem(MASTER)||'{}')||{}}catch(_){return{}}}
function smartOn(){const s=master().smart||{};return !!s.enabled&&String(s.mode||'').toUpperCase()!=='PAUSED'}
function applySmart(){
 const on=smartOn();document.body.classList.toggle('yardivo-smart-system-off-v583',!on);
 const b=document.getElementById('yardivoUnifiedSmartDbSwitchV583');if(b){b.textContent=on?'ON':'OFF';b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))}
 document.querySelectorAll('[data-view="smart"],[data-target="smart"],[data-home-target="smart"],a[href="#smart"],button[data-page="smart"]').forEach(x=>{x.hidden=!on;if(on)x.style.removeProperty('display');else x.style.setProperty('display','none','important')});
}
/* Account UI is now owned by canonical masterUserAdmin in Admin Control Center.
   Do not create wrappers or reparent yardivoSettingsAdminPaneV583. */
function accounts(){try{window.YardivoAdminUsersServerV583?.render?.()}catch(_){} }
function openExistingCreate(){const panel=document.getElementById('masterUserAdmin');if(!panel)return false;const b=[...panel.querySelectorAll('button')].find(x=>/DODAJ.*KORIS|NOVI.*KORIS|CREATE.*USER/i.test(x.textContent||''));if(b){b.click();return true}return false}
document.addEventListener('click',e=>{if(e.target?.closest?.('#yardivoAddUserRestoredBtnV583')){e.preventDefault();if(!openExistingCreate())alert('Forma za dodavanje korisnika još nije spremna.')}},true);
window.addEventListener('yardivo:login',()=>setTimeout(()=>{accounts();applySmart()},180));
window.addEventListener('yardivo:master-data-changed',()=>setTimeout(applySmart,100));
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')setTimeout(()=>{accounts();applySmart()},100)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(applySmart,250),{once:true});else setTimeout(applySmart,120);
window.YardivoAccountSmartSystemV583={accounts,applySmart};
})();
