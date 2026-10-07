(function(){
'use strict';
if(window.__YARDIVO_MASTER_SINGLE_EDITOR_V12__)return;
window.__YARDIVO_MASTER_SINGLE_EDITOR_V12__=true;

function masterEditing(){
  const a=document.activeElement;
  return !!a?.closest?.('#yardivoStableMasterEditorV583')&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName||'');
}
function removeDuplicate(){
  if(masterEditing())return;
  const old=document.getElementById('yardivoMasterFoundationV583');
  if(old)old.remove();

  const pane=document.getElementById('yardivoSettingsMasterPaneV583');
  const keep=document.getElementById('yardivoStableMasterEditorV583');
  if(pane&&keep&&keep.parentElement!==pane)pane.appendChild(keep);
}

let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  queueMicrotask(()=>{
    queued=false;
    removeDuplicate();
  });
}

const mo=new MutationObserver(schedule);
function boot(){
  removeDuplicate();
  if(document.body)mo.observe(document.body,{subtree:true,childList:true});
}
['yardivo:view-opened','yardivo:master-data-changed','yardivo:data-synced']
  .forEach(ev=>window.addEventListener(ev,schedule));

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

window.YardivoMasterSingleEditorV12={apply:removeDuplicate};
})();
