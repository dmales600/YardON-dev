(function(){
'use strict';
const PREFIX='yardivo_manager_access_';
const DEFAULT_SECTIONS=new Set(['dashboard','controlTower','aiOperations','analytics','myYard','suppliers','overview','dailyMap','weeklyMap']);
function norm(r){
  r=String(r||'').toLowerCase().trim();
  if(r==='management'||r==='voditelj')return'manager';
  if(r==='prijam')return'reception';
  if(r==='porta'||r==='portir')return'gate';
  if(r==='zalihe'||r.includes('zalih'))return'inventory';
  return r;
}
function session(){try{return window.currentSession||currentSession||null}catch(_){return window.currentSession||null}}
function access(){
  try{
    const s=session(),u=String(s?.username||s?.user||'').trim().toLowerCase();
    if(!u)return null;
    const raw=localStorage.getItem(PREFIX+u);
    const a=raw?JSON.parse(raw):null;
    return a&&typeof a==='object'?a:null;
  }catch(_){return null}
}
function allowed(section){
  const s=session(),r=norm(s?.role);
  if(r!=='manager')return null; // null = use normal role logic
  if(section==='homeMenu')return true;
  const a=access();
  if(a&&Array.isArray(a.sections)&&a.sections.length){
    return a.sections.includes(String(section||''));
  }
  return DEFAULT_SECTIONS.has(String(section||''));
}
window.YardivoManagerSectionAuthority={allowed,access,norm};
window.yardivoManagerSectionAllowed=allowed;
})();
