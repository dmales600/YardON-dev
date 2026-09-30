(()=>{'use strict';
if(window.__YARDIVO_QR_ADMIN_VISIBLE_V584__)return;
window.__YARDIVO_QR_ADMIN_VISIBLE_V584__=true;
/* Compatibility shim only. QR Settings authority is YardivoQrRoleControlV586. */
function render(){
 const legacy=document.getElementById('yardivoQrWarehouseAdminPanelV584');
 if(legacy){legacy.dataset.yardonLegacyDuplicate='1';legacy.hidden=true;legacy.style.setProperty('display','none','important')}
 try{window.YardivoQrRoleControlV586?.render?.()}catch(_){}
}
window.yardivoRenderQrWarehouseAdminV584=render;
window.addEventListener('yardivo:login',()=>setTimeout(render,120));
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')setTimeout(render,80)});
})();
