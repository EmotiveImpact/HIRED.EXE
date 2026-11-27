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
      if (record?.level === progress.lastLevel && (H.LEVELS[record.level].checkpoints.some(cp => cp.id === record.checkpoint) || H.LEVELS[record.level].checkpointAliases[record.checkpoint]))
        progress.checkpoint = record;
      progress.delivered = saved.delivered === true;
      progress.muted = saved.muted === true;
      progress.introSeen = saved.introSeen === true;
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
  let desktopReturn=null, titleBack=null, titleWake=null, artworkLoad=null, assetReport=null;
  const keys = new Set(), touch = new Set();
  const pointers = new Map();
  let helpBack=showHome, worldsBack=showHome;
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
    if(!['boot','home'].includes(mode))desktopReturn=null;
    // Desktop programs keep running in their own windows while the game is open, as in Windows.
    const desktop=mode==='home'||mode==='boot';
    $('os-shell').hidden=!desktop;
    $('game-window').hidden=desktop;
    if(desktop)$('overlay').replaceChildren();
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
  function activeSurface(){ return $('overlay'); }
  function focusDialog() { requestAnimationFrame(()=>activeSurface().querySelector('button,a,input')?.focus({preventScroll:true})); }
  function modal(title,body,wide=false,onClose=showHome) {
    activeSurface().className='overlay';
    activeSurface().setAttribute('aria-label',title);
    activeSurface().innerHTML=`<section class="modal-window ${wide?'wide':''}"><header class="small-title"><span>${esc(title)}</span><button id="dialog-close" aria-label="Close this window">×</button></header><div class="modal-body">${body}</div></section>`;
    activeSurface().querySelector('#dialog-close').addEventListener('click',onClose);focusDialog();
  }
  // Desktop programs open as their own windows beside Program Manager. Each
  // returns a modal()-shaped opener, so Calculator and Sea Trial need no changes.
  const desktopApp=(id,opts={})=>(title,body,wide=false)=>H.wm.openApp({id,title,body,wide,...opts});
  // CALC001.PNG, archived Windows 3.x Calculator resource:
  // https://github.com/mRB0/many-windows-3.1-icons-in-png-format/blob/master/CALC001.PNG
  const CALC_ICON='<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAf0lEQVR4Ae2WAQqAQAgE9+k+zZ/ZAZIcRdYhUrQDQ9wFITJAIIQ41m9gMOtVZBoiLv3FsiK3FCQDqOpjp29kwq4HWAHDog2sNlGwgQaTDbiqukc1KD1nG4iogOrzgwbc+jMbYAN/aeCEvgZ8oNn+BsKPNADzy77n8besX0LewQYWnBFReoXS9wAAAABJRU5ErkJggg==" alt="">';
  const SUB_ICON='<span class="pm-glyph pm-glyph-sub">⚓</span>';
  const CV_PDF='assets/cv/Augustus-Edem-CV.pdf';
  let desktopLaunch=null;
  function openCv(path='cv.html'){
    const offline=globalThis.HIRED_EMBEDDED_CV, a=document.createElement('a');
    a.href=offline||path;
    if(offline)a.download='Augustus-Edem-CV.pdf';else{a.target='_blank';a.rel='noopener';}
    a.click();
  }
  // The running game is a task too, so the Task List can switch to it or end it.
  H.wm.extraTasks=()=>(game.state||desktopReturn)&&desktopLaunch?[{title:'HIRE.EXE',switchTo:()=>desktopLaunch(),end:()=>{game.state=null;desktopReturn=null;showHome();}}]:[];
  function showHome() {
    setMode('home');
    $('status').textContent='Ready to play';
    const hasProgress=Object.keys(progress.results).length>0||progress.seenIntros.length>0||progress.lastLevel>0||!!progress.checkpoint;
    const hasRun=game.state?.mode==='playing';
    const launchLabel=hasRun?'Resume this world':progress.checkpoint?'Continue from checkpoint':hasProgress?'Continue application':'Open application';
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
    function launch(){if(uiMode==='home')launchTitle(play,hasRun||hasProgress||!!reopen);}
    desktopLaunch=launch;
    const offlineCv=globalThis.HIRED_EMBEDDED_CV;
    const internet=E.id==='solved-001';
    // One Internet group icon per platform in the edition.
    const linkItems=(list,prefix)=>(list||[]).filter(l=>l&&l.name&&safeLink(l.url)?.startsWith('https://'))
      .map(l=>({id:prefix+(l.id||l.name).toLowerCase().replace(/[^a-z0-9]+/g,'-'),name:l.name,url:l.url,icon:l.id||l.name}));
    const platforms=linkItems(E.links,'desk-link-');
    // Projects in progress get a group of their own, one icon each.
    const working=linkItems(E.working,'desk-work-');
    const internetItems=[...(internet?['desk-netscape']:[]),...platforms.map(l=>l.id)];
    H.wm.init($('os-shell'),$('os-dialog'));
    H.progman($('os-files'),{
      licensee:E.applicant, organisation:E.company||'',
      items:H.track.items({
        'start-game':{label:'HIRE.EXE',sub:launchLabel,icon:`<img src="${asset('assets/production/enemies/icons/terminal.png')}" alt="">`,command:'C:\\HIRE\\HIRE.EXE',workdir:'C:\\HIRE',runs:['hire.exe','hire'],open:launch},
        ...(E.readme?{'home-readme':{label:'README.TXT',icon:H.notepad.icon,command:'NOTEPAD.EXE C:\\HIRE\\README.TXT',workdir:'C:\\HIRE',runs:['readme.txt','readme'],open:()=>H.notepad('README.TXT',E.readme)}}:{}),
        'home-cv-txt':{label:'CV.TXT',icon:H.notepad.icon,command:'NOTEPAD.EXE C:\\HIRE\\CV.TXT',workdir:'C:\\HIRE',runs:['notepad.exe','notepad','cv.txt'],open:()=>H.notepad('CV.TXT',globalThis.HIRED_CV_TXT)},
        // The CV as the PDF itself: it opens in the browser's own viewer, or downloads from the single-file build.
        'home-cv-pdf':{label:'CV.PDF',icon:H.linkIcon('CV.PDF'),href:offlineCv||CV_PDF,linkAttrs:offlineCv?'download="Augustus-Edem-CV.pdf"':'target="_blank" rel="noopener"',command:'C:\\HIRE\\CV.PDF',workdir:'C:\\HIRE',runs:['cv.pdf'],open:()=>openCv(CV_PDF)},
        'desk-sub':{label:'Submarine (final).exe',icon:SUB_ICON,command:'C:\\HIRE\\SUBMARIN.EXE',workdir:'C:\\HIRE',runs:['submarin.exe','submarin','submarine'],open:()=>H.seaTrial(desktopApp('sea-trial',{icon:SUB_ICON,iconId:'sea-icon'}),()=>{progress.delivered=true;save();})},
        'desk-setup':{label:'Hire Augustus.exe',icon:H.setupIcon,command:'A:\\SETUP.EXE',workdir:'A:\\',runs:['setup.exe','setup','hireaug.exe','hireaug','hireaugustus','hireedem.exe','hireedem'],open:()=>H.hireSetup({E,safeLink,openInternet:internetItems.length?()=>H.progman.openGroup('internet'):null})},
        'desk-jargon':{label:'Jargon',icon:H.jargonIcon,command:'JARGON.EXE',workdir:'C:\\WINDOWS',runs:['jargon.exe','jargon'],open:()=>H.jargon()},
        'desk-calc':{label:'Calculator',icon:CALC_ICON,command:'CALC.EXE',workdir:'C:\\WINDOWS',runs:['calc.exe','calc'],open:()=>H.desktopCalculator(desktopApp('calc',{icon:CALC_ICON,iconId:'calc-icon'}))},
        ...(internet?{'desk-netscape':{label:'Netscape Navigator',icon:'<span class="pm-glyph pm-glyph-navigator">N</span>',href:'https://solved.studio/',linkAttrs:'target="_blank" rel="noopener noreferrer"',command:'C:\\NETSCAPE\\NETSCAPE.EXE',workdir:'C:\\NETSCAPE',runs:['netscape.exe','netscape'],open:()=>window.open('https://solved.studio/','_blank','noopener,noreferrer')}}:{}),
        ...Object.fromEntries([...platforms,...working].map(l=>[l.id,{label:l.name,icon:H.linkIcon?.(l.icon)||`<span class="pm-glyph pm-glyph-link">${esc(l.name[0])}</span>`,href:l.url,linkAttrs:'target="_blank" rel="noopener noreferrer"',command:'C:\\NETSCAPE\\NETSCAPE.EXE '+l.url,workdir:'C:\\NETSCAPE',open:()=>window.open(l.url,'_blank','noopener,noreferrer')}]))
      }),
      groups:[
        // Only the applicant's own group starts open; the rest wait as icons along the bottom.
        {id:'main',title:E.applicant,file:'AUGUSTUS.GRP',state:'normal',items:[...(E.readme?['home-readme']:[]),'start-game','home-cv-txt','home-cv-pdf','desk-setup']},
        {id:'accessories',title:'Accessories',file:'ACCESSOR.GRP',items:['desk-calc']},
        {id:'games',title:'Games',file:'GAMES.GRP',items:['desk-jargon','desk-sub']},
        ...(internetItems.length?[{id:'internet',title:'Internet',file:'INTERNET.GRP',items:internetItems}]:[]),
        ...(working.length?[{id:'working',title:'Working On',file:'WORKING.GRP',items:working.map(l=>l.id)}]:[])
      ],
      hooks:{
        replayStartup:async()=>{await runStartup();H.progman.focus();audio.system('SystemStart');},
        exitWindows:()=>exitWindows(),
        help:(topic,then)=>H.winhelp(topic,then)
      }
    });
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
    let woken=false;
    function title(landing){
      setMode('title');titleBack=()=>title();titleWake?.();
      layer.className='overlay game-title'+(woken?'':' title-wait')+(landing===true?' title-land':'');
      layer.style.setProperty('--title-scene',`url("${asset('assets/production/backgrounds/application-alley.webp')}")`);
      layer.setAttribute('aria-label','HIRE.EXE title screen');
      layer.innerHTML=`<div class="title-hero" aria-hidden="true"><img class="title-actor" src="${esc(asset('assets/production/characters/title-hero.webp'))}" alt=""></div><section class="title-copy"><h1>HIRE<span>.EXE</span></h1><p>${esc(E.tagline||'A playable application by '+E.applicant)}</p><button class="btn primary" id="title-play">${continuing?'Continue game':'Start game'}</button><div class="title-links"><button id="choose-world">Choose a world</button><button id="replay-scenes">Replay cutscenes</button></div><p class="title-any" id="title-any">Press any button to continue</p></section>`;
      // The title waits for any key, click or tap, then offers its menu.
      const wake=e=>{
        if(e&&e.type==='keydown'&&(e.metaKey||e.ctrlKey||e.altKey||e.key==='Tab'||e.key==='Escape'))return;
        titleWake?.();
        if(uiMode!=='title'||!layer.classList.contains('title-wait'))return;
        if(e?.type==='keydown'){e.preventDefault();e.stopPropagation();}
        woken=true;layer.classList.remove('title-wait');focusDialog();
      };
      titleWake=()=>{document.removeEventListener('keydown',wake,true);layer.removeEventListener('pointerdown',wake);layer.removeEventListener('click',wake);};
      if(!woken){document.addEventListener('keydown',wake,true);layer.addEventListener('pointerdown',wake);layer.addEventListener('click',wake);}
      $('title-play').onclick=()=>{H.track(continuing?'Game continued':'Game started');play();};
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
      bindActions({'gallery-prev':()=>gallery(i-1),'gallery-next':()=>gallery(i+1),'gallery-back':()=>title()});
    }
    // A first visit opens on the intro; the title lands when it ends or is skipped.
    if(H.intro&&!continuing&&!progress.introSeen){
      setMode('intro');
      const how=await H.intro.play(layer,{asset,sound:name=>audio.effect('intro-'+name)});
      if(launch!==launchNumber||uiMode!=='intro')return;
      progress.introSeen=true;save();
      H.track(how==='skipped'?'Intro skipped':'Intro watched');
      title(true);
    } else title();
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
      ? `<div class="comic-illustration comic-panel" style="${esc(`background-image:url('${asset(beat.image || H.PANELS.folder+beat.panel+'.jpg')}')`)}"><span class="comic-panel-fill"></span><span class="comic-panel-art"></span></div>`
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
      'scene-skip':()=>{H.track('Cutscene skipped',scene.title);finishScene();}
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
    audio.at=0;
    game.start(index,{assist:progress.assist});
    H.track('World started',(index+1)+'. '+H.LEVELS[index].name);
    if (!game.restoreCheckpoint(checkpoint)) delete progress.checkpoint;
    delete progress.pendingScene;
    progress.lastLevel=index;save();
    setMode('playing');$('game').focus({preventScroll:true});
    $('status').textContent=movementHelp();
    $('level-ribbon').textContent=`${String(index+1).padStart(2,'0')} / ${H.LEVELS[index].name.toUpperCase()}`;
    $('level-ribbon').classList.remove('hidden');
    clearTimeout(ribbonTimeout);ribbonTimeout=setTimeout(()=>$('level-ribbon').classList.add('hidden'),3200);
    if(audio.enabled && !audio.running)audio.start();
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
    modal('Paused',`<p class="eyebrow">${esc(game.state.world.name)}</p><h2>Paused.</h2><p class="muted">Everything’s where you left it. Including the enemies.</p><div class="pause-actions"><button class="btn primary" id="resume-game">Back to the game</button><button class="btn" id="restart-level">Restart this world</button><button class="btn" id="pause-worlds">Choose a world</button><button class="btn" id="pause-help">How to play</button></div>${assistRow()}<div class="modal-actions"><button class="btn" id="pause-home">Back to desktop</button></div>`,false,resume);
    bindActions({'resume-game':resume,'restart-level':()=>startLevel(game.state.levelIndex),'pause-worlds':showWorlds,'pause-help':()=>showHelp('pause'),'pause-home':showHome});bindAssist();
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
    // Capture the old back action by value, so nested help and world windows
    // retrace their route instead of replacing it with a circular reference.
    if(mode==='help'){const back=helpBack;return()=>showHelp(back);}
    if(mode==='worlds'){const back=worldsBack;return()=>showWorlds(back);}
    return()=>returnTo(mode);
  }
  function showHelp(from=uiMode) {
    const back=from==='help'?helpBack:captureReturn(from);helpBack=back;
    setMode('help');
    modal('How to play',`<p class="eyebrow">A FEW GOOD MOVES</p><h2>You already know the way.</h2><div class="controls-grid"><div class="control-card"><strong>Move</strong><span class="key">A</span> <span class="key">D</span> or <span class="key">←</span> <span class="key">→</span></div><div class="control-card"><strong>Jump & double jump</strong><span class="key">Space</span> / <span class="key">W</span> / <span class="key">↑</span></div><div class="control-card"><strong>Dash</strong><span class="key">Shift</span> or <span class="key">X</span></div><div class="control-card"><strong>Pause</strong><span class="key">P</span> or <span class="key">Esc</span></div></div><ul class="help-list"><li>Hold jump for height. Tap again in the air for a second jump.</li><li>Land on an enemy or dash through it. Watch your dash meter recharge.</li><li>Dodge the CV Filter and the Algorithm, then strike while their shields are down. In Ship It City, dash through the three lit terminals in order.</li><li>Collect ideas and optional skill tokens. Defeat the boss to open the exit.</li><li>Computer terminals save your place on this browser. Retries are unlimited.</li><li>Hold Down and press Jump to drop through a floating platform. Look for the small briefcase on the high route in each world: it holds a skill token.</li></ul><p class="tiny-note">On a phone, use the controls below the game. Landscape gives the world more room. You can visit the portfolio at any time.</p><div class="modal-actions"><button class="btn primary" id="help-back">Got it</button></div>`,true,back);
    $('help-back').addEventListener('click',back);
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
    H.track('World finished',(event.levelIndex+1)+'. '+H.LEVELS[event.levelIndex].name);
  }
  function showComplete() {
    if(!game.state){showHome();return;}
    setMode('complete');const s=game.state;
    $('status').textContent=storageAvailable?'World complete. Progress saved on this browser.':'World complete. Progress kept for this session.';
    const last=s.levelIndex===3;
    const bonus=s.world.collectibles.find(item=>item.kind==='bonus'&&item.collected);
    modal('World complete',`<p class="eyebrow">${esc(s.world.name)}</p><h2>${last?'You made it to the room.':(['Application received.','Shipped. On time. No ocean.'][s.levelIndex]||'Good work. Onwards.')}</h2><p>${last?'One final conversation. Choose what you would like to explore about the person behind the game.':'The route is clear. There is more to build, explore and talk about in the next world.'}</p><div class="result-strip"><div class="result-stat"><strong>${s.coins}</strong><span>IDEAS COLLECTED</span></div><div class="result-stat"><strong>${s.skills.length}/3</strong><span>SKILL TOKENS</span></div><div class="result-stat"><strong>${Math.round(s.time)}s</strong><span>YOUR TIME</span></div></div>${bonus?`<p class="bonus-result">Found · ${esc(bonus.title)}</p>`:''}<div class="modal-actions"><button class="btn primary" id="next-world">${last?'Enter the interview':'Next world'}</button><button class="btn" id="complete-worlds">World directory</button><button class="btn" id="replay-world">Replay this world</button></div>`,false,showWorlds);
    bindActions({'next-world':()=>beginScene(s.levelIndex+1),'complete-worlds':showWorlds,'replay-world':()=>startLevel(s.levelIndex)});
  }
  function beginInterview() {
    if(progress.pendingScene===H.LEVELS.length){delete progress.pendingScene;save();}
    interviewIndex=0; interviewChoice=null; interviewAnswers=[]; showInterview();
    H.track('Interview reached');
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
    H.track('Game completed');
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
    modal('HIRE.EXE / Introduction complete',`<div class="success-icon" aria-hidden="true">✦</div><p class="eyebrow">THANKS FOR PLAYING</p><h2>${esc(E.applicant)} / ${esc(E.role)}</h2><p>${esc(E.finish)}</p><div class="interview-response"><strong>Your conversation notes</strong><br>${topics}</div><div class="result-strip"><div class="result-stat"><strong>${complete}/4</strong><span>WORLDS CLEARED</span></div><div class="result-stat"><strong>${skills}/12</strong><span>SKILL TOKENS</span></div></div><p class="tiny-note">A playful application, with a fictional hiring journey.</p><div class="modal-actions">${cvLink('final-cv','btn')}${contact?`<a class="btn" href="${esc(contact)}">Email ${esc(E.applicant.split(' ')[0])} (no form)</a>`:''}${safeLink(project?.url)?`<a class="btn" href="${esc(project.url)}" target="_blank" rel="noopener">Explore ${esc(project.name)}</a>`:''}<button class="btn" id="final-worlds">Explore the worlds</button><button class="btn" id="final-home">Return to Windows</button></div>`,false,showHome);
    bindActions({'final-worlds':showWorlds,'final-home':showHome});
  }

  // Music and effects: Sea Trial's 16-bit engine (src/sea-sound.js) playing a theme for each
  // world from src/game-sound.js. No audio files or network requests.
  const audio={enabled:!progress.muted,engine:null,at:0,chime:0,
    get running(){return this.engine?.state==='running';},
    // gesture: a click, tap or key press is behind this call. Without one (on opening the page)
    // the browser is only asked, and may well leave sound locked until the first press.
    async start(gesture=true){
      if(!this.enabled)return;
      try{
        this.engine ||= H.gameSound();
        await (gesture?this.engine.unlock():this.engine.wake());
        this.syncMusic();
        const due=this.chime;this.chime=0;
        if(due>performance.now())this.system('SystemStart');
      }catch(_){this.enabled=false;updateSound();}
    },
    // The desktop's system sounds (src/win-sound.js). The start-up fanfare belongs to the
    // moment the desktop appears. Sound that is still starting then (asked for on opening, or
    // unlocked by the press that skipped the start-up) gets a second to begin; a browser that
    // keeps sound locked gets silence. The fanfare never plays late: a press on the desktop
    // drops one that is still waiting (see unlockAudio).
    system(event){
      if(!this.enabled)return;
      if(!this.running){if(event==='SystemStart')this.chime=performance.now()+1000;return;}
      this.chime=0;
      winSounds.play(event,this.engine);
    },
    // The world's theme plays during play. A pause remembers the bar to carry on from,
    // and the fanfare for a cleared world is left to ring out over the results.
    syncMusic(){
      const sound=this.engine;
      if(!sound)return;
      sound.setMuted(!this.enabled);
      if(sound.log.length>200)sound.log.splice(0,100);
      const song=this.enabled&&this.running&&uiMode==='playing'&&game.state?H.gameSound.worlds[game.state.levelIndex]:null;
      if(song){if(sound.song!==song)sound.music(song,0,0,this.at);return;}
      if(H.gameSound.worlds.includes(sound.song)){this.at=sound.position-sound.position%16;sound.music(null);}
      else if(!this.enabled)sound.music(null);
    },
    effect(type){
      if(!this.enabled||!this.running)return;
      if(type==='complete'){this.at=0;this.engine.music('clear');return;}
      this.engine.effect(type);
    }
  };
  const winSounds=H.winSound();
  if(audio.enabled)winSounds.preload();
  H.wm.sound=event=>audio.system(event);
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
        toast(note ? 'Field note · ' + note : [E.skillTitles?.[e.skill.id]||e.skill.title,E.skillProjects?.[e.skill.id]].filter(Boolean).join(' · '),note?6000:3700);
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
    if(!$('dos-start').hidden||uiMode==='boot'||uiMode==='home'||e.ctrlKey||e.metaKey||e.altKey)return;
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
  $('help-button').addEventListener('click',()=>ready&&showHelp());
  $('home').addEventListener('click',()=>{if(ready){desktopReturn=['title','game-load'].includes(uiMode)?null:captureReturn(uiMode);showHome();}});
  $('pause-button').addEventListener('click',()=>{if(uiMode==='playing')showPause();else if(uiMode==='pause')resume();});
  updateSound();
  const unlockAudio=event=>{
    // A fanfare still waiting belongs to the desktop appearing, not to this press.
    audio.chime=0;
    if(audio.enabled && !audio.running && !event.target.closest?.('#sound-button'))audio.start();
  };
  document.addEventListener('click',unlockAudio,true);
  document.addEventListener('keydown',unlockAudio,true);
  $('sound-button').addEventListener('click',async()=>{audio.enabled=!audio.enabled;progress.muted=!audio.enabled;save();if(audio.enabled)await audio.start();else audio.syncMusic();updateSound();if(uiMode==='playing')$('game').focus({preventScroll:true});});
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game-window').requestFullscreen();}catch(_){toast('Full screen is unavailable here. Use your browser full-screen control.');}if(uiMode==='playing')$('game').focus({preventScroll:true});});
  $('title-edition').textContent=E.editionLabel;
  $('art-book-link').search = globalThis.location.search;
  document.title='HIRE.EXE | '+E.applicant;

  const DOS_LOG=$('dos-start').querySelector('.dos-log').innerHTML;
  // typed: WIN was entered at the MS-DOS prompt after Exit Windows, so go
  // straight to the blank screen and the splash.
  function dosStartup(typed=false){
    return new Promise(resolve=>{
      const prompt=$('dos-prompt'), state=$('dos-state'), skip=$('dos-skip');
      const timers=[], shift=typed?-1300:0;
      function finish(){
        timers.forEach(clearTimeout);
        document.removeEventListener('keydown',shortcut);
        skip.onclick=null;
        if(!typed){prompt.textContent='C:\\>WIN';state.textContent='Starting Windows…';}
        skip.hidden=true;
        resolve();
      }
      const skipped=()=>{if(!typed)H.track('Startup skipped');finish();};
      function shortcut(e){if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();skipped();}}
      skip.hidden=false;
      skip.onclick=skipped;
      setTimeout(()=>document.addEventListener('keydown',shortcut));
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
      if(!typed){
        ['C:\\>','C:\\>W','C:\\>WI','C:\\>WIN'].forEach((line,i)=>{
          timers.push(setTimeout(()=>{prompt.textContent=line;},450+180*i));
        });
        timers.push(setTimeout(()=>{state.textContent='Starting Windows…';},1300));
      }
      // As in 1992: WIN clears the screen to black, the splash holds while
      // Windows loads, then the screen blanks again before Program Manager.
      timers.push(setTimeout(()=>{$('dos-start').classList.add('windows-blank');},1500+shift));
      timers.push(setTimeout(()=>{$('dos-start').classList.add('windows-splash');},1850+shift));
      timers.push(setTimeout(()=>{$('dos-start').classList.remove('windows-splash');},4350+shift));
      timers.push(setTimeout(finish,4600+shift));
    });
  }

  function revealDesktop(){
    const screen=$('dos-start');
    screen.hidden=true;screen.classList.remove('dos-shell','windows-splash','windows-blank');
    $('dos-console')?.remove();$('dos-win')?.remove();
    $('desktop').inert=false;
  }

  // Windows boots on every page load, as a real PC did. Skip startup, Enter or
  // Escape cut it short, and Options > Replay startup runs it again.
  async function runStartup(){
    const screen=$('dos-start');
    screen.hidden=false;screen.classList.remove('windows-splash','windows-blank','dos-shell');
    screen.querySelector('.dos-log').innerHTML=DOS_LOG;$('dos-win')?.remove();
    $('dos-skip').hidden=false;$('dos-state').textContent='';$('dos-prompt').textContent='';
    $('desktop').inert=true;
    await dosStartup();
    revealDesktop();
  }

  // File > Exit Windows. Every program closes and the screen returns to MS-DOS,
  // just below the WIN that started Windows, with a fresh C:\> prompt. Typing
  // WIN starts Windows again.
  async function exitWindows(){
    audio.system('SystemExit');
    for(const rec of H.wm.windows())if(rec.id!=='progman')H.wm.remove(rec.id);
    game.state=null;desktopReturn=null;
    setMode('boot');
    await dosShell();
    await dosStartup(true);
    revealDesktop();
    showHome();
    audio.system('SystemStart');
  }
  function dosShell(){
    return new Promise(resolve=>{
      const screen=$('dos-start'), log=screen.querySelector('.dos-log');
      screen.hidden=false;screen.classList.remove('windows-splash','windows-blank');screen.classList.add('dos-shell');
      $('desktop').inert=true;$('dos-skip').hidden=true;$('dos-state').textContent='';
      if(!$('dos-prompt').textContent)$('dos-prompt').textContent='C:\\>WIN';
      const out=document.createElement('div');out.id='dos-console';
      out.innerHTML='<p class="dos-line"> </p><label class="dos-input-line"><span class="dos-typed">C:\\&gt;</span><span class="dos-cursor" aria-hidden="true">▮</span><input id="dos-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="120" aria-label="MS-DOS prompt. Type WIN and press Enter to start Windows."></label>';
      log.append(out);
      const helper=document.createElement('button');helper.id='dos-win';helper.type='button';helper.textContent='Type WIN to start Windows';
      screen.append(helper);
      const input=out.querySelector('input'), typed=out.querySelector('.dos-typed'), line=out.querySelector('.dos-input-line');
      let pending=null;
      const ps=()=>pending?pending.prompt:'C:\\>';
      const show=()=>{typed.textContent=ps()+input.value;fit();};
      const print=text=>{for(const row of String(text).split('\n')){const p=document.createElement('p');p.className='dos-line';p.textContent=row||' ';out.insertBefore(p,line);}
        fit();};
      // Old lines scroll off the top whole, as on a real text screen.
      function fit(){const rows=[...log.querySelectorAll('p')].filter(p=>p.textContent);
        while(rows.length&&(rows.length>40||log.scrollHeight>log.clientHeight+1)){const first=rows.shift();if(first.id){first.textContent='';first.hidden=true;}else first.remove();}
        log.scrollTop=log.scrollHeight;}
      const pad=(s,n)=>String(s).padEnd(n);
      const now=new Date(), two=n=>String(n).padStart(2,'0');
      const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()];
      const commands={
        cls:()=>{log.querySelectorAll('p').forEach(p=>{if(p.id){p.textContent='';p.hidden=true;}else if(!line.contains(p))p.remove();});},
        ver:()=>print('\nMS-DOS Version 5.00\n'),
        dir:()=>print(['',' Volume in drive C is HIRE',' Volume Serial Number is 1A2B-3C4D',' Directory of C:\\','',
          pad('COMMAND  COM',14)+'   47845 04-09-91   5:00a',pad('AUTOEXEC BAT',14)+'     133 03-10-92   9:14a',pad('CONFIG   SYS',14)+'     101 03-10-92   9:14a',
          pad('DOS',14)+'   <DIR>   03-10-92   9:02a',pad('WINDOWS',14)+'   <DIR>   03-10-92   9:05a',pad('HIRE',14)+'   <DIR>   03-10-92   9:30a',
          '        6 file(s)      48079 bytes','                   41287680 bytes free',''].join('\n')),
        help:()=>print(['','For more information on a specific command, type HELP command-name.','CLS      Clears the screen.','DATE     Displays or sets the date.','DIR      Displays a list of files and subdirectories in a directory.','TIME     Displays or sets the system time.','VER      Displays the MS-DOS version.','WIN      Starts Microsoft Windows.',''].join('\n')),
        date:()=>{print('Current date is '+day+' '+two(now.getMonth()+1)+'-'+two(now.getDate())+'-'+now.getFullYear());pending={prompt:'Enter new date (mm-dd-yy): '};},
        time:()=>{print('Current time is '+(now.getHours()%12||12)+':'+two(now.getMinutes())+':'+two(now.getSeconds())+'.00'+(now.getHours()<12?'a':'p'));pending={prompt:'Enter new time: '};},
        cd:()=>print('C:\\\n'),
        exit:()=>{}
      };
      const needsWindows=['hire','calc','progman','winhelp','taskman','submarin','netscape','control','write','notepad','jargon','setup','hireaug','hireaugustus','hireedem'];
      function run(raw){
        const text=raw.trim();
        print(ps()+raw);
        if(pending){pending=null;show();return;}
        const word=text.split(/\s+/)[0].toLowerCase().replace(/^c:\\/,'').replace(/\\$/,''), name=word.split('\\').pop().replace(/\.(exe|com|bat)$/,'');
        if(!text){print('');show();return;}
        if(name==='win'){finish();return;}
        if(commands[name])commands[name]();
        else if(needsWindows.includes(name))print('This program requires Microsoft Windows.\n');
        else print('Bad command or file name\n');
        show();
      }
      function finish(){
        input.blur();helper.remove();out.querySelector('.dos-input-line').remove();
        resolve();
      }
      input.addEventListener('input',show);
      input.addEventListener('keydown',e=>{
        if(e.key==='Enter'){e.preventDefault();const v=input.value;input.value='';run(v);}
        else if(e.key==='Escape'){e.preventDefault();print(ps()+input.value+'\\');input.value='';show();}
      });
      screen.addEventListener('pointerdown',e=>{if(!e.target.closest('button'))setTimeout(()=>input.focus({preventScroll:true}));});
      helper.addEventListener('click',()=>{input.value='WIN';show();setTimeout(()=>{input.value='';run('WIN');},180);});
      show();
      requestAnimationFrame(()=>input.focus({preventScroll:true}));
    });
  }
  async function boot(){
    renderer=new H.Renderer($('game'));
    // Ask for sound now, so that a browser that allows it has the fanfare ready for the desktop.
    audio.start(false);
    await runStartup();
    ready=true;$('loading').classList.add('hidden');showHome();
    audio.system('SystemStart');
    globalThis.HIRED_APP={get mode(){return uiMode;},get state(){return game.state;},get assets(){return assetReport;},get progress(){return JSON.parse(JSON.stringify(progress));},get sound(){const s=audio.engine;return s?{state:s.state,muted:s.muted,song:s.song,position:s.position,log:s.log.slice()}:null;}};
    requestAnimationFrame(frame);
  }
  boot();
})();
