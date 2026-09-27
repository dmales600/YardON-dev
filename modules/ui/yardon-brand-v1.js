(()=>{'use strict';
if(window.__YARDON_BRAND_V1__)return;
window.__YARDON_BRAND_V1__=true;
const BRAND='YardOn',VERSION='v1.0',LOGO='assets/yardon-logo.webp';
const SKIP=new Set(['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA']);
const style=document.createElement('style');
style.id='yardon-brand-style-v1';
style.textContent=`
.yardivo-welcome-logo-wrap{display:flex;justify-content:center;align-items:center;margin:0 auto 22px;max-width:min(760px,86vw)}
.yardon-welcome-logo{display:block;width:min(720px,86vw);height:auto;max-height:210px;object-fit:contain;filter:drop-shadow(0 12px 40px rgba(0,174,255,.18))}
.yardon-welcome-title{display:flex;justify-content:center;align-items:baseline;gap:0;flex-wrap:wrap}
.yardon-welcome-prefix,.yardon-white{color:#fff!important}.yardon-blue{color:#0ea5ff!important}
.yardon-topbar-brand{display:flex;align-items:center;justify-content:center;min-width:150px;max-width:220px;padding-right:12px}
.yardon-topbar-brand img{display:block;width:180px;max-width:18vw;height:44px;object-fit:contain;object-position:left center}
.login-logo-combo img,.home-menu-brand img,.studenac-market-logo{display:block;max-width:100%;height:auto;object-fit:contain}
#yardivoSupplierPortal .yardon-supplier-brand{display:flex;align-items:center;justify-content:center;padding:10px 14px}
#yardivoSupplierPortal .yardon-supplier-brand img{width:min(280px,70vw);height:auto;display:block;object-fit:contain}
@media(max-width:700px){.yardon-welcome-logo{width:min(520px,92vw);max-height:150px}.yardon-topbar-brand{min-width:92px;max-width:120px}.yardon-topbar-brand img{width:110px;max-width:25vw;height:34px}}
`;
document.head.appendChild(style);

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
function ensureBrandLogos(){
  const splash=document.getElementById('yardivoWelcomeSplash');
  if(splash&&!splash.querySelector('.yardon-welcome-logo')){
    const old=splash.querySelector('.yardivo-welcome-mark');
    const wrap=document.createElement('div');wrap.className='yardivo-welcome-logo-wrap';
    wrap.innerHTML='<img class="yardon-welcome-logo" src="'+LOGO+'" alt="YardOn Yard Management System">';
    old?.replaceWith(wrap);
  }
  const top=document.querySelector('header.topbar');
  if(top&&!top.querySelector('.yardon-topbar-brand')){
    const d=document.createElement('div');d.className='yardon-topbar-brand';d.setAttribute('aria-label','YardOn');
    d.innerHTML='<img src="'+LOGO+'" alt="YardOn">';
    top.prepend(d);
  }
  const sp=document.getElementById('yardivoSupplierPortal');
  if(sp&&!sp.querySelector('.yardon-supplier-brand')){
    const target=sp.querySelector('.ysp-head,.ysp-header,.ysp-top,.ysp-nav')||sp.firstElementChild;
    if(target){
      const d=document.createElement('div');d.className='yardon-supplier-brand';
      d.innerHTML='<img src="'+LOGO+'" alt="YardOn">';
      target.prepend(d);
    }
  }
}
function apply(){try{patchTree(document);ensureBrandLogos()}catch(e){console.warn('YardOn brand runtime',e)}}
const nativeAlert=window.alert?.bind(window),nativeConfirm=window.confirm?.bind(window),nativePrompt=window.prompt?.bind(window);
if(nativeAlert)window.alert=(message)=>nativeAlert(brandText(message));
if(nativeConfirm)window.confirm=(message)=>nativeConfirm(brandText(message));
if(nativePrompt)window.prompt=(message,defaultValue)=>nativePrompt(brandText(message),defaultValue);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
new MutationObserver(ms=>{
  for(const m of ms){
    if(m.type==='characterData'&&m.target?.parentElement&&!SKIP.has(m.target.parentElement.tagName)){
      const old=m.target.nodeValue||'',next=brandText(old);if(next!==old)m.target.nodeValue=next;
    }
    for(const n of m.addedNodes)if(n.nodeType===1)patchTree(n);else if(n.nodeType===3){const old=n.nodeValue||'',next=brandText(old);if(next!==old)n.nodeValue=next} ensureBrandLogos();
  }
}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.YardOnBrand={name:BRAND,version:VERSION,logo:LOGO,apply};
window.YARDIVO_PRODUCT_NAME=BRAND;
window.YARDIVO_PRODUCT_VERSION=VERSION;
})();