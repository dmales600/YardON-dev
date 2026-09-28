(function(){
'use strict';

let started=false;
let finished=false;
let transitioning=false;
let rafId=0;
let progressAnimation=null;
let welcomeLogoRef=null;
let welcomeLogoRect=null;
let welcomeLogoSrc='';
const welcomeDebug=window.__yardonWelcomeDebug={
  started:false,splitCalled:false,stageAppended:false,finished:false,forceReason:'',introError:'',phase:'init'
};
const PROGRESS_MS=1900;
const FINAL_REVEAL_MS=1800;
const LOGO_REVEAL_POINTS=[22,36,48,60,72,86,100];
const LOGO_SEGMENT_DURATION_MS=760;
const TAGLINE='YARD MANAGEMENT SYSTEM';
const TAGLINE_CHAR_MS=48;

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function revealLogoLetters(splash,source){
  if(!splash||!source)return;
  try{if(typeof source.decode==='function')await source.decode()}catch(_){}

  const wrap=source.closest('.yardivo-welcome-logo-wrap');
  if(!wrap)return;

  wrap.querySelector('.yardon-letter-reveal-stage')?.remove();
  const rect=source.getBoundingClientRect();
  const stage=document.createElement('div');
  stage.className='yardon-letter-reveal-stage';
  stage.style.setProperty('--yardon-intro-logo-width',rect.width+'px');
  stage.style.setProperty('--yardon-intro-logo-height',rect.height+'px');
  wrap.appendChild(stage);

  const src=source.currentSrc||source.src;
  source.style.setProperty('visibility','visible','important');
  source.style.setProperty('opacity','1','important');
  source.style.setProperty('clip-path','inset(0 100% 0 0)','important');
  source.style.setProperty('-webkit-clip-path','inset(0 100% 0 0)','important');
  splash.classList.add('yardon-logo-depth-reveal');

  let startPct=0;

  // The source holds only already-completed content. Exactly one transient slice
  // is created for the current letter/segment, so future right-side letters can
  // never be visible before their turn.
  for(let i=0;i<LOGO_REVEAL_POINTS.length;i++){
    if(finished||transitioning)return;

    const endPct=LOGO_REVEAL_POINTS[i];
    stage.replaceChildren();

    const piece=document.createElement('img');
    piece.className='yardon-intro-logo-segment';
    piece.alt='';
    piece.setAttribute('aria-hidden','true');
    piece.decoding='async';
    piece.loading='eager';
    piece.src=src;
    piece.style.setProperty('clip-path',`inset(0 ${100-endPct}% 0 ${startPct}%)`,'important');
    piece.style.setProperty('-webkit-clip-path',`inset(0 ${100-endPct}% 0 ${startPct}%)`,'important');
    stage.appendChild(piece);

    try{if(typeof piece.decode==='function')await piece.decode()}catch(_){}

    try{
      const animation=piece.animate(
        [
          {
            opacity:0,
            transform:'translate3d(-50%,-50%,-560px) scale(.58)',
            filter:'blur(10px) brightness(.58) saturate(1.9) drop-shadow(0 0 24px rgba(0,118,255,.92))'
          },
          {
            opacity:.82,
            offset:.62,
            transform:'translate3d(-50%,-50%,-90px) scale(.92)',
            filter:'blur(2px) brightness(.92) saturate(1.35) drop-shadow(0 0 18px rgba(0,180,255,.70))'
          },
          {
            opacity:1,
            transform:'translate3d(-50%,-50%,0) scale(1)',
            filter:'blur(0) brightness(1) saturate(1) drop-shadow(0 0 8px rgba(0,170,255,.38))'
          }
        ],
        {
          duration:LOGO_SEGMENT_DURATION_MS,
          easing:'cubic-bezier(.16,.78,.18,1)',
          fill:'forwards'
        }
      );
      await animation.finished.catch(()=>{});
    }catch(_){
      // Safari/older engines may reject complex filter interpolation. Commit the
      // segment instead of aborting the entire intro and skipping the split.
      piece.style.opacity='1';
      piece.style.transform='translate3d(-50%,-50%,0) scale(1)';
      piece.style.filter='none';
      await wait(120);
    }

    // Commit this slice to the single masked source, then remove the temporary
    // slice before the next one is introduced.
    source.style.setProperty('clip-path',`inset(0 ${100-endPct}% 0 0)`,'important');
    source.style.setProperty('-webkit-clip-path',`inset(0 ${100-endPct}% 0 0)`,'important');
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    stage.replaceChildren();
    startPct=endPct;
  }

  if(finished||transitioning)return;
  source.style.removeProperty('clip-path');
  source.style.removeProperty('-webkit-clip-path');
  stage.remove();
  splash.classList.remove('yardon-logo-depth-reveal');
  splash.classList.add('yardon-logo-glow-active','yardon-logo-reveal-complete');
  welcomeDebug.logoRevealComplete=true;
  welcomeDebug.phase='logo-reveal-complete';
}

async function revealTagline(sub){
  if(!sub)return;
  sub.textContent='';
  sub.setAttribute('aria-label',TAGLINE);
  await wait(130);
  for(let i=1;i<=TAGLINE.length;i++){
    if(finished||transitioning)return;
    sub.textContent=TAGLINE.slice(0,i);
    await wait(TAGLINE_CHAR_MS);
  }
}

function runProgress(bar,pct,status){
  return new Promise(resolve=>{
    if(!bar||!pct){resolve();return}
    try{bar.getAnimations?.().forEach(a=>a.cancel())}catch(_){}
    bar.style.width='100%';
    bar.style.transform='translate3d(0,0,0) scaleX(0)';
    pct.textContent='0%';
    if(status)status.textContent='Loading system';

    try{
      progressAnimation=bar.animate(
        [
          {transform:'translate3d(0,0,0) scaleX(0)'},
          {transform:'translate3d(0,0,0) scaleX(1)'}
        ],
        {duration:PROGRESS_MS,easing:'cubic-bezier(.22,.61,.36,1)',fill:'forwards'}
      );
    }catch(_){progressAnimation=null}

    const startedAt=performance.now();
    let lastValue=-1;
    function tick(now){
      if(finished||transitioning){resolve();return}
      const ratio=Math.min(1,(now-startedAt)/PROGRESS_MS);
      const value=Math.min(100,Math.floor(ratio*100));
      if(!progressAnimation)bar.style.transform='translate3d(0,0,0) scaleX('+ratio+')';
      if(value===100||value>=lastValue+2){
        lastValue=value;
        pct.textContent=value+'%';
      }
      if(value>=100){
        if(status)status.textContent='Ready';
        rafId=0;
        resolve();
        return;
      }
      rafId=requestAnimationFrame(tick);
    }
    rafId=requestAnimationFrame(tick);
  });
}

async function runIntroSequence(splash,source,sub,bar,pct,status){
  await revealLogoLetters(splash,source);
  if(finished||transitioning)return;
  await wait(110);
  await revealTagline(sub);
  if(finished||transitioning)return;
  await wait(170);
  splash?.classList.add('yardon-progress-ready');
  await wait(360);
  await runProgress(bar,pct,status);
  if(finished||transitioning)return;
  await wait(120);
  startSplitReveal();
}

function loginNode(){
  return document.getElementById('loginScreen')
    || document.getElementById('loginOverlay')
    || document.getElementById('login')
    || document.querySelector('.login-screen,.login-overlay,[data-login-screen]');
}

function mountLoginBehind({activate=true}={}){
  const login=loginNode();
  document.body.classList.add('yardivo-prelogin');
  if(login){
    login.classList.remove('hidden','yardon-login-arrive-active');
    login.classList.add('yardon-login-arrive');
    login.style.display='flex';
    login.style.visibility='visible';
    login.style.opacity='1';
    login.setAttribute('aria-hidden','false');
    if(activate){
      requestAnimationFrame(()=>requestAnimationFrame(()=>login.classList.add('yardon-login-arrive-active')));
    }
  }
  document.documentElement.classList.add('yardivo-login-ready');
  return login;
}

function finishReveal(){
  if(finished)return;
  finished=true;
  transitioning=false;
  welcomeDebug.finished=true;
  welcomeDebug.phase='finished';
  if(rafId){cancelAnimationFrame(rafId);rafId=0;}
  try{progressAnimation?.finish?.()}catch(_){}
  progressAnimation=null;
  const splash=document.getElementById('yardivoWelcomeSplash');
  const login=loginNode();
  if(splash)splash.style.display='none';
  if(login){
    login.classList.remove('yardon-login-arrive','yardon-login-arrive-active');
    login.style.opacity='1';
    login.style.visibility='visible';
    const finalLogo=login.querySelector('.login-logo-combo');
    if(finalLogo){
      finalLogo.style.removeProperty('visibility');
      finalLogo.style.removeProperty('opacity');
      finalLogo.style.removeProperty('animation');
    }
  }
  document.documentElement.classList.remove('yardivo-booting');
  document.documentElement.classList.add('yardivo-welcome-complete');
  document.body.classList.remove('yardivo-welcome-active');
  document.body.classList.add('yardivo-prelogin');
  try{window.dispatchEvent(new CustomEvent('yardivo:welcome-complete'))}catch(_){}
  try{YardivoLoginNotificationFix?.clearLoginOnce?.()}catch(_){}
}

async function startSplitReveal(){
  welcomeDebug.splitCalled=true;
  welcomeDebug.phase='split-called';
  if(transitioning||finished){welcomeDebug.phase='split-skipped';return;}
  transitioning=true;

  const bar=document.getElementById('yardivoWelcomeBar');
  const pct=document.getElementById('yardivoWelcomePercent');
  const status=document.getElementById('yardivoWelcomeStatus');
  try{progressAnimation?.finish?.()}catch(_){}
  progressAnimation=null;
  if(bar){bar.style.width='100%';bar.style.transform='translate3d(0,0,0) scaleX(1)';}
  if(pct)pct.textContent='100%';
  if(status)status.textContent='Ready';

  const splash=document.getElementById('yardivoWelcomeSplash');
  const source=(welcomeLogoRef&&welcomeLogoRef.isConnected)
    ?welcomeLogoRef
    :(splash?.querySelector('.yardon-welcome-logo,[data-yardon-hd-intro="1"]')||null);
  welcomeDebug.splitSplash=!!splash;
  welcomeDebug.splitSource=!!source;
  if(splash){
    splash.querySelector('.yardon-split-stage')?.remove();
    splash.querySelector('.yardon-letter-reveal-stage')?.remove();

    if(source){
      // Normalize the full approved logo before cloning it into left/right halves.
      source.style.removeProperty('clip-path');
      source.style.removeProperty('-webkit-clip-path');
      source.style.setProperty('visibility','visible','important');
      source.style.setProperty('opacity','1','important');
    }

    const splashRect=splash.getBoundingClientRect();
    const liveRect=source?.getBoundingClientRect?.();
    const sourceRect=(liveRect&&liveRect.width>0&&liveRect.height>0)
      ?liveRect
      :welcomeLogoRect;
    if(!sourceRect||sourceRect.width<=0||sourceRect.height<=0){
      const fallbackWidth=Math.min(window.innerWidth*.68,980);
      const fallbackHeight=fallbackWidth*(341/1719);
      const fallbackLeft=(window.innerWidth-fallbackWidth)/2;
      const fallbackTop=Math.max(80,window.innerHeight*.22);
      welcomeLogoRect={left:fallbackLeft,top:fallbackTop,width:fallbackWidth,height:fallbackHeight,right:fallbackLeft+fallbackWidth,bottom:fallbackTop+fallbackHeight};
    }
    const splitRect=(sourceRect&&sourceRect.width>0&&sourceRect.height>0)?sourceRect:welcomeLogoRect;
    const stage=document.createElement('div');
    stage.className='yardon-split-stage';
    stage.style.setProperty('--yardon-split-left',(splitRect.left-splashRect.left)+'px');
    stage.style.setProperty('--yardon-split-top',(splitRect.top-splashRect.top)+'px');
    stage.style.setProperty('--yardon-split-width',splitRect.width+'px');
    stage.style.setProperty('--yardon-split-height',splitRect.height+'px');
    stage.style.setProperty('--yardon-split-center-x',(splitRect.left-splashRect.left+splitRect.width/2)+'px');
    stage.style.setProperty('--yardon-split-center-y',(splitRect.top-splashRect.top+splitRect.height/2)+'px');

    const src=(source&&(source.currentSrc||source.src))||welcomeLogoSrc||'assets/yardon-logo-exact.webp?v=20260928-exact1';
    const left=document.createElement('img');
    const right=document.createElement('img');
    left.className='yardon-split-half left';
    right.className='yardon-split-half right';
    left.alt='';right.alt='';
    left.decoding='async';right.decoding='async';
    left.loading='eager';right.loading='eager';
    left.src=src;right.src=src;

    for(const half of [left,right]){
      half.style.setProperty('left',(splitRect.left-splashRect.left)+'px','important');
      half.style.setProperty('top',(splitRect.top-splashRect.top)+'px','important');
      half.style.setProperty('width',splitRect.width+'px','important');
      half.style.setProperty('height',splitRect.height+'px','important');
      half.style.setProperty('max-width','none','important');
      half.style.setProperty('max-height','none','important');
      half.style.setProperty('margin','0','important');
      half.style.setProperty('background','transparent','important');
      half.style.setProperty('border','0','important');
      half.style.setProperty('outline','0','important');
      half.style.setProperty('box-shadow','none','important');
      half.style.setProperty('filter','none','important');
      half.style.setProperty('mix-blend-mode','normal','important');
    }

    for(const half of [left,right]){
      half.style.setProperty('animation','none','important');
      half.style.setProperty('visibility','visible','important');
      half.style.setProperty('opacity','1','important');
      half.style.setProperty('z-index','7','important');
    }

    stage.append(left,right);
    splash.appendChild(stage);
    welcomeDebug.stageAppended=true;
    welcomeDebug.phase='split-stage-appended';

    // Keep the source visible until both split clones have decoded. This prevents
    // a blank/black compositor frame between the static logo and the moving halves.
    try{
      await Promise.all([
        typeof left.decode==='function'?left.decode():Promise.resolve(),
        typeof right.decode==='function'?right.decode():Promise.resolve()
      ]);
    }catch(_){}

    // Stage the login at a distant Z position before the splash becomes transparent.
    // The exact moment the center split opens, the login window is already visible
    // behind it and begins travelling toward the user.
    const stagedLogin=mountLoginBehind({activate:false});
    splash.classList.add('yardon-split-reveal');
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

    if(source){
      source.classList.add('yardon-split-source-hidden');
      source.style.setProperty('visibility','hidden','important');
      source.style.setProperty('opacity','0','important');
    }
    left.style.removeProperty('opacity');
    right.style.removeProperty('opacity');

    // Own the actual split motion in JS so later brand CSS cannot accidentally
    // override/remove the center-opening animation.
    const splitOptions={
      duration:FINAL_REVEAL_MS,
      easing:'cubic-bezier(.14,.76,.16,1)',
      fill:'forwards'
    };
    if(stagedLogin){
      requestAnimationFrame(()=>requestAnimationFrame(()=>stagedLogin.classList.add('yardon-login-arrive-active')));
    }

    try{
      left.animate([
        {transform:'translate3d(0,0,0) scale(1.03)',opacity:1},
        {transform:'translate3d(-1vw,0,0) scale(1.08)',opacity:1,offset:.18},
        {transform:'translate3d(-20vw,0,0) scale(1.28)',opacity:.96,offset:.58},
        {transform:'translate3d(-62vw,0,0) scale(1.68)',opacity:.04}
      ],splitOptions);
      right.animate([
        {transform:'translate3d(0,0,0) scale(1.03)',opacity:1},
        {transform:'translate3d(1vw,0,0) scale(1.08)',opacity:1,offset:.18},
        {transform:'translate3d(20vw,0,0) scale(1.28)',opacity:.96,offset:.58},
        {transform:'translate3d(62vw,0,0) scale(1.68)',opacity:.04}
      ],splitOptions);
    }catch(_){
      left.style.setProperty('animation','yardonSplitLeft '+FINAL_REVEAL_MS+'ms cubic-bezier(.14,.76,.16,1) forwards','important');
      right.style.setProperty('animation','yardonSplitRight '+FINAL_REVEAL_MS+'ms cubic-bezier(.14,.76,.16,1) forwards','important');
    }
  }

  // Login motion is synchronized with the split above: it is already visible
  // in the distance at split start and arrives as the two logo halves move away.
  setTimeout(finishReveal,FINAL_REVEAL_MS+90);
}

function forceReveal(reason='force'){
  welcomeDebug.forceReason=String(reason||'force');
  welcomeDebug.phase='force-reveal';
  if(finished)return;
  mountLoginBehind();
  finishReveal();
}

function start(){
  if(started)return;
  started=true;
  welcomeDebug.started=true;
  welcomeDebug.phase='start';

  document.documentElement.classList.add('yardivo-booting');
  document.body.classList.add('yardivo-welcome-active','yardivo-prelogin');

  const splash=document.getElementById('yardivoWelcomeSplash');
  const login=loginNode();
  const bar=document.getElementById('yardivoWelcomeBar');
  const pct=document.getElementById('yardivoWelcomePercent');
  const status=document.getElementById('yardivoWelcomeStatus');

  if(splash){
    splash.style.removeProperty('display');
    splash.classList.remove('hide','yardon-final-zoom','yardon-split-reveal','yardon-logo-glow-active','yardon-logo-reveal-complete','yardon-progress-ready','yardon-logo-depth-reveal');
    splash.querySelector('.yardon-split-stage')?.remove();
    splash.querySelector('.yardon-letter-reveal-stage')?.remove();
    const oldSource=splash.querySelector('.yardon-welcome-logo');
    if(oldSource){
      oldSource.classList.remove('yardon-split-source-hidden');
      oldSource.style.removeProperty('clip-path');
      oldSource.style.removeProperty('-webkit-clip-path');
      oldSource.style.setProperty('visibility','hidden','important');
      oldSource.style.setProperty('opacity','0','important');
    }
  }
  if(login){
    login.classList.remove('yardon-login-arrive','yardon-login-arrive-active');
    login.style.display='none';
    login.style.visibility='hidden';
    login.style.opacity='0';
  }
  const source=splash?.querySelector('.yardon-welcome-logo');
  const sub=splash?.querySelector('.yardivo-welcome-sub');
  if(sub){
    sub.textContent='';
    sub.setAttribute('aria-label',TAGLINE);
  }
  welcomeDebug.startSplash=!!splash;
  welcomeDebug.startBar=!!bar;
  welcomeDebug.startPct=!!pct;
  welcomeDebug.startSource=!!source;
  if(!bar||!pct||!source){forceReveal('start-missing-node');return;}
  welcomeLogoRef=source;
  welcomeLogoSrc=source.currentSrc||source.src||'assets/yardon-logo-exact.webp?v=20260928-exact1';
  {
    const r=source.getBoundingClientRect();
    if(r.width>0&&r.height>0){
      welcomeLogoRect={left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
    }
  }

  try{bar.getAnimations?.().forEach(a=>a.cancel())}catch(_){}
  bar.style.width='100%';
  bar.style.transform='translate3d(0,0,0) scaleX(0)';
  pct.textContent='0%';
  if(status)status.textContent='';

  runIntroSequence(splash,source,sub,bar,pct,status).catch(e=>{
    welcomeDebug.introError=String(e?.stack||e?.message||e||'intro-error');
    welcomeDebug.phase='intro-error';
    startSplitReveal();
  });
}

if(document.getElementById('yardivoWelcomeSplash')){
  start();
}else if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',start,{once:true});
}else{
  start();
}

// If a browser delays any intro animation/decode, preserve the intended transition:
  // go to the center split first rather than jumping straight to the login.
  setTimeout(()=>{
    if(!finished&&!transitioning){
      welcomeDebug.phase='split-failsafe';
      startSplitReveal();
    }
  },13500);
  // Last-resort safety only; normal flow and the split fail-safe should finish earlier.
  setTimeout(()=>{if(!finished&&!transitioning)forceReveal('last-resort-timeout')},22000);
window.YardivoWelcomeSplash={start,hide:forceReveal};
})();