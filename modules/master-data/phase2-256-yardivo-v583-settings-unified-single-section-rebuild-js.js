(()=>{'use strict';
/* Compatibility shim: the former unified renderer physically moved Settings panels on
   every sync. Admin Control Center now owns ordering/visibility without moving DOM nodes. */
function build(){try{window.YardivoSettingsHardFixV583?.refresh?.()}catch(_){} }
function render(){build()}
let timer=0;function schedule(ms=100){clearTimeout(timer);timer=setTimeout(build,ms)}
document.addEventListener('click',e=>{if(e.target?.closest?.('[data-home-target="settings"],[data-view="settings"],[data-target="settings"],#navSettings'))schedule(120)},true);
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')schedule(80)});
window.addEventListener('yardivo:login',()=>schedule(220));
window.YardivoUnifiedSettingsV583={build,render};
})();
