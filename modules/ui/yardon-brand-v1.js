(()=>{'use strict';
if(window.__YARDON_BRAND_V1__)return;
window.__YARDON_BRAND_V1__=true;
const BRAND='YardOn',VERSION='v1.0',LOGO='assets/yardon-logo-exact.webp?v=20260928-exact1';
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
  0%,100%{transform:translate3d(0,0,0);opacity:.97}
  50%{transform:translate3d(0,0,0);opacity:1}
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
  0%{opacity:0;transform:scale(.42);filter:none!important;}
  18%{opacity:1;transform:scale(.72);}
  64%{opacity:1;transform:scale(1.28);filter:none!important;}
  100%{opacity:0;transform:scale(2.15);filter:none!important;}
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
  filter:none!important;
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
  mix-blend-mode:normal!important;
  filter:none!important;
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
  backface-visibility:hidden;
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
  mix-blend-mode:normal!important;
  filter:none!important;
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
  mix-blend-mode:normal!important;
  filter:none!important;
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
  mix-blend-mode:normal!important;
  filter:none!important;
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
  animation:yardonSplashDissolve 1.8s cubic-bezier(.18,.72,.16,1) forwards!important;
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
  transform:translateZ(0)!important;
  backface-visibility:hidden!important;
}
#yardivoWelcomeSplash .yardon-split-stage::before{
  content:"";
  position:absolute;
  left:var(--yardon-split-center-x,50%);
  top:var(--yardon-split-center-y,50%);
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
  left:var(--yardon-split-center-x,50%);
  top:var(--yardon-split-center-y,50%);
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
  left:var(--yardon-split-left,50%)!important;
  top:var(--yardon-split-top,50%)!important;
  width:var(--yardon-split-width,clamp(560px,57vw,900px))!important;
  max-width:none!important;
  height:var(--yardon-split-height,auto)!important;
  max-height:none!important;
  margin:0!important;
  object-fit:contain!important;
  filter:none!important;
  will-change:transform,opacity;
  backface-visibility:hidden;
}
#yardivoWelcomeSplash .yardon-welcome-logo.yardon-split-source-hidden{
  visibility:hidden!important;
  opacity:0!important;
  animation:none!important;
}
#yardivoWelcomeSplash .yardon-split-half.left{
  clip-path:inset(0 50% 0 0);
  animation:yardonSplitLeft 1.8s cubic-bezier(.14,.76,.16,1) forwards!important;
}
#yardivoWelcomeSplash .yardon-split-half.right{
  clip-path:inset(0 0 0 50%);
  animation:yardonSplitRight 1.8s cubic-bezier(.14,.76,.16,1) forwards!important;
}
.login-screen.yardon-login-arrive,
.login-overlay.yardon-login-arrive,
#loginScreen.yardon-login-arrive,
#loginOverlay.yardon-login-arrive,
#login.yardon-login-arrive,
[data-login-screen].yardon-login-arrive{
  transform:none!important;
  opacity:0!important;
  transition:opacity .55s ease!important;
  will-change:opacity;
  backface-visibility:hidden;
}
.login-screen.yardon-login-arrive .login-card,
.login-overlay.yardon-login-arrive .login-card,
#loginScreen.yardon-login-arrive .login-card,
#loginOverlay.yardon-login-arrive .login-card,
#login.yardon-login-arrive .login-card,
[data-login-screen].yardon-login-arrive .login-card{
  transform:perspective(1500px) translateZ(-920px) scale(.34)!important;
  opacity:0!important;
  filter:none!important;
  transition:
    transform 1.55s cubic-bezier(.12,.82,.14,1),
    opacity .48s ease-out!important;
  will-change:transform,opacity;
  backface-visibility:hidden;
}
.login-screen.yardon-login-arrive:not(.yardon-login-arrive-active) .login-logo-combo,
.login-overlay.yardon-login-arrive:not(.yardon-login-arrive-active) .login-logo-combo,
#loginScreen.yardon-login-arrive:not(.yardon-login-arrive-active) .login-logo-combo,
#loginOverlay.yardon-login-arrive:not(.yardon-login-arrive-active) .login-logo-combo,
#login.yardon-login-arrive:not(.yardon-login-arrive-active) .login-logo-combo,
[data-login-screen].yardon-login-arrive:not(.yardon-login-arrive-active) .login-logo-combo{
  visibility:hidden!important;
  opacity:0!important;
  animation:none!important;
}
.login-screen.yardon-login-arrive.yardon-login-arrive-active,
.login-overlay.yardon-login-arrive.yardon-login-arrive-active,
#loginScreen.yardon-login-arrive.yardon-login-arrive-active,
#loginOverlay.yardon-login-arrive.yardon-login-arrive-active,
#login.yardon-login-arrive.yardon-login-arrive-active,
[data-login-screen].yardon-login-arrive.yardon-login-arrive-active{
  transform:none!important;
  opacity:1!important;
}
.login-screen.yardon-login-arrive.yardon-login-arrive-active .login-card,
.login-overlay.yardon-login-arrive.yardon-login-arrive-active .login-card,
#loginScreen.yardon-login-arrive.yardon-login-arrive-active .login-card,
#loginOverlay.yardon-login-arrive.yardon-login-arrive-active .login-card,
#login.yardon-login-arrive.yardon-login-arrive-active .login-card,
[data-login-screen].yardon-login-arrive.yardon-login-arrive-active .login-card{
  transform:perspective(1500px) translateZ(0) scale(1)!important;
  opacity:1!important;
  filter:none!important;
}
.login-screen.yardon-login-arrive.yardon-login-arrive-active .login-logo-combo,
.login-overlay.yardon-login-arrive.yardon-login-arrive-active .login-logo-combo,
#loginScreen.yardon-login-arrive.yardon-login-arrive-active .login-logo-combo,
#loginOverlay.yardon-login-arrive.yardon-login-arrive-active .login-logo-combo,
#login.yardon-login-arrive.yardon-login-arrive-active .login-logo-combo,
[data-login-screen].yardon-login-arrive.yardon-login-arrive-active .login-logo-combo{
  visibility:visible!important;
  opacity:1!important;
}


/* YardOn desktop visible frameless render — original logo + screen blend */
#yardivoWelcomeSplash img.yardon-welcome-logo,
.login-logo-combo img,
.brand-combo img,
.yardon-topbar-brand img,
.home-menu-brand img,
.studenac-market-logo,
#yardivoSupplierPortal img[data-yardon-runtime-logo="1"],
img[data-yardon-runtime-logo="1"],
#yardonLoginTransition img,
#yardivoWelcomeSplash .yardon-split-half{
  display:block!important;
  visibility:visible!important;
  opacity:1;
  background:transparent!important;
  background-color:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
  filter:none!important;
  mix-blend-mode:normal!important;
}
#yardivoWelcomeSplash .yardon-welcome-logo{
  width:clamp(620px,60vw,980px)!important;
  height:auto!important;
  margin:0 auto!important;
  object-fit:contain!important;
  object-position:center center!important;
}
.login-logo-combo img{
  width:clamp(360px,34vw,540px)!important;
  height:auto!important;
  margin:0 auto!important;
  object-fit:contain!important;
  object-position:center center!important;
}
#yardivoWelcomeSplash .yardon-split-half{
  mix-blend-mode:normal!important;
}


/* YardOn canonical transparent v3 — user supplied logo, no frame, no blend workaround */
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap,
.login-logo-combo,
.brand-combo,
.home-menu-brand,
.yardon-topbar-brand,
#yardivoSupplierPortal .yardon-supplier-brand{
  background:transparent!important;
  background-color:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
  overflow:visible!important;
}
#yardivoWelcomeSplash img.yardon-welcome-logo,
.login-logo-combo img,
.brand-combo img,
.home-menu-brand img,
.yardon-topbar-brand img,
.studenac-market-logo,
#yardivoSupplierPortal img[data-yardon-runtime-logo="1"],
img[data-yardon-runtime-logo="1"],
#yardonLoginTransition img,
#yardivoWelcomeSplash .yardon-split-half{
  display:block!important;
  visibility:visible!important;
  opacity:1;
  background:transparent!important;
  background-color:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
  mix-blend-mode:normal!important;
  object-fit:contain!important;
  object-position:center center!important;
}
#yardivoWelcomeSplash .yardon-welcome-logo{
  width:clamp(680px,62vw,1040px)!important;
  max-width:94vw!important;
  height:auto!important;
  margin:0 auto!important;
  filter:none!important;
  animation:yardonLogoBreathe 3.4s ease-in-out infinite!important;
}
.login-logo-combo{
  min-height:110px!important;
  margin:0 auto 20px!important;
  padding:0!important;
}
.login-logo-combo img{
  width:clamp(360px,34vw,520px)!important;
  max-width:92%!important;
  height:auto!important;
  margin:0 auto!important;
  filter:none!important;
  animation:yardonLogoBreathe 3.2s ease-in-out infinite!important;
}
#yardivoWelcomeSplash .yardon-split-half{
  width:clamp(680px,62vw,1040px)!important;
  max-width:94vw!important;
  filter:none!important;
}
#yardonLoginTransition img{
  width:min(1120px,88vw)!important;
  filter:none!important;
  mix-blend-mode:normal!important;
}


/* YardOn runtime transparent canonical desktop logo */
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap{
  min-height:190px!important;
  overflow:visible!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
}
#yardivoWelcomeSplash img.yardon-welcome-logo{
  width:clamp(660px,60vw,980px)!important;
  max-width:92vw!important;
  height:auto!important;
  max-height:230px!important;
  object-fit:contain!important;
  object-position:center center!important;
  background:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
}
.login-logo-combo{
  min-height:118px!important;
  overflow:visible!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
}
.login-logo-combo img{
  width:clamp(360px,34vw,520px)!important;
  max-width:92%!important;
  height:auto!important;
  max-height:125px!important;
  object-fit:contain!important;
  object-position:center center!important;
  background:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
}
img[data-yardon-runtime-logo="1"]:not([data-yardon-prepared="1"]){
  mix-blend-mode:normal!important;
}
img[data-yardon-runtime-logo="1"][data-yardon-prepared="1"]{
  mix-blend-mode:normal!important;
}
#yardivoWelcomeSplash .yardon-split-half{
  object-fit:contain!important;
  image-rendering:auto!important;
  mix-blend-mode:normal!important;
  object-position:center center!important;
  background:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
}


/* YardOn final render polish: no login glow rhombus, compositor-stable motion */
.login-logo-combo::before{
  content:none!important;
  display:none!important;
  animation:none!important;
  background:none!important;
  box-shadow:none!important;
  filter:none!important;
}

#yardivoWelcomeSplash .yardon-welcome-logo{
  transform:translate3d(0,0,0);
  backface-visibility:hidden!important;
  -webkit-backface-visibility:hidden!important;
  transform-style:preserve-3d;
}

#yardivoWelcomeSplash .yardon-split-stage,
#yardivoWelcomeSplash .yardon-split-half{
  backface-visibility:hidden!important;
  -webkit-backface-visibility:hidden!important;
  transform-style:preserve-3d;
}

.login-screen.yardon-login-arrive .login-card,
.login-overlay.yardon-login-arrive .login-card,
#loginScreen.yardon-login-arrive .login-card,
#loginOverlay.yardon-login-arrive .login-card,
#login.yardon-login-arrive .login-card,
[data-login-screen].yardon-login-arrive .login-card{
  backface-visibility:hidden!important;
  -webkit-backface-visibility:hidden!important;
  transform-style:preserve-3d;
  will-change:transform,opacity!important;
}

/* YardOn HD hero logo render: never resample the large welcome/login mark */
#yardivoWelcomeSplash .yardon-welcome-logo,
.login-logo-combo img[data-yardon-hd-intro="1"]{
  image-rendering:auto!important;
  transform:translate3d(0,0,0);
  backface-visibility:hidden!important;
  -webkit-backface-visibility:hidden!important;
  filter:none!important;
  mix-blend-mode:normal!important;
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

const framelessStyle=document.createElement('style');
framelessStyle.id='yardon-frameless-logo-final-owner';
framelessStyle.textContent=`
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap,
#yardivoWelcomeSplash .yardon-welcome-logo,
#yardivoWelcomeSplash .yardon-split-stage,
#yardivoWelcomeSplash .yardon-split-half,
.login-logo-combo,
.login-logo-combo img,
#yardonLoginTransition img{
  background:transparent!important;
  background-color:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
  filter:none!important;
  mix-blend-mode:normal!important;
}
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap,
.login-logo-combo{
  overflow:visible!important;
}
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap::before,
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap::after,
.login-logo-combo::before,
.login-logo-combo::after{
  content:none!important;
  display:none!important;
  background:none!important;
  box-shadow:none!important;
  filter:none!important;
}
`;
document.head.appendChild(framelessStyle);


const loginCleanStyle=document.createElement('style');
loginCleanStyle.id='yardon-login-clean-final';
loginCleanStyle.textContent=`
/* YardOn no-login-rhombus hard stop */
body.yardivo-prelogin .login-logo-combo::before,
body.yardivo-prelogin .login-logo-combo::after,
body.yardivo-prelogin .login-card::before,
body.yardivo-prelogin .login-card::after,
body.yardivo-prelogin .login-overlay::before,
body.yardivo-prelogin .login-overlay::after,
body.yardivo-prelogin .login-screen::before,
body.yardivo-prelogin .login-screen::after,
body.yardivo-prelogin #loginScreen::before,
body.yardivo-prelogin #loginScreen::after,
body.yardivo-prelogin #loginOverlay::before,
body.yardivo-prelogin #loginOverlay::after{
  content:none!important;
  display:none!important;
  opacity:0!important;
  visibility:hidden!important;
  animation:none!important;
  background:none!important;
  background-image:none!important;
  box-shadow:none!important;
  filter:none!important;
}
#yardivoWelcomeSplash .yardivo-welcome-progress i{
  transform:translate3d(0,0,0) scaleX(0);
  will-change:transform!important;
  backface-visibility:hidden!important;
  -webkit-backface-visibility:hidden!important;
}
`;
document.head.appendChild(loginCleanStyle);

const cinematicIntroStyle=document.createElement('style');
cinematicIntroStyle.id='yardon-cinematic-intro-owner';
cinematicIntroStyle.textContent=`
@keyframes yardonTargetGlowPulse{
  0%,100%{opacity:.50;filter:drop-shadow(0 0 5px rgba(0,190,255,.52)) drop-shadow(0 0 12px rgba(0,115,255,.34));}
  50%{opacity:.95;filter:drop-shadow(0 0 9px rgba(35,220,255,.92)) drop-shadow(0 0 24px rgba(0,132,255,.70));}
}
@keyframes yardonTaglineSoftIn{
  from{opacity:0;transform:translate3d(0,7px,0)}
  to{opacity:1;transform:translate3d(0,0,0)}
}
@keyframes yardonWholeLogoGlow{
  0%,100%{filter:drop-shadow(0 0 3px rgba(0,184,255,.24)) drop-shadow(0 0 8px rgba(0,108,255,.12));}
  50%{filter:drop-shadow(0 0 7px rgba(0,210,255,.50)) drop-shadow(0 0 18px rgba(0,122,255,.28));}
}
#yardivoWelcomeSplash{
  background:
    radial-gradient(ellipse at 50% 39%,rgba(0,108,190,.20) 0%,rgba(0,55,105,.10) 35%,rgba(0,20,39,0) 65%),
    linear-gradient(180deg,#061827 0%,#03111e 62%,#020c15 100%)!important;
}
#yardivoWelcomeSplash .yardon-welcome-title,
#yardivoWelcomeSplash .yardivo-welcome-text{
  display:none!important;
}
#yardivoWelcomeSplash .yardivo-welcome-logo-wrap{
  position:relative!important;
  isolation:isolate!important;
  perspective:1400px!important;
  transform-style:preserve-3d!important;
  min-height:220px!important;
  margin:0 auto 8px!important;
}
#yardivoWelcomeSplash .yardon-letter-reveal-stage{
  position:absolute!important;
  inset:0!important;
  z-index:4!important;
  pointer-events:none!important;
  transform-style:preserve-3d!important;
  perspective:1400px!important;
}
#yardivoWelcomeSplash .yardon-intro-logo-segment{
  position:absolute!important;
  left:50%!important;
  top:50%!important;
  width:var(--yardon-intro-logo-width)!important;
  height:var(--yardon-intro-logo-height)!important;
  max-width:none!important;
  max-height:none!important;
  margin:0!important;
  object-fit:contain!important;
  object-position:center center!important;
  background:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
  mix-blend-mode:normal!important;
  backface-visibility:hidden!important;
  -webkit-backface-visibility:hidden!important;
  will-change:transform,opacity,filter!important;
}
#yardivoWelcomeSplash .yardon-welcome-logo{
  position:relative!important;
  z-index:2!important;
  animation:none!important;
  filter:none!important;
}
#yardivoWelcomeSplash.yardon-logo-glow-active .yardon-welcome-logo{
  animation:yardonWholeLogoGlow 2.8s ease-in-out infinite!important;
}
.login-logo-combo .yardon-login-logo-base{
  animation:yardonWholeLogoGlow 3s ease-in-out infinite!important;
}
#yardivoWelcomeSplash .yardivo-welcome-sub{
  min-height:30px!important;
  margin:4px 0 22px!important;
  color:#f5fbff!important;
  font-size:clamp(13px,1.05vw,17px)!important;
  font-weight:500!important;
  letter-spacing:.28em!important;
  line-height:1.7!important;
  text-transform:uppercase!important;
  text-shadow:0 0 12px rgba(130,210,255,.18)!important;
  opacity:1!important;
}
#yardivoWelcomeSplash .yardivo-welcome-progress-wrap{
  opacity:0!important;
  transform:translate3d(0,10px,0)!important;
  transition:opacity .42s ease,transform .42s ease!important;
  pointer-events:none!important;
}
#yardivoWelcomeSplash.yardon-progress-ready .yardivo-welcome-progress-wrap{
  opacity:1!important;
  transform:translate3d(0,0,0)!important;
}
.yardon-logo-glow{
  position:absolute!important;
  left:50%!important;
  top:50%!important;
  z-index:3!important;
  display:block!important;
  width:clamp(660px,60vw,980px)!important;
  max-width:92vw!important;
  height:auto!important;
  margin:0!important;
  transform:translate3d(-50%,-50%,0)!important;
  object-fit:contain!important;
  object-position:center center!important;
  pointer-events:none!important;
  user-select:none!important;
  background:transparent!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
  mix-blend-mode:normal!important;
  opacity:0!important;
}
#yardivoWelcomeSplash .yardon-logo-glow-mark,
.login-logo-combo .yardon-logo-glow-mark{
  clip-path:inset(0 76.5% 0 0)!important;
}
#yardivoWelcomeSplash .yardon-logo-glow-on,
.login-logo-combo .yardon-logo-glow-on{
  clip-path:inset(0 0 0 73%)!important;
}
#yardivoWelcomeSplash.yardon-logo-glow-active .yardon-logo-glow{
  animation:yardonTargetGlowPulse 2.25s ease-in-out infinite!important;
}
#yardivoWelcomeSplash.yardon-logo-glow-active img.yardon-welcome-logo{
  filter:drop-shadow(0 0 5px rgba(0,190,255,.48)) drop-shadow(0 0 15px rgba(0,112,255,.28))!important;
}
#yardivoWelcomeSplash.yardon-logo-depth-reveal .yardon-logo-glow{
  opacity:0!important;
  animation:none!important;
}
#yardivoWelcomeSplash.yardon-split-reveal .yardon-logo-glow{
  opacity:0!important;
  animation:none!important;
}
.login-logo-combo{
  position:relative!important;
  isolation:isolate!important;
}
.login-logo-combo img.yardon-login-logo-base[data-yardon-hd-intro="1"]{
  position:relative!important;
  z-index:2!important;
  filter:drop-shadow(0 0 6px rgba(0,200,255,.58)) drop-shadow(0 0 18px rgba(0,112,255,.34))!important;
}
.login-logo-combo img.yardon-logo-glow{
  width:clamp(360px,34vw,520px)!important;
  max-width:92%!important;
  top:50%!important;
  opacity:.78!important;
  animation:yardonTargetGlowPulse 2.45s ease-in-out infinite!important;
  filter:drop-shadow(0 0 9px rgba(0,205,255,.82)) drop-shadow(0 0 24px rgba(0,118,255,.56))!important;
}
.login-screen.yardon-login-arrive:not(.yardon-login-arrive-active) .yardon-logo-glow,
.login-overlay.yardon-login-arrive:not(.yardon-login-arrive-active) .yardon-logo-glow,
#loginScreen.yardon-login-arrive:not(.yardon-login-arrive-active) .yardon-logo-glow,
#loginOverlay.yardon-login-arrive:not(.yardon-login-arrive-active) .yardon-logo-glow{
  opacity:0!important;
  animation:none!important;
}
@media(max-width:700px){
  #yardivoWelcomeSplash .yardivo-welcome-logo-wrap{min-height:132px!important;}
  #yardivoWelcomeSplash .yardon-intro-logo-segment{
    width:var(--yardon-intro-logo-width)!important;
    height:var(--yardon-intro-logo-height)!important;
  }
  .yardon-logo-glow{width:min(92vw,610px)!important;}
  #yardivoWelcomeSplash .yardivo-welcome-sub{
    font-size:12px!important;
    letter-spacing:.20em!important;
    min-height:26px!important;
  }
  .login-logo-combo img.yardon-logo-glow{width:min(88vw,390px)!important;}
}
`;
document.head.appendChild(cinematicIntroStyle);

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
  transparentLogoPromise=Promise.resolve(LOGO);
  window.__yardonTransparentLogo=LOGO;
  return transparentLogoPromise;
}
function prepareLogo(el){
  if(!(el instanceof HTMLImageElement)||el.dataset.yardonPreparing==='1'||el.dataset.yardonPrepared==='1')return;
  el.dataset.yardonPreparing='1';
  el.dataset.yardonRuntimeLogo='1';
  el.src=LOGO;
  el.style.setProperty('display','block','important');
  el.style.setProperty('visibility','visible','important');
  el.style.setProperty('opacity','1','important');
  el.style.setProperty('background','transparent','important');
  el.style.setProperty('border','0','important');
  el.style.setProperty('outline','0','important');
  el.style.setProperty('box-shadow','none','important');
  el.style.setProperty('filter','none','important');
  el.style.setProperty('mix-blend-mode','normal','important');
  transparentLogo().then(url=>{
    el.src=url;
    el.dataset.yardonPrepared='1';
    el.style.setProperty('mix-blend-mode','normal','important');
  }).catch(()=>{
    el.src=LOGO;
    el.style.setProperty('mix-blend-mode','normal','important');
  }).finally(()=>{delete el.dataset.yardonPreparing});
}
function patchElement(el){
  if(!(el instanceof Element))return;
  if(el.tagName==='IMG'){
    if(el.classList.contains('yardon-logo-glow'))return;
    const src=el.getAttribute('src')||'';
    if(/assets\/yardivo-logo\.svg(?:\?.*)?$/i.test(src))el.setAttribute('src',LOGO);
    const now=el.getAttribute('src')||'';
    if(/yardon-logo(?:-exact|-canonical|-transparent(?:-v\d+)?)?\.(?:webp|png|svg)(?:\?.*)?$/i.test(now)||el.dataset.yardonPrepared==='1'){
      const hdHero=el.dataset.yardonHdIntro==='1'||!!el.closest('#yardivoWelcomeSplash,.login-logo-combo');
      if(hdHero){
        // Hero source is owned by HTML. Runtime src rewrites during intro/split caused frame glitches.
        el.dataset.yardonRuntimeLogo='1';
        el.dataset.yardonPrepared='hd';
        el.style.setProperty('display','block','important');
        el.style.setProperty('visibility','visible','important');
        el.style.setProperty('opacity','1','important');
        el.style.setProperty('background','transparent','important');
        el.style.setProperty('background-color','transparent','important');
        el.style.setProperty('border','0','important');
        el.style.setProperty('outline','0','important');
        el.style.setProperty('box-shadow','none','important');
        if(el.classList.contains('yardon-login-logo-base')){
          el.style.setProperty('filter','drop-shadow(0 0 6px rgba(0,200,255,.58)) drop-shadow(0 0 18px rgba(0,112,255,.34))','important');
        }else{
          el.style.setProperty('filter','none','important');
        }
        el.style.setProperty('mix-blend-mode','normal','important');
      }else{
        prepareLogo(el);
      }
      el.setAttribute('data-yardon-runtime-logo','1');
      el.style.setProperty('background','transparent','important');
      el.style.setProperty('box-shadow','none','important');
      if(!hdHero)el.style.setProperty('mix-blend-mode','normal','important');
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
let brandRuntimeActive=document.documentElement.classList.contains('yardivo-welcome-complete');
let brandFlushQueued=false;

function apply(){
  try{
    document.title=BRAND+' '+VERSION+' - Yard Management System';
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content',BRAND);
    document.querySelector('meta[name="application-name"]')?.setAttribute('content',BRAND);
    if(!brandRuntimeActive)return;
    patchTree(document);
    ensureBrandLogos();
  }catch(e){console.warn('YardOn brand runtime',e)}
}
function activateBrandRuntime(){
  if(brandRuntimeActive)return;
  brandRuntimeActive=true;
  const run=()=>{brandFlushQueued=false;apply()};
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:450});
  else setTimeout(run,0);
}
function queueBrandApply(){
  if(!brandRuntimeActive||brandFlushQueued)return;
  brandFlushQueued=true;
  requestAnimationFrame(()=>{
    const run=()=>{brandFlushQueued=false;apply()};
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:300});
    else setTimeout(run,0);
  });
}

const nativeAlert=window.alert?.bind(window),nativeConfirm=window.confirm?.bind(window),nativePrompt=window.prompt?.bind(window);
if(nativeAlert)window.alert=(message)=>nativeAlert(brandText(message));
if(nativeConfirm)window.confirm=(message)=>nativeConfirm(brandText(message));
if(nativePrompt)window.prompt=(message,defaultValue)=>nativePrompt(brandText(message),defaultValue);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
window.addEventListener('yardivo:welcome-complete',activateBrandRuntime,{once:true});

new MutationObserver(ms=>{
  if(!brandRuntimeActive)return;
  for(const m of ms){
    if(m.type==='characterData'&&m.target?.parentElement&&!SKIP.has(m.target.parentElement.tagName)){
      const old=m.target.nodeValue||'',next=brandText(old);if(next!==old)m.target.nodeValue=next;
    }
    for(const n of m.addedNodes){
      if(n.nodeType===1)patchTree(n);
      else if(n.nodeType===3){const old=n.nodeValue||'',next=brandText(old);if(next!==old)n.nodeValue=next}
    }
  }
  queueBrandApply();
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