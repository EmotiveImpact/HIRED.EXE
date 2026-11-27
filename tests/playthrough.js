/* Run against the real page. Observe simulation state, drive DOM inputs only.
   Use a private test origin. The portfolio edition is restored after each run. */
const frame = document.querySelector('iframe');
const statusLine = document.querySelector('#status');
const results = document.querySelector('#results');
const runButton = document.querySelector('#run');
const layout = document.querySelector('#layout');
const notes = line => { results.textContent += line + '\n'; };
const check = (value, message) => { if (!value) throw Error(message); };
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

async function until(test, message, timeout = 10000) {
  const end = performance.now() + timeout;
  while (!test()) {
    if (performance.now() > end) throw Error(message);
    await nextFrame();
  }
}

function inputDevice(win, isTouch) {
  const codes = { left:'ArrowLeft', right:'ArrowRight', jump:'Space', dash:'KeyX' };
  const held = new Set();
  function set(action, down, cancel = false) {
    if (held.has(action) === down) return;
    if (down) held.add(action); else held.delete(action);
    if (isTouch) {
      const target = win.document.querySelector('[data-control="'+action+'"]');
      const name = cancel ? 'pointercancel' : down ? 'pointerdown' : 'pointerup';
      target.dispatchEvent(new win.PointerEvent(name,{bubbles:true,cancelable:true,pointerType:'touch',
        pointerId:Object.keys(codes).indexOf(action)+1,buttons:down?1:0}));
    } else {
      win.document.querySelector('#game').dispatchEvent(new win.KeyboardEvent(down?'keydown':'keyup',
        {code:codes[action],bubbles:true,cancelable:true}));
    }
  }
  function release() { for (const action of [...held]) set(action,false); }
  function route(state) {
    const input = controller({state});
    set('left',!!input.left); set('right',!!input.right);
    if (input.jumpPressed) { set('jump',false); set('jump',true); }
    set('dash',!!input.dashPressed);
  }
  return {set,release,route};
}

async function run() {
  runButton.disabled = true; layout.disabled = true;
  results.textContent = ''; document.querySelector('#captures').replaceChildren();
  const touch = layout.value !== 'keyboard';
  const size = {keyboard:[1100,760],touch:[390,844],landscape:[844,390]}[layout.value];
  [frame.width,frame.height] = size;
  // A fresh iframe also ensures handlers and the frame clock are per run.
  const saveKey = 'hired-exe:v04:portfolio';
  const prior = localStorage.getItem(saveKey);
  localStorage.removeItem(saveKey);
  const loaded = new Promise(resolve => frame.addEventListener('load',resolve,{once:true}));
  frame.src = '../index.html?edition=portfolio';
  await loaded;
  let win = frame.contentWindow;
  const app = () => win.HIRED_APP;
  // A first visit opens on the intro; skipping it lands the title.
  const openTitle = async () => {
    click('start-game');
    await until(()=>['intro','title'].includes(app().mode),'Title screen missing');
    if(app().mode==='intro'){
      check(byId('overlay').querySelector('.intro-osd').textContent==='CH 1','Intro did not open on the first channel');
      click('intro-skip');
      await until(()=>app().mode==='title','Intro did not end on the title');
      check(byId('overlay').classList.contains('title-land'),'Title did not land after the intro');
    }
    check(byId('title-any').textContent==='Press any button to continue','Title prompt missing');
  };
  const byId = id => win.document.getElementById(id);
  const click = id => { const el=byId(id); check(el && !el.disabled,'Missing control: '+id); el.click(); };
  const shots = new Set();
  function capture(world) {
    const a = document.createElement('a');
    a.href = byId('game').toDataURL('image/jpeg',.88);
    a.download = 'world-'+world+'.jpg'; a.textContent = 'World '+world+' canvas capture ';
    document.querySelector('#captures').append(a); shots.add(world);
  }
  statusLine.textContent = 'Opening game';
  try {
    await until(()=>win.location.search === '?edition=portfolio' && app()?.mode === 'home','Title did not load');
    // The runner uses session-specific storage, including across the reload assertion.
    check(win.HIRED_EDITION.id === 'portfolio','Playtest storage must be isolated');
    check(byId('home-cv-pdf').getAttribute('href').endsWith('Augustus-Edem-CV.pdf'),'CV.PDF is missing from the title');
    check(!byId('skip-portfolio'),'Portfolio should not be on the desktop');
    await openTitle(); click('title-play');
    check(!app().assets.failed.length && app().assets.loaded.length===25,'Missing runtime art');
    check(app().mode==='scene' && !app().state,'Opening did not precede gameplay');
    click('scene-next');
    check(byId('overlay').textContent.includes('copy to mark mine against'),'Missing opening dialogue');
    check(!byId('portfolio-button'),'Portfolio should not be in the game');
    click('scene-prev'); for(let i=0;i<4;i++)click('scene-next');
    check(byId('overlay').querySelector('.comic-burst'),'Opening did not reach action panel');
    click('scene-next');
    check(app().mode==='playing' && app().state.tick===0,'Opening did not hand off to world one');
    notes('PASS opening, previous panel and comic breakout');
    if(app().state.assist){click('pause-button');byId('assist-toggle').click();click('resume-game');}
    click('pause-button'); const pausedTick=app().state.tick;
    await nextFrame(); await nextFrame(); check(app().state.tick===pausedTick,'Pause advanced simulation');
    click('pause-help'); click('help-back'); click('restart-level');
    const controls = inputDevice(win,touch);
    controls.set('right',true);
    await until(()=>app().state.player.x > 170,'Movement failed');
    controls.set('jump',true);
    await until(()=>app().state.player.vy < 0,'Jump failed');
    controls.set('jump',false);controls.set('jump',true);
    await until(()=>app().state.player.jumps === 2,'Double jump failed');
    controls.set('dash',true);
    await until(()=>app().state.player.dashTime > 0,'Dash failed');
    controls.set('right',false,true);controls.release();
    check(!win.document.querySelector('[data-control].is-held'),'Pointer release left a button held');
    click('pause-button');click('restart-level');
    check(app().state.coins===0 && app().state.checkpoint.id==='start','Restart retained run state');
    notes('PASS pause/help/return, movement, double jump, dash, cancellation and restart');
    let restored = false;
    for(let index=0;index<4;index++) {
      let lastTick=-1;
      const phases = new Set();
      const start=performance.now();
      while(app().mode==='playing'){
        const s=app().state;
        if(s.tick!==lastTick){
          if (index===0 && !restored && s.checkpoint.id!=='start') {
            const id = s.checkpoint.id, coins = app().progress.checkpoint.collected.length;
            controls.release();
            const load = new Promise(resolve => frame.addEventListener('load',resolve,{once:true}));
            win.location.reload(); await load; await until(()=>app()?.mode==='home','Checkpoint reload failed');
            check(byId('start-game').textContent.includes('checkpoint'),'Resume action missing');
            await openTitle(); click('title-play');
            check(app().state.checkpoint.id===id && app().state.world.collectibles.filter(i=>i.collected).length===coins,'Checkpoint snapshot lost');
            restored=true; notes('PASS checkpoint resume after reload'); lastTick=-1;
            continue;
          }
          lastTick=s.tick; phases.add(s.boss.phase); controls.route(s);
          if(!shots.has(index+1) && s.player.x > (index===1?4110:index===2?4220:850)) capture(index+1);
          if(s.tick%15<3) statusLine.textContent=s.world.name+' · '+Math.round(s.player.x)+' / '+s.world.width;
        }
        if(s.time>180 || performance.now()-start>240000)throw Error('Route stalled in '+s.world.name+' at '+s.player.x+' / '+s.boss.phase);
        await nextFrame();
      }
      controls.release();
      const s=app().state;
      check(app().mode==='complete' && s.completed && !s.boss.alive,'Portal did not complete world '+(index+1));
      check(s.coins>0 && s.world.checkpoints.every(cp=>cp.active),'Missing ideas or checkpoints');
      check(index===3 ? phases.has('welcome') : phases.has('attack'),'Encounter did not run');
      notes('PASS '+s.world.name+' | '+s.coins+' ideas, '+s.skills.length+' skills, '+s.deaths+' retries, '+s.time.toFixed(1)+' s');
      check(s.world.collectibles.some(item=>item.kind==='bonus'&&item.collected),'Missing bonus pickup in world '+(index+1));
      click('next-world');
      check(app().mode==='scene' && app().state===s,'Transition cutscene did not open');
      if(index===1)click('scene-skip');
      else {
        const beatCount=win.Hired.SCENES[index+1].beats.length;
        for(let beat=0;beat<beatCount;beat++)click('scene-next');
      }
      check(app().mode===(index===3?'interview':'playing'),'Scene did not hand off to its destination');
    }
    notes('PASS all four transition scenes, skip and four bonus pickups');
    for (const i of [0,0,1]) { click('answer-'+i); check(byId('interview-next'),'Missing interview response');click('interview-next'); }
    check(app().mode==='finish','Ending did not open');
    const ending=byId('overlay').textContent;
    for(const label of ['The creative background','Vlume','A project walkthrough'])check(ending.includes(label),'Ending lost '+label);
    const email=byId('overlay').querySelector('a[href^="mailto:"]');
    check(new URL(email.href).searchParams.get('body').includes('Vlume'),'Email lost interview topic');
    check(byId('final-cv').getAttribute('href')==='cv.html','CV is missing from the results');
    check(!byId('final-portfolio'),'Portfolio should not be on the ending');
    notes('PASS three interview answers, matching project and contextual email');
    const before=app().progress;
    const reloaded=new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
    win.location.reload(); await reloaded;
    await until(()=>app()?.mode==='home','Reload did not return to title');
    check(Object.keys(app().progress.results).length===4 && JSON.stringify(before.results)===JSON.stringify(app().progress.results),'Results did not survive reload ('+win.HIRED_EDITION.id+', '+Object.keys(app().progress.results).length+' saved worlds)');
    notes('PASS saved results after reload');
    await openTitle(); click('title-play'); check(app().mode==='scene' && byId('comic-title').textContent==='You’re up','Revisiting the interview skipped its cutscene');
    click('scene-skip'); check(app().mode==='interview','Completed interview could not be reopened');
    for(const i of [0,0,1]){click('answer-'+i);click('interview-next');}
    check(app().mode==='finish','Revisited ending missing');
    statusLine.textContent='PASS · '+layout.selectedOptions[0].text+' · four worlds and interview';
  } catch(error) { statusLine.textContent='FAIL · '+error.message; }
  finally {
    if (prior===null) localStorage.removeItem(saveKey); else localStorage.setItem(saveKey,prior);
    runButton.disabled=false;layout.disabled=false;
  }
}
runButton.addEventListener('click',run);
