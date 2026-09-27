(()=>{'use strict';
if(window.__YARDON_BRAND_V1__)return;
window.__YARDON_BRAND_V1__=true;
const BRAND='YardOn',VERSION='v1.0',LOGO='assets/yardon-logo.webp';
const SKIP=new Set(['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA']);
function brandText(v){
  return String(v??'')
    .replace(/YARDIVO DEV V5\.8\.3/gi,BRAND+' '+VERSION)
    .replace(/YARDIVO DEV/gi,BRAND+' '+VERSION)
    .replace(/YARDIVO™/g,BRAND+'™')
    .replace(/YARDIVO/g,BRAND)
    .replace(/Yardivo/g,BRAND)
    .replace(/\bV5\.8\.3\b/gi,VERSION);
}
function patchElement(el){
  if(!(el instanceof Element))return;
  if(el.tagName==='IMG'){
    const src=el.getAttribute('src')||'';
    if(/assets\/yardivo-logo\.svg(?:\?.*)?$/i.test(src))el.setAttribute('src',LOGO);
  }
  for(const a of ['alt','aria-label','title','placeholder']){
    if(el.hasAttribute?.(a)){
      const old=el.getAttribute(a),next=brandText(old);
      if(next!==old)el.setAttribute(a,next);
    }
  }
}
function patchTree(root=document){
  if(root instanceof Element)patchElement(root);
  const scope=root?.querySelectorAll?root:document;
  scope.querySelectorAll?.('*').forEach(patchElement);
  const walker=document.createTreeWalker(root===document?document.documentElement:root,NodeFilter.SHOW_TEXT);
  let n;
  while((n=walker.nextNode())){
    if(SKIP.has(n.parentElement?.tagName))continue;
    const old=n.nodeValue||'',next=brandText(old);
    if(next!==old)n.nodeValue=next;
  }
  document.title=BRAND+' '+VERSION+' - Yard Management System';
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content',BRAND);
  document.querySelector('meta[name="application-name"]')?.setAttribute('content',BRAND);
}
function apply(){try{patchTree(document)}catch(e){console.warn('YardOn brand runtime',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
new MutationObserver(ms=>{
  for(const m of ms){
    if(m.type==='characterData'&&m.target?.parentElement&&!SKIP.has(m.target.parentElement.tagName)){
      const old=m.target.nodeValue||'',next=brandText(old);if(next!==old)m.target.nodeValue=next;
    }
    for(const n of m.addedNodes)if(n.nodeType===1)patchTree(n);else if(n.nodeType===3){const old=n.nodeValue||'',next=brandText(old);if(next!==old)n.nodeValue=next}
  }
}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.YardOnBrand={name:BRAND,version:VERSION,logo:LOGO,apply};
window.YARDIVO_PRODUCT_NAME=BRAND;
window.YARDIVO_PRODUCT_VERSION=VERSION;
})();