(()=>{'use strict';
if(window.__YARDON_BRAND_V1__)return;
window.__YARDON_BRAND_V1__=true;
const BRAND='YardOn',VERSION='v1.0',LOGO='assets/yardon-logo.webp';
let transparentLogoPromise=null;
const SKIP=new Set(['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA']);
const style=document.createElement('style');
style.id='yardon-brand-style-v1';
style.textContent=`
@keyframes yardonBrandPulse{
  0%,100%{filter:drop-shadow(0 0 9px rgba(0,183,255,.34)) drop-shadow(0 0 24px rgba(0,146,255,.22));}
  50%{filter:drop-shadow(0 0 16px rgba(0,218,255,.72)) drop-shadow(0 0 38px rgba(0,144,255,.48)) drop-shadow(0 0 68px rgba(0,95,255,.30));}
}
@keyframes yardonTextPulse{
  0%,100%{text-shadow:0 0 8px rgba(0,174,255,.20),0 0 20px rgba(0,120,255,.12);}
  50%{text-shadow:0 0 12px rgba(0,215,255,.68),0 0 30px rgba(0,145,255,.48),0 0 54px rgba(0,90,255,.28);}
}
@keyframes yardonBarPulse{
  0%,100%{box-shadow:0 0 8px rgba(0,174,255,.30),0 0 18px rgba(0,120,255,.18);}
  50%{box-shadow:0 0 14px rgba(0,210,255,.70),0 0 30px rgba(0,130,255,.42);}
}


@keyframes yardonLoginZoom{
  0%{opacity:0;transform:scale(.42);filter:drop-shadow(0 0 8px rgba(0,183,255,.28)) drop-shadow(0 0 18px rgba(0,120,255,.18));}
  18%{opacity:1;transform:scale(.72);}
  64%{opacity:1;transform:scale(1.28);filter:drop-shadow(0 0 24px rgba(0,220,255,.88)) drop-shadow(0 0 58px rgba(0,135,255,.58)) drop-shadow(0 0 100px rgba(0,80,255,.32));}
  100%{opacity:0;transform:scale(2.15);filter:drop-shadow(0 0 34px rgba(0,220,255,.22)) drop-shadow(0 0 90px rgba(0,110,255,.12));}
}
#yardonLoginTransition{
  position:fixed!important;
  inset:0!important;
  z-index:2147483646!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  pointer-events:none!important;
  overflow:hidden!important;
  background:radial-gradient(circle at center,rgba(0,83,145,.34) 0%,rgba(0,24,46,.90) 40%,rgba(0,8,17,.99) 100%)!important;
  opacity:1;
}
#yardonLoginTransition img{
  width:min(1120px,88vw)!important;
  max-width:88vw!important;
  height:auto!important;
  display:block!important;
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
  animation:yardonLoginZoom 1s cubic-bezier(.2,.7,.2,1) forwards!important;
  transform-origin:center center!important;
}

/* Canonical YardOn transparent logo treatment. */
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap,
.login-logo-combo,
.brand-combo,
.home-menu-brand,
.yardon-topbar-brand,
#yardivoSupplierPortal .yardon-supplier-brand,
.yardon-role-brand,
.yardon-role-brand-wrap,
[data-yardon-brand],
[class*="logo"][data-yardon-runtime-logo="1"]{
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
}

#yardivoWelcomeSplash .yardivo-welcome-inner{
  width:min(1120px,94vw)!important;
  max-width:none!important;
}

#yardivoWelcomeSplash .yardivo-welcome-logo-wrap{
  display:flex!important;
  justify-content:center!important;
  align-items:center!important;
  margin:0 auto 16px!important;
  max-width:none!important;
  width:100%!important;
}

#yardivoWelcomeSplash .yardon-welcome-logo{
  display:block!important;
  width:clamp(560px,57vw,900px)!important;
  max-width:92vw!important;
  max-height:none!important;
  height:auto!important;
  object-fit:contain!important;
  background:transparent!important;
  mix-blend-mode:normal;
  filter:drop-shadow(0 0 14px rgba(0,190,255,.42)) drop-shadow(0 0 34px rgba(0,120,255,.24));
  transform:translate3d(0,0,0);
  will-change:transform,opacity;
  backface-visibility:hidden;
}

#yardivoWelcomeSplash .yardon-welcome-title{
  display:flex!important;
  justify-content:center!important;
  align-items:baseline!important;
  flex-wrap:nowrap!important;
  gap:0!important;
  margin:2px 0 10px!important;
  font-size:clamp(34px,3.2vw,58px)!important;
  line-height:1.08!important;
  letter-spacing:.015em!important;
  white-space:nowrap!important;
  text-transform:uppercase!important;
}

#yardivoWelcomeSplash .yardon-welcome-prefix,
#yardivoWelcomeSplash .yardon-white{
  color:#fff!important;
  font-weight:900!important;
}

#yardivoWelcomeSplash .yardon-welcome-prefix{
  margin-right:.27em!important;
}

#yardivoWelcomeSplash .yardon-blue{
  color:#09b8ff!important;
  font-weight:900!important;
  animation:yardonTextPulse 2.05s ease-in-out infinite;
}

#yardivoWelcomeSplash .yardivo-welcome-sub{
  text-transform:uppercase!important;
  letter-spacing:.20em!important;
  color:rgba(220,235,250,.84)!important;
}

#yardivoWelcomeSplash .yardivo-welcome-progress i{
  width:100%!important;
  transform:scaleX(0);
  transform-origin:left center;
  will-change:transform;
  background:linear-gradient(90deg,#19c8ff 0%,#1676ff 100%)!important;
  box-shadow:0 0 12px rgba(0,190,255,.48);
}

.login-logo-combo{
  display:flex!important;
  justify-content:center!important;
  align-items:center!important;
  margin:-4px auto 24px!important;
  padding:0!important;
  width:100%!important;
  overflow:visible!important;
}

.login-logo-combo img{
  display:block!important;
  width:clamp(310px,31vw,470px)!important;
  max-width:96%!important;
  height:auto!important;
  object-fit:contain!important;
  background:transparent!important;
  mix-blend-mode:normal;
  animation:yardonBrandPulse 2.15s ease-in-out infinite;
}

.login-card{
  overflow:visible!important;
}

.yardon-topbar-brand{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  min-width:170px!important;
  max-width:235px!important;
  padding-right:12px!important;
  background:transparent!important;
}

.yardon-topbar-brand img,
.home-menu-brand img,
.studenac-market-logo,
#yardivoSupplierPortal .yardon-supplier-brand img{
  background:transparent!important;
  mix-blend-mode:normal;
  animation:yardonBrandPulse 2.35s ease-in-out infinite;
}

.yardon-topbar-brand img{
  display:block!important;
  width:205px!important;
  max-width:20vw!important;
  height:48px!important;
  object-fit:contain!important;
  object-position:left center!important;
}

.home-menu-brand img{
  display:block!important;
  width:min(520px,76vw)!important;
  max-width:100%!important;
  height:auto!important;
  object-fit:contain!important;
}

.studenac-market-logo{
  display:block!important;
  width:100%!important;
  max-width:260px!important;
  height:auto!important;
  object-fit:contain!important;
}

#yardivoSupplierPortal .yardon-supplier-brand{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  padding:8px 12px!important;
}

#yardivoSupplierPortal .yardon-supplier-brand img,
.yardon-role-brand img,
.yardon-role-brand-wrap img,
img[data-yardon-runtime-logo="1"]{
  width:min(330px,74vw)!important;
  height:auto!important;
  display:block!important;
  object-fit:contain!important;
  background:transparent!important;
  mix-blend-mode:normal;
  animation:yardonBrandPulse 2.25s ease-in-out infinite;
}


@keyframes yardonWelcomeFinalZoom{
  0%{transform:translate3d(0,0,0) scale(1);opacity:1}
  72%{transform:translate3d(0,0,0) scale(2.15);opacity:1}
  100%{transform:translate3d(0,0,0) scale(3.05);opacity:0}
}
@keyframes yardonWelcomeFadeOut{
  to{opacity:0;transform:translate3d(0,10px,0)}
}
#yardivoWelcomeSplash.yardon-final-zoom{
  overflow:hidden!important;
}
#yardivoWelcomeSplash.yardon-final-zoom .yardon-welcome-logo{
  animation:yardonWelcomeFinalZoom 2s cubic-bezier(.18,.72,.16,1) forwards!important;
}
#yardivoWelcomeSplash.yardon-final-zoom .yardon-welcome-title,
#yardivoWelcomeSplash.yardon-final-zoom .yardivo-welcome-sub,
#yardivoWelcomeSplash.yardon-final-zoom .yardivo-welcome-copy,
#yardivoWelcomeSplash.yardon-final-zoom .yardivo-welcome-progress,
#yardivoWelcomeSplash.yardon-final-zoom .yardivo-welcome-meta,
#yardivoWelcomeSplash.yardon-final-zoom .yardivo-welcome-foot{
  animation:yardonWelcomeFadeOut .28s ease forwards!important;
  pointer-events:none;
}


@keyframes yardonSplitLeft{
  0%{transform:translate3d(0,0,0) scale(1.03);opacity:1}
  22%{transform:translate3d(-2vw,0,0) scale(1.10);opacity:1}
  100%{transform:translate3d(-58vw,0,0) scale(1.72);opacity:.08}
}
@keyframes yardonSplitRight{
  0%{transform:translate3d(0,0,0) scale(1.03);opacity:1}
  22%{transform:translate3d(2vw,0,0) scale(1.10);opacity:1}
  100%{transform:translate3d(58vw,0,0) scale(1.72);opacity:.08}
}
@keyframes yardonSplashDissolve{
  0%,58%{background-color:rgba(0,12,25,.98)}
  100%{background-color:rgba(0,12,25,0)}
}
#yardivoWelcomeSplash.yardon-split-reveal{
  perspective:1400px!important;
  overflow:hidden!important;
  animation:yardonSplashDissolve 2s ease forwards!important;
}
#yardivoWelcomeSplash.yardon-split-reveal .yardivo-welcome-inner{
  visibility:hidden!important;
}
#yardivoWelcomeSplash .yardon-split-stage{
  position:absolute!important;
  inset:0!important;
  z-index:5!important;
  display:grid!important;
  place-items:center!important;
  pointer-events:none!important;
}
#yardivoWelcomeSplash .yardon-split-half{
  position:absolute!important;
  width:clamp(560px,57vw,900px)!important;
  max-width:92vw!important;
  height:auto!important;
  object-fit:contain!important;
  filter:drop-shadow(0 0 18px rgba(0,210,255,.70)) drop-shadow(0 0 44px rgba(0,125,255,.42));
  will-change:transform,opacity;
  backface-visibility:hidden;
}
#yardivoWelcomeSplash .yardon-split-half.left{
  clip-path:inset(0 50% 0 0);
  animation:yardonSplitLeft 2s cubic-bezier(.19,.72,.17,1) forwards!important;
}
#yardivoWelcomeSplash .yardon-split-half.right{
  clip-path:inset(0 0 0 50%);
  animation:yardonSplitRight 2s cubic-bezier(.19,.72,.17,1) forwards!important;
}
.login-screen.yardon-login-arrive,
.login-overlay.yardon-login-arrive,
#loginScreen.yardon-login-arrive,
#loginOverlay.yardon-login-arrive,
#login.yardon-login-arrive,
[data-login-screen].yardon-login-arrive{
  transform:perspective(1200px) translateZ(-720px) scale(.42)!important;
  opacity:0!important;
  filter:blur(10px)!important;
  transition:transform 1.7s cubic-bezier(.17,.79,.19,1),opacity .9s ease,filter 1.35s ease!important;
  will-change:transform,opacity,filter;
}
.login-screen.yardon-login-arrive.yardon-login-arrive-active,
.login-overlay.yardon-login-arrive.yardon-login-arrive-active,
#loginScreen.yardon-login-arrive.yardon-login-arrive-active,
#loginOverlay.yardon-login-arrive.yardon-login-arrive-active,
#login.yardon-login-arrive.yardon-login-arrive-active,
[data-login-screen].yardon-login-arrive.yardon-login-arrive-active{
  transform:perspective(1200px) translateZ(0) scale(1)!important;
  opacity:1!important;
  filter:blur(0)!important;
}

@media(max-width:700px){
  #yardivoWelcomeSplash .yardon-welcome-logo{width:min(92vw,610px)!important;}
  #yardivoWelcomeSplash .yardon-welcome-title{font-size:clamp(26px,7.4vw,42px)!important;}
  .login-logo-combo img{width:min(88vw,390px)!important;}
  .yardon-topbar-brand{min-width:104px!important;max-width:132px!important;}
  .yardon-topbar-brand img{width:122px!important;max-width:30vw!important;height:38px!important;}
}
`
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
function transparentLogo(){
  if(transparentLogoPromise)return transparentLogoPromise;
  transparentLogoPromise=new Promise((resolve,reject)=>{
    const im=new Image();
    im.onload=()=>{
      try{
        const canvas=document.createElement('canvas');
        const sw=im.naturalWidth||im.width,sh=im.naturalHeight||im.height;
        const maxW=1200,scale=Math.min(1,maxW/sw);
        canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(im,0,0,canvas.width,canvas.height);
        const image=ctx.getImageData(0,0,canvas.width,canvas.height),d=image.data;
        for(let i=0;i<d.length;i+=4){
          const m=Math.max(d[i],d[i+1],d[i+2]);
          if(m<=20)d[i+3]=0;
          else if(m<48)d[i+3]=Math.round(d[i+3]*((m-20)/28));
        }
        ctx.putImageData(image,0,0);
        const url=canvas.toDataURL('image/png');
        window.__yardonTransparentLogo=url;
        resolve(url);
      }catch(e){reject(e)}
    };
    im.onerror=reject;
    im.src=LOGO+(LOGO.includes('?')?'&':'?')+'brand=1.0';
  });
  return transparentLogoPromise;
}
async function prepareLogo(el){
  if(!(el instanceof HTMLImageElement)||el.dataset.yardonPrepared==='1'||el.dataset.yardonPreparing==='1')return;
  el.dataset.yardonPreparing='1';
  el.style.setProperty('visibility','hidden','important');
  try{
    const url=await transparentLogo();
    el.src=url;
    el.dataset.yardonPrepared='1';
    el.style.setProperty('mix-blend-mode','normal');
  }catch(_){
    el.src=LOGO;
    el.style.setProperty('mix-blend-mode','screen');
  }finally{
    delete el.dataset.yardonPreparing;
    el.style.removeProperty('visibility');
  }
}
function patchElement(el){
  if(!(el instanceof Element))return;
  if(el.tagName==='IMG'){
    const src=el.getAttribute('src')||'';
    if(/assets\/yardivo-logo\.svg(?:\?.*)?$/i.test(src))el.setAttribute('src',LOGO);
    const now=el.getAttribute('src')||'';
    if(/yardon-logo(?:-transparent(?:-v\d+)?)?\.(?:webp|png|svg)(?:\?.*)?$/i.test(now)||el.dataset.yardonPrepared==='1'){
      prepareLogo(el);
      el.setAttribute('data-yardon-runtime-logo','1');
      el.style.setProperty('background','transparent','important');
      el.style.setProperty('box-shadow','none','important');
      el.style.setProperty('mix-blend-mode','screen');
      el.style.setProperty('animation','yardonBrandPulse 2.25s ease-in-out infinite');
      const host=el.closest('.brand-combo,.home-menu-brand,.yardon-topbar-brand,.login-logo-combo,.yardivo-welcome-logo-wrap,.ysp-head,.ysp-header,.ysp-top,.ysp-nav,.sidebar,.topbar,[class*="brand"],[class*="logo"]');
      if(host){
        host.classList.add('yardon-role-brand-wrap');
        host.style.setProperty('background','transparent','important');
        host.style.setProperty('box-shadow','none','important');
      }
    }
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
  document.querySelectorAll('img[src*="yardon-logo"]').forEach(patchElement);
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
  document.querySelectorAll('.sidebar,.topbar,#homeMenu,[data-role],[data-yardivo-role]').forEach(root=>{
    root.querySelectorAll?.('img[src*="yardon-logo"]').forEach(img=>{
      img.setAttribute('data-yardon-runtime-logo','1');
      img.closest('.brand-combo,.home-menu-brand,.yardon-topbar-brand,[class*="brand"],[class*="logo"]')?.classList.add('yardon-role-brand-wrap');
    });
  });
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

function runLoginTransition(){
  try{
    document.getElementById('yardonLoginTransition')?.remove();
    const overlay=document.createElement('div');
    overlay.id='yardonLoginTransition';
    overlay.setAttribute('aria-hidden','true');
    const img=document.createElement('img');img.alt='';
    img.src=window.__yardonTransparentLogo||LOGO;
    overlay.appendChild(img);
    document.body.appendChild(overlay);
    if(!window.__yardonTransparentLogo)prepareLogo(img);
    setTimeout(()=>overlay.remove(),1050);
  }catch(e){console.warn('YardOn login transition',e)}
}
window.addEventListener('yardivo:login',runLoginTransition);

window.YardOnBrand={name:BRAND,version:VERSION,logo:LOGO,apply,runLoginTransition,transparentLogo};
window.YARDIVO_PRODUCT_NAME=BRAND;
window.YARDIVO_PRODUCT_VERSION=VERSION;
})();