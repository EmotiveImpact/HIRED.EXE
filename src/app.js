(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = globalThis.HIRED_EDITION;
  const H = globalThis.Hired;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const asset = path => globalThis.HIRED_EMBEDDED_ASSETS?.[path] || path;
  const safeLink = value => typeof value === 'string' && /^(https:\/\/|mailto:)/i.test(value) ? value : null;
  const cvLink = (id, className='') => {
    const offline=globalThis.HIRED_EMBEDDED_CV;
    const props=offline?'download="Augustus-Edem-CV.pdf"':'target="_blank" rel="noopener"';
    return `<a class="${className}" id="${id}" href="${offline || 'cv.html'}" ${props}>${offline?'Download CV (PDF)':'View CV'}</a>`;
  };
  const SAVE_KEY = 'hired-exe:v04:' + E.id;
  let progress = {lastLevel:0,results:{},assist:false,muted:false,seenIntros:[]};
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      progress.lastLevel = Number.isInteger(saved.lastLevel) ? Math.max(0,Math.min(3,saved.lastLevel)) : 0;
      if(saved.results && typeof saved.results === 'object') {
        H.LEVELS.forEach((level,index)=>{
          const result=saved.results[index];
          if(!result || typeof result!=='object' || result.completed!==true)return;
          const validSkills=new Set(level.collectibles.filter(c=>c.kind==='skill').map(c=>c.skill.id));
          const count=n=>Number.isFinite(n)&&n>=0?Math.floor(n):0;
          progress.results[index]={score:count(result.score),coins:count(result.coins),
            skills:[...new Set((Array.isArray(result.skills)?result.skills:[]).filter(id=>validSkills.has(id)))],
            bestTime:Number.isFinite(result.bestTime)&&result.bestTime>0?result.bestTime:null,completed:true};
        });
      }
      if(Number.isInteger(saved.pendingScene) && saved.pendingScene >= 1 &&
         saved.pendingScene <= H.LEVELS.length && progress.results[saved.pendingScene-1]) {
        progress.pendingScene = saved.pendingScene;
      }
      if(Array.isArray(saved.seenIntros)){
        progress.seenIntros=H.LEVELS.map(level=>level.id).filter(id=>saved.seenIntros.includes(id));
      }
      progress.assist = saved.assist === true;
      const record = saved.checkpoint;
      if (record?.level === progress.lastLevel && H.LEVELS[record.level].checkpoints.some(cp => cp.id === record.checkpoint))
        progress.checkpoint = record;
      progress.delivered = saved.delivered === true;
      progress.muted = saved.muted === true;
    }
  } catch (_) { storageAvailable=false; /* Private/file browsing can restrict storage. Playing still works. */ }
  const save = () => {try {localStorage.setItem(SAVE_KEY,JSON.stringify(progress));storageAvailable=true;return true;} catch (_) {storageAvailable=false;return false;}};
  let game = new H.Game(), preview = new H.Game();
  preview.start(0,{assist:true});
  // The title stage is assembled from the same actors and surfaces as world one.
  Object.assign(preview.state.player, { x: 571, y: 286, grounded: true });
  const compact = matchMedia('(max-width: 540px) and (orientation: portrait)');
  function sizeCamera() {
    const width = compact.matches ? 480 : H.WIDTH;
    game.viewWidth = width;
    if (renderer) renderer.canvas.width = uiMode === 'home' ? H.WIDTH : width;
    if (game.state) {
      const s = game.state;
      s.camera.x = Math.max(0, Math.min(s.world.width - width, s.player.x - width * .35));
    }
  }
  compact.addEventListener('change', sizeCamera);
  const movementHelp = () => matchMedia('(pointer: coarse)').matches
    ? 'Hold an arrow to move · Tap Jump twice for height · Dash to break through'
    : 'A / D move · Space jump / double jump · Shift dash';
  let renderer, uiMode='boot', ready=false, previousTime=0, toastTimeout, ribbonTimeout;
  let interviewIndex=0, interviewChoice=null;
  let sceneIndex=0, sceneBeat=0;
  let interviewAnswers=[];
  let desktopReturn=null, titleBack=null, artworkLoad=null, assetReport=null;
  const bootKey='hire.exe:windows311:started';
  const keys = new Set(), touch = new Set();
  const pointers = new Map();
  let helpBack=showHome, portfolioBack=showHome, worldsBack=showHome;
  let jumpPressed=false, dashPressed=false;

  function clearInputs() {
    game.pendingJump=false; game.pendingDash=false;
    keys.clear(); touch.clear(); pointers.clear(); jumpPressed=false; dashPressed=false;
    document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('is-held'));
  }
  function inputs() {
    const result = {
      left:keys.has('ArrowLeft')||keys.has('KeyA')||touch.has('left'),
      right:keys.has('ArrowRight')||keys.has('KeyD')||touch.has('right'),
      down:keys.has('ArrowDown')||keys.has('KeyS')||touch.has('down'),
      jumpHeld:keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW')||touch.has('jump'),
      jumpPressed,dashPressed
    };
    jumpPressed=false; dashPressed=false;
    return result;
  }
  function toast(message,duration=3500) {
    $('toast').textContent=message; $('toast').classList.remove('hidden');
    clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>$('toast').classList.add('hidden'),duration);
  }
  function setMode(mode) {
    uiMode=mode;
    if(!['boot','home','calculator','sea-trial','desktop-portfolio'].includes(mode))desktopReturn=null;
    const utility=mode==='calculator'||mode==='sea-trial'||mode==='desktop-portfolio';
    const desktop=mode==='home'||utility||mode==='boot';
    $('os-shell').hidden=!desktop;
    $('game-window').hidden=desktop;
    $('os-dialog').hidden=!utility;
    $('os-files').inert=utility;
    if(!utility)$('os-dialog').replaceChildren();
    if(desktop && document.fullscreenElement===$('game-window'))document.exitFullscreen().catch(()=>{});

    audio.syncMusic();
    if (renderer) renderer.canvas.width = compact.matches && mode !== 'home' ? 480 : H.WIDTH;
    game.viewWidth = compact.matches ? 480 : H.WIDTH;
    clearInputs(); previousTime=performance.now();
    const playing=mode==='playing';
    $('overlay').classList.toggle('hidden',playing);
    $('viewport').classList.toggle('menu-open',!playing);
    $('hud').classList.toggle('hidden',!playing);
    $('pause-button').textContent=playing?'Pause [P]':mode==='pause'?'Resume [P]':'Pause [P]';
    $('pause-button').disabled=!['playing','pause'].includes(mode);
    $('touch-controls').inert=!playing;
    $('mode-label').textContent=playing?(progress.assist?'RELAXED MODE':'STANDARD MODE'):'4 WORLDS / ORIGINAL PIXEL ART';
    if (!playing) { $('toast').classList.add('hidden'); $('level-ribbon').classList.add('hidden'); }
  }
  function bindActions(actions) {
    for (const [id,fn] of Object.entries(actions)) {const el=$(id); if(el)el.addEventListener('click',fn);}
  }
  function activeSurface(){
    if(uiMode==='home')return $('os-files');
    return $('os-dialog').hidden ? $('overlay') : $('os-dialog');
  }
  function focusDialog() { requestAnimationFrame(()=>activeSurface().querySelector('button,a,input')?.focus({preventScroll:true})); }
  function modal(title,body,wide=false,onClose=showHome) {
    activeSurface().className='overlay';
    activeSurface().setAttribute('aria-label',title);
    activeSurface().innerHTML=`<section class="modal-window ${wide?'wide':''}"><header class="small-title"><span>${esc(title)}</span><button id="dialog-close" aria-label="Close this window">×</button></header><div class="modal-body">${body}</div></section>`;
    activeSurface().querySelector('#dialog-close').addEventListener('click',onClose);focusDialog();
  }
  function showHome() {
    setMode('home');
    $('status').textContent='Ready to play';
    const hasProgress=Object.keys(progress.results).length>0||progress.seenIntros.length>0||progress.lastLevel>0||!!progress.checkpoint;
    const hasRun=game.state?.mode==='playing';
    const unlocked=progress.seenIntros.includes(H.LEVELS[1].id)||Boolean(progress.results[1]);
    const launchLabel=hasRun?'Resume this world':progress.checkpoint?'Continue from checkpoint':hasProgress?'Continue application':'Open application';
    // CALC001.PNG, archived Windows 3.x Calculator resource:
    // https://github.com/mRB0/many-windows-3.1-icons-in-png-format/blob/master/CALC001.PNG
    $('os-files').innerHTML=`<section class="program-manager"><header class="pm-caption"><span aria-hidden="true">−</span>Program Manager</header>
      <nav class="pm-menu" aria-label="Program Manager menus">
      <details><summary>File</summary><button id="attachment-launch">Open HIRE.EXE</button></details>
      <details><summary>Options</summary><button id="pm-reboot">Replay startup</button></details>
      <details><summary>Window</summary><button id="pm-apps">${esc(E.applicant)}</button><button id="pm-accessories">Accessories</button></details>
      <details><summary>Help</summary><button id="pm-about">About Program Manager</button></details></nav>
      <div class="pm-workspace"><section class="pm-group"><h2>${esc(E.applicant)}</h2><div class="desk-files">
      <button id="start-game" title="Double-click to open, or press Enter"><img src="${asset('assets/production/enemies/icons/terminal.png')}" alt=""><strong>HIRE.EXE</strong><small>${launchLabel}</small></button>
      ${cvLink('home-cv','desk-doc')}<button id="skip-portfolio" class="pm-document">Portfolio</button>
      ${unlocked?'<button id="desk-sub"><span class="desk-glyph" aria-hidden="true">⚓</span>Submarine (final).exe</button>':''}
      </div></section><div class="pm-folders">
      <details id="accessories-group"><summary>Accessories</summary><div class="desk-files"><button id="desk-calc"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAf0lEQVR4Ae2WAQqAQAgE9+k+zZ/ZAZIcRdYhUrQDQ9wFITJAIIQ41m9gMOtVZBoiLv3FsiK3FCQDqOpjp29kwq4HWAHDog2sNlGwgQaTDbiqukc1KD1nG4iogOrzgwbc+jMbYAN/aeCEvgZ8oNn+BsKPNADzy77n8besX0LewQYWnBFReoXS9wAAAABJRU5ErkJggg==" alt="">Calculator</button></div></details>
      ${E.id==='solved-001'?'<details id="internet-group"><summary>Internet</summary><div class="desk-files"><a id="desk-netscape" href="https://solved.studio/" target="_blank" rel="noopener noreferrer"><span class="desk-glyph navigator" aria-hidden="true">N</span>Netscape Navigator</a></div></details>':''}
      </div></div></section>`;
    $('home-cv').textContent=E.applicant+'’s CV';
    function closeMenus(){ $('os-files').querySelectorAll('nav details').forEach(menu=>menu.open=false); }
    $('pm-reboot').onclick=async()=>{closeMenus();await runStartup(true);$('start-game').focus();};
    $('pm-apps').onclick=()=>{closeMenus();$('start-game').focus();};
    $('pm-accessories').onclick=()=>{closeMenus();$('accessories-group').open=true;$('desk-calc').focus();};
    $('pm-about').onclick=()=>{closeMenus();setMode('calculator');modal('About Program Manager','<p>Windows for Workgroups 3.11 desktop recreation.</p>');};
    $('attachment-launch').onclick=()=>{closeMenus();launch();};
    $('desk-calc').onclick=()=>{setMode('calculator');H.desktopCalculator(modal,unlocked);};
    if(unlocked)$('desk-sub').onclick=()=>{setMode('sea-trial');H.seaTrial(modal,()=>{progress.delivered=true;save();});};
    const reopen=desktopReturn;
    function play(){
      if(reopen){reopen();}
      else if(hasRun)resume();
      else if(progress.pendingScene)beginScene(progress.pendingScene);
      else if(progress.results[3]&&!progress.checkpoint)beginScene(H.LEVELS.length);
      else if(progress.checkpoint)startLevel(progress.lastLevel,progress.checkpoint);
      else if(hasProgress)beginScene(progress.lastLevel);
      else beginScene(0);
    }
    function launch(){launchTitle(play,hasRun||hasProgress||!!reopen);}
    const icon=$('start-game');
    let touchLaunch=false;
    icon.onpointerdown=e=>{touchLaunch=e.pointerType!=='mouse';};
    icon.onclick=e=>{if(e.detail===0||touchLaunch)launch();};
    icon.ondblclick=()=>{if(uiMode==='home')launch();};
    $('skip-portfolio').onclick=()=>showPortfolio('home');
    requestAnimationFrame(()=>{if(uiMode==='home')icon.focus({preventScroll:true});});
  }
  let launchNumber=0;
  function loadArtwork(){
    if(!artworkLoad)artworkLoad=renderer.load().then(report=>assetReport=report).catch(error=>{artworkLoad=null;throw error;});
    return artworkLoad;
  }
  async function launchTitle(play,continuing){
    const launch=++launchNumber;
    setMode('game-load');
    const layer=$('overlay');
    layer.className='overlay game-launch';
    layer.setAttribute('aria-label','Loading HIRE.EXE');
    layer.innerHTML='<section class="load-card"><strong>Loading HIRE.EXE</strong><progress aria-label="Loading game artwork"></progress></section>';
    try{await loadArtwork();}catch{
      if(launch===launchNumber&&uiMode==='game-load'){
        modal('HIRE.EXE','<p>The game artwork could not load.</p><button class="btn" id="retry-launch">Try again</button>');
        $('retry-launch').onclick=()=>launchTitle(play,continuing);
      }
      return;
    }
    if(launch!==launchNumber||uiMode!=='game-load')return;
    function title(){
      setMode('title');titleBack=title;
      layer.className='overlay game-title';
      layer.style.setProperty('--title-scene',`url("${asset('assets/production/backgrounds/application-alley.webp')}")`);
      layer.setAttribute('aria-label','HIRE.EXE title screen');
      layer.innerHTML=`<div class="title-hero" aria-hidden="true">${comicSprite('hero','run_0','title-actor')}</div><section class="title-copy"><h1>HIRE<span>.EXE</span></h1><p>A playable application by ${esc(E.applicant)}</p><button class="btn primary" id="title-play">${continuing?'Continue game':'Start game'}</button><div class="title-links"><button id="choose-world">Choose a world</button><button id="replay-scenes">Replay cutscenes</button></div></section>`;
      $('title-play').onclick=play;
      $('choose-world').onclick=()=>showWorlds(title);
      $('replay-scenes').onclick=()=>gallery(0);
      focusDialog();
    }
    const panels=H.SCENES.flatMap(scene=>scene.beats.filter(beat=>beat.image));
    function gallery(i){
      setMode('gallery');
      if(!panels.length){modal('Cutscenes','<p>No illustrated panels in this edition.</p>',false,title);return;}
      const beat=panels[i];
      modal('Cutscenes',`<img class="replay-frame" src="${asset(beat.image)}" alt="${esc(beat.alt)}"><p>${i+1} / ${panels.length} · ${esc(beat.alt)}</p>${(beat.dialogue||[]).map(([name,line])=>`<p><strong>${esc(name)}</strong> ${esc(line)}</p>`).join('')}<div class="modal-actions"><button class="btn" id="gallery-prev" ${i?'':'disabled'}>Previous</button><button class="btn" id="gallery-next" ${i+1===panels.length?'disabled':''}>Next</button><button class="btn" id="gallery-back">Title screen</button></div>`,true,title);
      bindActions({'gallery-prev':()=>gallery(i-1),'gallery-next':()=>gallery(i+1),'gallery-back':title});
    }
    title();
  }
  function beginScene(index) {
    if(H.LEVELS[index] && progress.seenIntros.includes(H.LEVELS[index].id)){
      startLevel(index);
      return;
    }
    sceneIndex=index; sceneBeat=0; showScene();
  }
  function finishScene() {
    if(sceneIndex>H.LEVELS.length)showFinish();
    else if(sceneIndex===H.LEVELS.length)beginInterview();
    else {
      const id=H.LEVELS[sceneIndex].id;
      if(!progress.seenIntros.includes(id))progress.seenIntros.push(id);
      startLevel(sceneIndex);
    }
  }
  function comicSprite(atlasName, frameName, className) {
    const atlas=globalThis.HIRED_ASSET_META[atlasName];
    const frame=atlas.frames[frameName];
    const [width,height]=atlas.size;
    const style=[
      `background-image:url('${asset(atlas.image)}')`,
      `background-size:${width/frame.w*100}% ${height/frame.h*100}%`,
      `background-position:${frame.x/(width-frame.w)*100}% ${frame.y/(height-frame.h)*100}%`,
      `aspect-ratio:${frame.w}/${frame.h}`
    ].join(';');
    return `<div class="comic-sprite ${className}" style="${esc(style)}"></div>`;
  }
  function showScene() {
    setMode('scene');
    const scene=H.SCENES[sceneIndex], beat=scene.beats[sceneBeat];
    const last=sceneBeat===scene.beats.length-1;
    let nextLabel='Next panel';
    if(last){
      const nextLevel=H.LEVELS[sceneIndex];
      nextLabel=sceneIndex===3?'Play Final Interview HQ':nextLevel?'Play '+nextLevel.name:sceneIndex===H.LEVELS.length?'Enter the interview':'See your results';
    }
    const speaker=beat.speaker==='interviewer'?(E.interviewer||'Interview host'):beat.speaker;
    const fullPanel=Boolean(beat.panel&&H.PANELS?.ready.includes(beat.panel)&&(!beat.portrait||E.interviewer));
    const illustrated=fullPanel||Number.isInteger(beat.art);
    const panel=fullPanel
      ? `<div class="comic-illustration comic-panel" style="${esc(`background-image:url('${asset(beat.image || H.PANELS.folder+beat.panel+'.jpg')}')`)}"></div>`
      : illustrated
      ? `<div class="comic-illustration" style="${esc(`background-image:url('${asset('assets/production/story/manga-panels.webp')}');background-position:${beat.art%2*100}% ${Math.floor(beat.art/2)*50}%`)}"></div>`
      : `<div class="comic-frame"><img src="${asset('assets/production/backgrounds/'+scene.backdrop+'.webp')}" alt=""><div class="comic-rays"></div></div>
        <div class="comic-inset">${comicSprite('enemies',beat.prop,'comic-prop')}</div>
        ${comicSprite('hero',beat.pose,'comic-hero')}`;
    const upcoming=scene.beats[sceneBeat+1];
    if(upcoming?.panel && H.PANELS?.ready.includes(upcoming.panel) && (!upcoming.portrait||E.interviewer)) {
      new Image().src=asset(upcoming.image || H.PANELS.folder+upcoming.panel+'.jpg');
    }
    const line=(!E.interviewer && beat.neutralLine) || beat.line;
    const dialogue=beat.dialogue ? beat.dialogue.map(([who,words])=>`<strong>${esc(who)}</strong><p>${esc(progress.delivered && beat.panel==='office-1' && words==='Still in beta.' ? 'Yes. The calculator’s collection only now.' : words)}</p>`).join('') : line?`<strong>${esc(speaker)}</strong><p>${esc(line)}</p>`:'';
    const response=beat.reply?`<strong>${esc(E.applicant.split(' ')[0])}</strong><p>${esc(beat.reply)}</p>`:'';
    const overlay=$('overlay');
    overlay.className='overlay comic-overlay';
    overlay.setAttribute('aria-label',scene.title);
    $('status').textContent=scene.title;
    overlay.innerHTML=`<section class="comic" aria-labelledby="comic-title">
      <header class="comic-header"><h2 id="comic-title">${esc(beat.title || scene.title)}</h2><span>${sceneBeat+1} / ${scene.beats.length}</span></header>
      <div class="comic-art ${illustrated?'comic-illustrated':''} ${beat.burst?'comic-burst':''}" ${fullPanel?`role="img" aria-label="${esc(beat.alt)}"`:'aria-hidden="true"'}>
        ${panel}${beat.image && beat.panel==='p04-gatekeeper'?'<small class="comic-effect">(for illustrative purposes only)</small>':''}
        ${fullPanel?'':`<span class="comic-effect">${esc(beat.effect)}</span>`}
      </div>
      <div class="comic-dialogue" id="comic-dialogue">${dialogue}${response}${beat.after?`<p class="comic-after">${esc(beat.after)}</p>`:''}</div>
      <footer class="comic-actions">
        <button class="btn primary" id="scene-next" aria-describedby="comic-dialogue">${esc(nextLabel)}</button>
        <button class="btn" id="scene-prev" ${sceneBeat===0?'disabled':''}>Previous</button>
        <button class="comic-skip" id="scene-skip">Skip cutscene</button>
      </footer>
    </section>`;
    bindActions({
      'scene-next':()=>{if(last)finishScene();else{sceneBeat++;showScene();}},
      'scene-prev':()=>{sceneBeat--;showScene();},
      'scene-skip':finishScene
    });
    if(beat.burst)audio.effect('scene');
    requestAnimationFrame(()=>$('scene-next')?.focus({preventScroll:true}));
  }
  function assistRow() {return `<label class="toggle-row"><input id="assist-toggle" type="checkbox" ${progress.assist?'checked':''}><span>Relaxed mode<small>For hiring managers with a two o’clock. Contact damage is switched off.</small></span></label>`;}
  function bindAssist() {$('assist-toggle')?.addEventListener('change',e=>{progress.assist=e.target.checked;game.setAssist(progress.assist);save();});}
  function showWorlds(from=uiMode) {
    const back=(from==='worlds'||(typeof from!=='function'&&uiMode==='worlds'))?worldsBack:captureReturn(from);
    worldsBack=back;
    setMode('worlds');
    const ids=['application-alley','ship-it-city','growth-run','interview-hq'];
    modal('World directory',`<p class="eyebrow">CHOOSE YOUR STARTING POINT</p><h2>Four stages. One story.</h2><p class="muted">Start at the beginning or take a look around. Every world is open.</p><div class="world-grid">${H.LEVELS.map((l,i)=>`<button class="world-card" id="world-${i}"><img src="${asset(`assets/production/backgrounds/${ids[i]}.webp`)}" alt="">${progress.results[i]?'<span class="clear-badge">CLEARED</span>':''}<span>${String(i+1).padStart(2,'0')} / ${esc(l.name)}</span><small>${esc(l.subtitle)}</small></button>`).join('')}</div>${assistRow()}`,true,back);
    H.LEVELS.forEach((_,i)=>$('world-'+i).addEventListener('click',()=>beginScene(i)));bindAssist();
  }
  function startLevel(index, checkpoint=null) {
    if(!assetReport)return;
    audio.beat=0;
    game.start(index,{assist:progress.assist});
    if (!game.restoreCheckpoint(checkpoint)) delete progress.checkpoint;
    delete progress.pendingScene;
    progress.lastLevel=index;save();
    setMode('playing');$('game').focus({preventScroll:true});
    $('status').textContent=movementHelp();
    $('level-ribbon').textContent=`${String(index+1).padStart(2,'0')} / ${H.LEVELS[index].name.toUpperCase()}`;
    $('level-ribbon').classList.remove('hidden');
    clearTimeout(ribbonTimeout);ribbonTimeout=setTimeout(()=>$('level-ribbon').classList.add('hidden'),3200);
    if(audio.enabled && audio.ctx?.state!=='running')audio.start();
    updateHud();
  }
  function resume() {
    if(!game.state||game.state.mode!=='playing'){showHome();return;}
    setMode('playing');$('game').focus({preventScroll:true});
    $('status').textContent=movementHelp();
  }
  function showPause() {
    if(!game.state||game.state.mode!=='playing'){showHome();return;}
    setMode('pause');$('status').textContent='Paused. Take your time.';
    modal('Paused',`<p class="eyebrow">${esc(game.state.world.name)}</p><h2>Paused.</h2><p class="muted">Everything’s where you left it. Including the enemies.</p><div class="pause-actions"><button class="btn primary" id="resume-game">Back to the game</button><button class="btn" id="restart-level">Restart this world</button><button class="btn" id="pause-worlds">Choose a world</button><button class="btn" id="pause-help">How to play</button></div>${assistRow()}<div class="modal-actions"><button class="btn" id="pause-home">Back to desktop</button><button class="btn" id="pause-portfolio">Portfolio</button></div>`,false,resume);
    bindActions({'resume-game':resume,'restart-level':()=>startLevel(game.state.levelIndex),'pause-worlds':showWorlds,'pause-help':()=>showHelp('pause'),'pause-home':showHome,'pause-portfolio':()=>showPortfolio('pause')});bindAssist();
  }
  function returnTo(mode) {
    if(typeof mode==='function'){mode();return;}
    if(mode==='playing'||mode==='pause')showPause();
    else if((mode==='title'||mode==='gallery')&&titleBack)titleBack();
    else if(mode==='worlds')showWorlds(worldsBack);
    else if(mode==='complete')showComplete();
    else if(mode==='scene')showScene();
    else if(mode==='interview')showInterview();
    else if(mode==='finish')showFinish();
    else showHome();
  }
  function captureReturn(from=uiMode) {
    if(typeof from==='function')return from;
    const mode=typeof from==='string'?from:uiMode;
    // Capture the old back action by value, so nested help/portfolio windows
    // retrace their route instead of replacing it with a circular reference.
    if(mode==='help'){const back=helpBack;return()=>showHelp(back);}
    if(mode==='portfolio'){const back=portfolioBack;return()=>showPortfolio(back);}
    if(mode==='worlds'){const back=worldsBack;return()=>showWorlds(back);}
    return()=>returnTo(mode);
  }
  function showHelp(from=uiMode) {
    const back=from==='help'?helpBack:captureReturn(from);helpBack=back;
    setMode('help');
    modal('How to play',`<p class="eyebrow">A FEW GOOD MOVES</p><h2>You already know the way.</h2><div class="controls-grid"><div class="control-card"><strong>Move</strong><span class="key">A</span> <span class="key">D</span> or <span class="key">←</span> <span class="key">→</span></div><div class="control-card"><strong>Jump & double jump</strong><span class="key">Space</span> / <span class="key">W</span> / <span class="key">↑</span></div><div class="control-card"><strong>Dash</strong><span class="key">Shift</span> or <span class="key">X</span></div><div class="control-card"><strong>Pause</strong><span class="key">P</span> or <span class="key">Esc</span></div></div><ul class="help-list"><li>Hold jump for height. Tap again in the air for a second jump.</li><li>Land on an enemy or dash through it. Watch your dash meter recharge.</li><li>Dodge the CV Filter and the Algorithm, then strike while their shields are down. In Ship It City, dash through the three lit terminals in order.</li><li>Collect ideas and optional skill tokens. Defeat the boss to open the exit.</li><li>Computer terminals save your place on this browser. Retries are unlimited.</li><li>Hold Down and press Jump to drop through a floating platform. Look for the small briefcase on the high route in each world for a portfolio field note.</li></ul><p class="tiny-note">On a phone, use the controls below the game. Landscape gives the world more room. You can visit the portfolio at any time.</p><div class="modal-actions"><button class="btn primary" id="help-back">Got it</button></div>`,true,back);
    $('help-back').addEventListener('click',back);
  }
  function showPortfolio(from=uiMode) {
    const back=from==='portfolio'?portfolioBack:captureReturn(from);portfolioBack=back;
    setMode(from==='home'?'desktop-portfolio':'portfolio');
    const contact=safeLink(E.contactUrl);
    const skills = new Set([...Object.values(progress.results).flatMap(result=>result.skills), ...(game.state?.skills || [])]);
    const notes = [...skills].filter(id => E.fieldNotes?.[id]).map(id =>
      `<p><strong>${esc(E.skillProjects?.[id])}</strong> · ${esc(E.fieldNotes[id])}</p>`).join('');
    modal(E.applicant+' / Portfolio',`<div class="profile-heading"><img src="${asset('assets/production/characters/portrait-reference.png')}" alt="${esc(E.applicant)}"><div><p class="eyebrow">THE PERSON BEHIND THE PIXELS</p><h2>${esc(E.applicant)}</h2><p>Creative director & AI-native product builder</p></div></div><p>${esc(E.profile)}</p><ul class="experience-list">${(E.experience||[]).map(e=>`<li><strong>${esc(e.role)}</strong><span>${esc(e.company)}</span></li>`).join('')}</ul><div class="portfolio-grid">${E.portfolio.map(p=>`<article class="project-card"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>${p.work?`<p class="project-work">${esc(p.work)}</p>`:''}${safeLink(p.url)?`<a href="${esc(p.url)}" target="_blank" rel="noopener">Open ${esc(p.name)}</a>`:''}</article>`).join('')}</div>${notes?`<details class="field-notes"><summary>Your discovered field notes</summary>${notes}</details>`:''}<p class="tiny-note">Project walkthroughs are available on request.</p><div class="modal-actions">${contact?`<a class="btn primary" href="${esc(contact)}">Let's talk</a>`:''}${cvLink('portfolio-cv','btn')}<button class="btn" id="portfolio-back">Back</button></div>`,true,back);
    $('portfolio-back').addEventListener('click',back);
  }
  function finishLevel(event) {
    const old=progress.results[event.levelIndex];
    progress.results[event.levelIndex]={
      score:Math.max(Number(old?.score)||0,event.score),
      coins:Math.max(Number(old?.coins)||0,event.coins),
      skills:[...new Set([...(Array.isArray(old?.skills)?old.skills:[]),...event.skills])],
      bestTime:Math.min(Number(old?.bestTime)||Infinity,event.time),
      completed:true
    };
    delete progress.checkpoint;
    progress.pendingScene=event.levelIndex+1;
    progress.lastLevel=Math.min(H.LEVELS.length-1,progress.pendingScene);
    save();showComplete();
  }
  function showComplete() {
    if(!game.state){showHome();return;}
    setMode('complete');const s=game.state;
    $('status').textContent=storageAvailable?'World complete. Progress saved on this browser.':'World complete. Progress kept for this session.';
    const last=s.levelIndex===3;
    const bonus=s.world.collectibles.find(item=>item.kind==='bonus'&&item.collected);
    modal('World complete',`<p class="eyebrow">${esc(s.world.name)}</p><h2>${last?'You made it to the room.':(['Application received.','Shipped. On time. No ocean.'][s.levelIndex]||'Good work. Onwards.')}</h2><p>${last?'One final conversation. Choose what you would like to explore about the person behind the game.':'The route is clear. There is more to build, explore and talk about in the next world.'}</p><div class="result-strip"><div class="result-stat"><strong>${s.coins}</strong><span>IDEAS COLLECTED</span></div><div class="result-stat"><strong>${s.skills.length}/3</strong><span>SKILL TOKENS</span></div><div class="result-stat"><strong>${Math.round(s.time)}s</strong><span>YOUR TIME</span></div></div>${bonus?`<p class="bonus-result">Found · ${esc(bonus.title)}</p>`:''}<div class="modal-actions"><button class="btn primary" id="next-world">${last?'Enter the interview':'Next world'}</button><button class="btn" id="complete-worlds">World directory</button></div><div class="modal-actions"><button class="btn" id="replay-world">Replay this world</button><button class="btn" id="complete-portfolio">View portfolio</button></div>`,false,showWorlds);
    bindActions({'next-world':()=>beginScene(s.levelIndex+1),'complete-worlds':showWorlds,'replay-world':()=>startLevel(s.levelIndex),'complete-portfolio':()=>showPortfolio('complete')});
  }
  function beginInterview() {
    if(progress.pendingScene===H.LEVELS.length){delete progress.pendingScene;save();}
    interviewIndex=0; interviewChoice=null; interviewAnswers=[]; showInterview();
  }
  function showInterview() {
    setMode('interview');
    const q=E.interview[interviewIndex];
    modal('Final interview / A conversation',`<div class="interview-progress" aria-label="Question ${interviewIndex+1} of ${E.interview.length}">${E.interview.map((_,i)=>`<i class="${i<=interviewIndex?'done':''}"></i>`).join('')}</div><p class="eyebrow">CONVERSATION ${interviewIndex+1} / ${E.interview.length}</p><h2>${esc(q.question)}</h2><p class="muted">Choose a topic. There are no wrong answers. Those are my job.</p><div class="interview-answers">${q.answers.map((a,i)=>`<button class="btn answer-btn ${interviewChoice===i?'primary':''}" id="answer-${i}" aria-pressed="${interviewChoice===i}">${esc(a.label)}</button>`).join('')}</div>${interviewChoice!==null?`<div class="interview-response">${esc(q.answers[interviewChoice].text)}</div><div class="modal-actions"><button class="btn primary" id="interview-next">${interviewIndex===E.interview.length-1?'Finish the introduction':'Next topic'}</button></div>`:''}`,false,game.state?.mode==='complete'?showComplete:showHome);
    q.answers.forEach((_,i)=>$('answer-'+i).addEventListener('click',()=>{interviewChoice=i;showInterview();}));
    $('interview-next')?.addEventListener('click',()=>{interviewAnswers[interviewIndex]=q.answers[interviewChoice].label;interviewIndex++;interviewChoice=null;if(interviewIndex<E.interview.length)showInterview();else if(E.interviewer)beginScene(H.LEVELS.length+1);else showFinish();});
    if(interviewChoice!==null)requestAnimationFrame(()=>$('interview-next')?.focus({preventScroll:true}));
  }
  function showFinish() {
    setMode('finish');
    const complete=Object.keys(progress.results).filter(i=>progress.results[i]?.completed).length;
    const skills=new Set(Object.values(progress.results).flatMap(r=>Array.isArray(r.skills)?r.skills:[])).size;
    const project = E.portfolio.find(item => interviewAnswers.includes(item.name));
    const topics = interviewAnswers.map(esc).join(' · ');
    let contact = safeLink(E.contactUrl);
    if (contact?.startsWith('mailto:')) {
      const draft = new URL(contact);
      draft.searchParams.set('subject', [E.company, E.role, project?.name || 'HIRE.EXE'].filter(Boolean).join(' / '));
      draft.searchParams.set('body', 'Hi ' + E.applicant.split(' ')[0] + ',\n\nI played HIRE.EXE and picked ' + interviewAnswers.join(', ') + '. I’d like to talk about ');
      contact = draft.href;
    }
    modal('HIRE.EXE / Introduction complete',`<div class="success-icon" aria-hidden="true">✦</div><p class="eyebrow">THANKS FOR PLAYING</p><h2>${esc(E.applicant)} / ${esc(E.role)}</h2><p>${esc(E.finish)}</p><div class="interview-response"><strong>Your conversation notes</strong><br>${topics}</div><div class="result-strip"><div class="result-stat"><strong>${complete}/4</strong><span>WORLDS CLEARED</span></div><div class="result-stat"><strong>${skills}/12</strong><span>SKILL TOKENS</span></div></div><div class="modal-actions"><button class="btn primary" id="final-portfolio">Meet ${esc(E.applicant.split(' ')[0])}</button>${cvLink('final-cv','btn')}${contact?`<a class="btn" href="${esc(contact)}">Email ${esc(E.applicant.split(' ')[0])} (no form)</a>`:''}${safeLink(project?.url)?`<a class="btn" href="${esc(project.url)}" target="_blank" rel="noopener">Explore ${esc(project.name)}</a>`:''}</div><div class="modal-actions"><button class="btn" id="final-worlds">Explore the worlds</button><button class="btn" id="final-home">Return to Windows</button></div><p class="tiny-note">A playful application, with a fictional hiring journey.</p>`,false,showHome);
    bindActions({'final-portfolio':()=>showPortfolio('finish'),'final-worlds':showWorlds,'final-home':showHome});
  }

  // Small original synthesised score and effects. No audio files or network requests.
  // Each phrase uses MIDI pitches, with zero marking a rest. Bass changes every four steps.
  const scores=[
    {bpm:116,voice:'triangle',lead:[72,0,76,79,0,76,74,72,71,0,74,77,0,74,71,67,69,72,0,76,79,0,77,76,74,0,71,67,0,71,74,0],bass:[48,55,43,50,45,52,43,55]},
    {bpm:96,voice:'square',lead:[0,62,0,65,67,0,69,0,0,67,65,0,62,60,0,0,0,65,0,69,72,0,70,69,67,0,65,62,0,60,62,0],bass:[38,45,43,41,41,48,43,45]},
    {bpm:150,voice:'sawtooth',lead:[64,67,71,76,71,67,64,67,62,66,69,74,69,66,62,66,60,64,67,72,76,72,67,64,59,63,66,71,78,75,71,0],bass:[40,47,38,45,36,43,35,42]},
    {bpm:84,voice:'sine',lead:[67,0,0,71,74,0,69,0,66,0,69,0,73,0,0,0,67,0,71,74,78,0,76,0,74,0,71,0,67,0,0,0],bass:[43,50,42,49,40,47,43,50]}
  ];
  const hz = note => 440 * 2 ** ((note-69)/12);
  const audio={enabled:!progress.muted,ctx:null,timer:null,beat:0,
    async start(){
      if(!this.enabled)return;
      try{
        this.ctx ||= new (window.AudioContext||window.webkitAudioContext)();
        await this.ctx.resume();
        this.syncMusic();
      }catch(_){this.enabled=false;updateSound();}
    },
    syncMusic(){
      clearTimeout(this.timer);
      if(this.enabled && this.ctx?.state==='running' && uiMode==='playing')this.music();
    },
    tone(freq,duration=.09,type='square',volume=.025,slide=0){if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,slide),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.ctx.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.015);},
    music(){
      const score=scores[game.state.levelIndex], step=this.beat++ % score.lead.length;
      const seconds=30/score.bpm, note=score.lead[step];
      if(note)this.tone(hz(note),seconds*.82,score.voice,score.voice==='square'||score.voice==='sawtooth'?.011:.033);
      if(step%4===0)this.tone(hz(score.bass[step/4]),seconds*2.5,'triangle',.047);
      if(step%4===2)this.tone(90,.055,'sine',.035,38);
      this.timer=setTimeout(()=>this.music(),seconds*1000);
    },
    effect(type){const fx={jump:[400,.11,'square',.02,760],dash:[880,.1,'sawtooth',.012,220],coin:[1046,.09,'square',.018,1568],skill:[784,.22,'triangle',.06,1568],hurt:[220,.18,'sawtooth',.025,85],checkpoint:[523,.25,'triangle',.05,1046],stomp:[260,.1,'square',.03,120],bossHit:[140,.19,'square',.025,450],complete:[523,.45,'triangle',.06,1046],spring:[240,.2,'square',.02,980],bonus:[660,.28,'triangle',.05,1320],scene:[180,.32,'triangle',.04,540]};if(fx[type])this.tone(...fx[type]);}
  };
  function updateSound() {$('sound-button').textContent=audio.enabled?'Sound on':'Sound off';$('sound-button').setAttribute('aria-pressed',String(audio.enabled));}
  function updateHud() {
    const s=game.state;if(!s)return;
    $('world-count').textContent=`WORLD ${String(s.levelIndex+1).padStart(2,'0')} / 04`;
    const room = s.world.floorScenes?.[s.floor];
    $('world-name').textContent=room ? 'Floor '+(s.floor+1)+' · '+room.title : s.world.name;
    $('coin-count').textContent=String(s.coins).padStart(2,'0');
    $('skill-count').textContent=s.skills.length+'/3';
    const lives=s.assist?'RELAXED':'×'+s.lives;
    if($('lives').textContent!==lives){$('lives').textContent=lives;$('lives').setAttribute('aria-label',s.assist?'Relaxed mode, unlimited retries':s.lives+(s.lives===1?' life':' lives')+' left');}
    const health=s.player.health;
    if($('hearts').dataset.health!==String(health)){
      $('hearts').dataset.health=health;$('hearts').setAttribute('aria-label',health+' hearts');
      $('hearts').innerHTML=Array.from({length:3},(_,i)=>`<img src="${asset('assets/production/enemies/icons/heart.png')}" alt="" class="${i>=health?'empty':''}">`).join('');
    }
    $('dash-meter').firstElementChild.style.width=Math.max(0,Math.min(100,Math.round((1-s.player.dashCooldown/H.PHYSICS.dashCooldown)*100)))+'%';
  }
  let taunts=0;
  const bark = type => H.BARKS?.[type];
  function events() {
    let gameOver=null;
    for(const e of game.drainEvents()) {
      audio.effect(e.type);
      if(e.type==='hint'){
        const firstSteps=matchMedia('(pointer: coarse)').matches && game.state.levelIndex===0 && e.text.startsWith('Move with');
        toast(firstSteps?'Hold an arrow to run. Tap Jump, then tap again in the air.':e.text,4600);
      }
      if(e.type==='skill'){
        const note = e.item.secret && E.fieldNotes?.[e.skill.id];
        toast(note ? 'Field note · ' + note : [e.skill.title,E.skillProjects?.[e.skill.id]].filter(Boolean).join(' · '),note?6000:3700);
      }
      if(e.type==='bonus')toast(e.item.title+' · '+e.item.line,3800);
      if(e.type==='checkpoint'){
        progress.checkpoint=game.checkpointRecord();
        toast(save()?'Saved. First thing an editor learns. Usually the hard way.':'Checkpoint reached for this session.',2600);
      }
      if(e.type==='respawn'){const b=game.state.boss;const why=e.reason==='feed'?'The Feed scrolled past you.':b?.active&&bark(b.type)?.lose?bark(b.type).lose:e.reason==='fall'?'You fell into a gap in your CV.':'Unfortunately, on this occasion.';toast(why+(game.state.assist?' Back to the checkpoint.':` ${e.lives} ${e.lives===1?'life':'lives'} left.`),3400);}
      if(e.type==='gameOver'){toast('Game over. We’ve decided to start the process again from the beginning.',4200);gameOver=e.levelIndex;break;}
      if(e.type==='extraLife')toast(e.coins===50?'50 ideas. Extra life. Don’t tell While I’m Here.':`${e.coins} ideas. Another extra life.`,2800);
      if(e.type==='hurt'&&e.health>0&&!game.state.boss?.active)toast('Feedback received.',1300);
      if(e.type==='bossStart'){taunts=0;const b=bark(game.state.boss.type);if(b?.start)toast(b.start,3000);}
      if(e.type==='bossTelegraph'){const b=bark(e.type);if(b?.taunts&&taunts++%2===1)toast(b.taunts[(taunts>>1)%b.taunts.length],3000);}
      if(e.type==='bossHit'&&e.health>0){const b=bark(game.state.boss.type);const i=e.maxHealth-e.health-1;if(b?.hits)toast(b.hits[i%b.hits.length],2400);}
      if(e.type==='signoff')toast(bark(game.state.boss.type)?.signoffs?.[e.label]||e.label+' signed off.',3000);
      if(e.type==='welcome')toast('Your interview is through the doors.',3000);
      if(e.type==='bossOpening')toast(game.state.boss.type==='scopecreep'?'He’s stopped. Dash into him or jump on top.':bark(game.state.boss.type)?.opening||'Shield down! Stomp or dash now.',2400);
      if(e.type==='key'&&e.bell){toast('Ding. Somebody will see you now.',2600);continue;}
      if(e.type==='secret')toast('Secret room found · '+e.name,3200);
      if(e.type==='crash')toast('All-time high! Hold on…',2000);
      if(e.type==='key')toast(e.count<e.total?`Keyword found: ${e.word}. ${e.total-e.count} to go.`:`Keyword found: ${e.word}. The filter now believes you are qualified.`,2400);
      if(e.type==='gateOpen')toast(e.label+' open. Onwards.',2200);
      if(e.type==='chaseStart')toast('The Feed is behind you. Run!',2600);
      if(e.type==='chaseEnd')toast('You outran the Feed. It will have forgotten you by tomorrow.',3000);
      if(e.type==='bossPhase')toast(e.name+' has escalated this to a second stage. Faster warnings, shorter openings.',3000);
      if(e.type==='roundCleared')toast(`Round ${e.round} of 3 cleared. They’d like to see you again.`,2600);
      if(e.type==='bossDefeated')toast((bark(game.state.boss.type)?.defeat||'Review cleared.')+' The exit is open!',4200);
      if(e.type==='complete')finishLevel(e);
    }
    // Out of lives: the world starts again from its first screen, and the old checkpoint is forgotten.
    if(gameOver!==null){delete progress.checkpoint;startLevel(gameOver);}
  }
  function frame(now) {
    const dt=previousTime?Math.min(.1,(now-previousTime)/1000):0;previousTime=now;
    if(assetReport && !$('game-window').hidden){
      if(uiMode==='playing'){game.step(inputs(),dt);events();updateHud();}
      const s=uiMode==='home'||!game.state?preview.state:game.state;
      if(s===preview.state)s.player.animationTime=now/16.6667;
      renderer.draw(s,now/1000);
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener('keydown',e=>{
    if(!$('dos-start').hidden||uiMode==='boot'||e.ctrlKey||e.metaKey||e.altKey)return;
    // Keep keyboard focus inside the current modal.
    if(e.code==='Tab'&&uiMode!=='playing'&&uiMode!=='home'){
      const focusable=[...activeSurface().querySelectorAll('button:not([disabled]),a[href],input')];
      if(focusable.length){const first=focusable[0],last=focusable.at(-1);if(!activeSurface().contains(document.activeElement)){e.preventDefault();(e.shiftKey?last:first).focus();}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    }
    if(['Escape','KeyP'].includes(e.code)&&!e.repeat){e.preventDefault();if(uiMode==='playing')showPause();else if(uiMode==='pause')resume();else if(e.code==='Escape')(uiMode==='scene'?$('scene-skip'):$('dialog-close'))?.click();return;}
    if(uiMode!=='playing')return;
    if(e.target?.closest?.('button,a,input,select,textarea,[contenteditable="true"]'))return;
    const relevant=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','Space','ShiftLeft','ShiftRight','KeyX'];
    if(relevant.includes(e.code)){e.preventDefault();if(!keys.has(e.code)&&!e.repeat){if(['Space','ArrowUp','KeyW'].includes(e.code))jumpPressed=true;if(['ShiftLeft','ShiftRight','KeyX'].includes(e.code))dashPressed=true;}keys.add(e.code);}
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{clearInputs();if(uiMode==='playing')showPause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();if(uiMode==='playing')showPause();}});
  $('desktop').addEventListener('dragstart', event => event.preventDefault());
  document.querySelectorAll('[data-control]').forEach(button=>{
    const control=button.dataset.control;
    const release=e=>{if(pointers.get(e.pointerId)!==control)return;pointers.delete(e.pointerId);if(![...pointers.values()].includes(control)){touch.delete(control);button.classList.remove('is-held');}if(e.cancelable)e.preventDefault();};
    button.addEventListener('pointerdown',e=>{e.preventDefault();if(uiMode!=='playing'||(e.pointerType==='mouse'&&e.button!==0))return;pointers.set(e.pointerId,control);try{button.setPointerCapture(e.pointerId);}catch(_){}touch.add(control);button.classList.add('is-held');if(control==='jump')jumpPressed=true;if(control==='dash')dashPressed=true;});
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    button.addEventListener('contextmenu',e=>e.preventDefault());
  });
  $('worlds-button').addEventListener('click',()=>assetReport&&showWorlds());
  $('portfolio-button').addEventListener('click',()=>ready&&showPortfolio());
  $('help-button').addEventListener('click',()=>ready&&showHelp());
  $('home').addEventListener('click',()=>{if(ready){desktopReturn=['title','game-load'].includes(uiMode)?null:captureReturn(uiMode);showHome();}});
  $('pause-button').addEventListener('click',()=>{if(uiMode==='playing')showPause();else if(uiMode==='pause')resume();});
  updateSound();
  const unlockAudio=event=>{
    if(audio.enabled && audio.ctx?.state!=='running' && !event.target.closest?.('#sound-button'))audio.start();
  };
  document.addEventListener('click',unlockAudio,true);
  document.addEventListener('keydown',unlockAudio,true);
  $('sound-button').addEventListener('click',async()=>{audio.enabled=!audio.enabled;progress.muted=!audio.enabled;save();if(audio.enabled)await audio.start();else audio.syncMusic();updateSound();if(uiMode==='playing')$('game').focus({preventScroll:true});});
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game-window').requestFullscreen();}catch(_){toast('Full screen is unavailable here. Use your browser full-screen control.');}if(uiMode==='playing')$('game').focus({preventScroll:true});});
  $('title-edition').textContent=E.editionLabel;
  $('art-book-link').search = globalThis.location.search;
  document.title='HIRE.EXE | '+E.applicant;

  function dosStartup(){
    return new Promise(resolve=>{
      const prompt=$('dos-prompt'), state=$('dos-state'), skip=$('dos-skip');
      const timers=[];
      function finish(){
        timers.forEach(clearTimeout);
        document.removeEventListener('keydown',shortcut);
        skip.onclick=null;
        prompt.textContent='C:\\>WIN';
        state.textContent='Starting Windows 3.11…';
        skip.hidden=true;
        resolve();
      }
      function shortcut(e){if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();finish();}}
      skip.onclick=finish;
      document.addEventListener('keydown',shortcut);
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
      ['C:\\>','C:\\>W','C:\\>WI','C:\\>WIN'].forEach((line,i)=>{
        timers.push(setTimeout(()=>{prompt.textContent=line;},450+180*i));
      });
      timers.push(setTimeout(()=>{state.textContent='Starting Windows 3.11…';},1300));
      timers.push(setTimeout(()=>{$('dos-start').classList.add('windows-splash');},1500));
      timers.push(setTimeout(finish,2800));
    });
  }

  function revealDesktop(){
    $('dos-start').hidden=true;
    $('desktop').inert=false;
  }

  async function runStartup(force=false){
    let seen=false;
    try{seen=localStorage.getItem(bootKey)==='1';}catch{}
    if(force||!seen){
      const screen=$('dos-start');
      screen.hidden=false;screen.classList.remove('windows-splash');
      $('dos-skip').hidden=false;$('dos-state').textContent='';$('dos-prompt').textContent='';
      $('desktop').inert=true;
      await dosStartup();
      try{localStorage.setItem(bootKey,'1');}catch{}
    }
    revealDesktop();
  }
  async function boot(){
    renderer=new H.Renderer($('game'));
    await runStartup();
    ready=true;$('loading').classList.add('hidden');showHome();
    globalThis.HIRED_APP={get mode(){return uiMode;},get state(){return game.state;},get assets(){return assetReport;},get progress(){return JSON.parse(JSON.stringify(progress));}};
    requestAnimationFrame(frame);
  }
  boot();
})();
