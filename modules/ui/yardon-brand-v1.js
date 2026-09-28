(()=>{'use strict';
if(window.__YARDON_BRAND_V1__)return;
window.__YARDON_BRAND_V1__=true;
const BRAND='YardOn',VERSION='v1.0',LOGO='assets/yardon-logo-transparent.svg?v=20260928c';
let transparentLogoPromise=null;
const SKIP=new Set(['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA']);
const style=document.createElement('style');
style.id='yardon-brand-style-v1';
style.textContent=`
@keyframes yardonBrandPulse{
  0%,100%{opacity:.50;transform:translate3d(-50%,-50%,0) scale(.94)}
  50%{opacity:.92;transform:translate3d(-50%,-50%,0) scale(1.08)}
}
@keyframes yardonLogoBreathe{
  0%,100%{transform:translate3d(0,0,0) scale(1)}
  50%{transform:translate3d(0,0,0) scale(1.012)}
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


#yardivoWelcomeSplash .yardivo-welcome-logo-wrap,
.login-logo-combo,
.yardon-topbar-brand,
.home-menu-brand,
#yardivoSupplierPortal .yardon-supplier-brand{
  position:relative!important;
  isolation:isolate;
}
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap::before,
.login-logo-combo::before{
  content:"";
  position:absolute;
  left:50%;top:50%;
  width:min(760px,82vw);
  aspect-ratio:4.2/1;
  transform:translate3d(-50%,-50%,0);
  border-radius:50%;
  background:radial-gradient(ellipse at center,rgba(0,222,255,.28) 0%,rgba(0,130,255,.15) 42%,rgba(0,70,170,0) 76%);
  filter:none;
  pointer-events:none;
  z-index:-1;
  will-change:transform,opacity;
  animation:yardonBrandPulse 2.4s ease-in-out infinite;
}
.login-logo-combo::before{
  width:min(440px,88vw);
  aspect-ratio:3.8/1;
}

/* YardOn desktop frameless final */
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap,
#yardivoWelcomeSplash .yardon-welcome-logo,
.login-logo-combo,
.login-logo-combo img,
.brand-combo,
.brand-combo img,
.yardon-topbar-brand,
.yardon-topbar-brand img{
  background:transparent!important;
  background-color:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
}
#yardivoWelcomeSplash{
  background:
    radial-gradient(ellipse at 50% 42%,rgba(0,135,220,.22) 0%,rgba(0,76,145,.13) 30%,rgba(2,25,45,0) 62%),
    linear-gradient(180deg,#061827 0%,#03111e 58%,#020c15 100%)!important;
}
#yardivoWelcomeSplash .yardivo-welcome-inner{
  position:relative;
}
#yardivoWelcomeSplash .yardivo-welcome-inner::before{
  content:"";
  position:absolute;
  left:50%;top:36%;
  width:min(980px,84vw);height:min(300px,30vw);
  transform:translate3d(-50%,-50%,0);
  background:radial-gradient(ellipse at center,rgba(0,210,255,.15),rgba(0,112,255,.06) 44%,transparent 72%);
  pointer-events:none;
  z-index:-1;
  animation:yardonBrandPulse 3.2s ease-in-out infinite;
}
.login-overlay{
  background:
    radial-gradient(ellipse at 50% 26%,rgba(0,150,235,.17) 0%,rgba(0,83,155,.08) 36%,rgba(4,18,31,0) 62%),
    #06121e!important;
}
.login-logo-combo{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  width:100%!important;
  padding:0!important;
  margin:0 auto 18px!important;
}
.login-logo-combo::before{
  width:min(560px,76vw)!important;
  opacity:.72;
}
.brand-combo img,.yardon-topbar-brand img{
  object-fit:contain!important;
  object-position:center center!important;
}
#yardivoWelcomeSplash .yardon-split-half{
  background:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
  filter:none!important;
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
  width:clamp(620px,60vw,980px)!important;
  max-width:92vw!important;
  max-height:none!important;
  height:auto!important;
  object-fit:contain!important;
  background:transparent!important;
  mix-blend-mode:normal;
  filter:none;
  transform:translate3d(0,0,0);
  will-change:transform,opacity;
  backface-visibility:hidden;
  animation:yardonLogoBreathe 3.4s ease-in-out infinite;
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
  text-shadow:0 0 10px rgba(0,190,255,.38),0 0 24px rgba(0,120,255,.18);
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
  filter:drop-shadow(0 0 9px rgba(0,190,255,.25));
  animation:yardonLogoBreathe 2.8s ease-in-out infinite;
  will-change:transform;
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
  filter:drop-shadow(0 0 7px rgba(0,185,255,.22));
  animation:yardonLogoBreathe 3s ease-in-out infinite;
  will-change:transform;
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
  filter:drop-shadow(0 0 7px rgba(0,185,255,.22));
  animation:yardonLogoBreathe 3s ease-in-out infinite;
  will-change:transform;
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
  18%{transform:translate3d(-1vw,0,0) scale(1.08);opacity:1}
  58%{transform:translate3d(-20vw,0,0) scale(1.28);opacity:.96}
  100%{transform:translate3d(-62vw,0,0) scale(1.68);opacity:.04}
}
@keyframes yardonSplitRight{
  0%{transform:translate3d(0,0,0) scale(1.03);opacity:1}
  18%{transform:translate3d(1vw,0,0) scale(1.08);opacity:1}
  58%{transform:translate3d(20vw,0,0) scale(1.28);opacity:.96}
  100%{transform:translate3d(62vw,0,0) scale(1.68);opacity:.04}
}
@keyframes yardonSeamFlash{
  0%{opacity:0;transform:translate3d(-50%,-50%,0) scaleY(.25)}
  30%{opacity:1;transform:translate3d(-50%,-50%,0) scaleY(1)}
  100%{opacity:0;transform:translate3d(-50%,-50%,0) scaleY(1.25)}
}
@keyframes yardonSplashDissolve{
  0%,52%{opacity:1}
  100%{opacity:0}
}
#yardivoWelcomeSplash.yardon-split-reveal{
  perspective:1400px!important;
  overflow:hidden!important;
  background:transparent!important;
}
#yardivoWelcomeSplash.yardon-split-reveal::after{
  content:"";
  position:absolute;inset:0;
  background:rgba(0,12,25,.72);
  pointer-events:none;
  z-index:1;
  opacity:1;
  animation:yardonSplashDissolve 3.15s ease forwards!important;
  will-change:opacity;
}
#yardivoWelcomeSplash.yardon-split-reveal .yardivo-welcome-inner{
  visibility:hidden!important;
}
#yardivoWelcomeSplash .yardon-split-stage{
  position:absolute!important;
  inset:0!important;
  z-index:6!important;
  display:grid!important;
  place-items:center!important;
  pointer-events:none!important;
}
#yardivoWelcomeSplash .yardon-split-stage::before{
  content:"";
  position:absolute;
  left:50%;top:50%;
  width:min(920px,96vw);
  aspect-ratio:4/1;
  transform:translate3d(-50%,-50%,0);
  border-radius:50%;
  background:radial-gradient(ellipse at center,rgba(0,205,255,.38) 0%,rgba(0,118,255,.16) 40%,rgba(0,70,170,0) 74%);
  opacity:.88;
  will-change:opacity,transform;
  animation:yardonBrandPulse 2.6s ease-in-out infinite;
}
#yardivoWelcomeSplash .yardon-split-stage::after{
  content:"";
  position:absolute;
  left:50%;top:50%;
  width:2px;height:min(380px,46vh);
  transform:translate3d(-50%,-50%,0);
  background:linear-gradient(180deg,rgba(0,210,255,0),rgba(105,235,255,.95),rgba(0,150,255,.88),rgba(0,210,255,0));
  box-shadow:0 0 12px rgba(0,220,255,.88),0 0 34px rgba(0,135,255,.62);
  opacity:0;
  will-change:transform,opacity;
  animation:yardonSeamFlash .62s ease-out forwards;
}
#yardivoWelcomeSplash .yardon-split-half{
  position:absolute!important;
  width:clamp(560px,57vw,900px)!important;
  max-width:92vw!important;
  height:auto!important;
  object-fit:contain!important;
  filter:none;
  will-change:transform,opacity;
  backface-visibility:hidden;
}
#yardivoWelcomeSplash .yardon-split-half.left{
  clip-path:inset(0 50% 0 0);
  animation:yardonSplitLeft 3.15s cubic-bezier(.14,.76,.16,1) forwards!important;
}
#yardivoWelcomeSplash .yardon-split-half.right{
  clip-path:inset(0 0 0 50%);
  animation:yardonSplitRight 3.15s cubic-bezier(.14,.76,.16,1) forwards!important;
}
.login-screen.yardon-login-arrive,
.login-overlay.yardon-login-arrive,
#loginScreen.yardon-login-arrive,
#loginOverlay.yardon-login-arrive,
#login.yardon-login-arrive,
[data-login-screen].yardon-login-arrive{
  transform:perspective(1200px) translateZ(-720px) scale(.42)!important;
  opacity:0!important;
  transition:transform 2.65s cubic-bezier(.12,.82,.16,1),opacity 1.35s ease!important;
  will-change:transform,opacity;
  backface-visibility:hidden;
}
.login-screen.yardon-login-arrive.yardon-login-arrive-active,
.login-overlay.yardon-login-arrive.yardon-login-arrive-active,
#loginScreen.yardon-login-arrive.yardon-login-arrive-active,
#loginOverlay.yardon-login-arrive.yardon-login-arrive-active,
#login.yardon-login-arrive.yardon-login-arrive-active,
[data-login-screen].yardon-login-arrive.yardon-login-arrive-active{
  transform:perspective(1200px) translateZ(0) scale(1)!important;
  opacity:1!important;
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
  window.__yardonTransparentLogo=LOGO;
  return Promise.resolve(LOGO);
}
function prepareLogo(el){
  if(!(el instanceof HTMLImageElement))return;
  el.src=LOGO;
  el.dataset.yardonPrepared='1';
  el.dataset.yardonRuntimeLogo='1';
  el.style.setProperty('display','block','important');
  el.style.setProperty('visibility','visible','important');
  el.style.setProperty('opacity','1','important');
  el.style.setProperty('background','transparent','important');
  el.style.setProperty('border','0','important');
  el.style.setProperty('outline','0','important');
  el.style.setProperty('box-shadow','none','important');
  el.style.setProperty('filter','none','important');
  el.style.setProperty('mix-blend-mode','normal','important');
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
      el.style.setProperty('mix-blend-mode','normal','important');
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