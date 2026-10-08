(function(){
'use strict';
function norm(r){
 r=String(r||'').toLowerCase().trim();
 if(r==='management'||r==='voditelj')return'manager';
 if(r==='prijam')return'reception';
 if(r==='zalihe'||r.includes('zalih'))return'inventory';
 if(r==='porta'||r==='portir')return'gate';
 return r;
}
function apply(){
 // One role/nav owner prevents display:flex vs display:block fights each sync.
 // RoleVisibility owns buttons/cards; notification center owns badge counts.
 return true;
}

window.addEventListener('yardivo:login',()=>setTimeout(apply,60));
window.addEventListener('yardivo:data-synced',()=>setTimeout(apply,60));
window.addEventListener('load',()=>setTimeout(apply,900));
document.addEventListener('click',()=>setTimeout(apply,0),true);
window.YardivoNotificationPolicyUIV583={apply};
})();
