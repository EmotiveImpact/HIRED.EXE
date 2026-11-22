(function (H) {
  'use strict';
  H.desktopCalculator = function (modal, unlocked) {
    const keys = ['MC','MR','MS','M+','M−','←','CE','C','±','√','7','8','9','÷','%','4','5','6','×','1/x','1','2','3','−','=','0','.','+'];
    const operations = {'+':(a,b)=>a+b,'−':(a,b)=>a-b,'×':(a,b)=>a*b,'÷':(a,b)=>a/b};
    modal('Calculator', '<section class="standard-calc"><div class="calc-readout"><small class="calc-expression"></small><output class="calc-display" aria-label="Result">0</output></div><div class="calc-keys">' +
      keys.map(key=>'<button type="button" data-key="'+key+'">'+key+'</button>').join('') +
      '</div><details><summary>History</summary><ol class="calc-history"></ol></details></section>');
    const app=document.querySelector('.standard-calc');
    const display=app.querySelector('output'), expression=app.querySelector('.calc-expression');
    const history=app.querySelector('ol');
    if(unlocked)record('£4,000,000 ÷ 1 download = £4,000,000 per download');
    let memory=0, lhs=0, op='', repeat='', rhs=0, entering=false, supplied=false, caption='';
    function record(line){
      const item=document.createElement('li'); item.textContent=line; history.prepend(item);
      if(history.children.length>30)history.lastElementChild.remove();
    }
    function format(n){return Number.isFinite(n)?String(Number(n.toPrecision(13))):'Error';}
    function clear(){lhs=0;op='';repeat='';rhs=0;entering=false;supplied=false;caption='';display.value='0';}
    function result(n){display.value=format(n);entering=false;supplied=true;}
    function calculate(symbol,b){
      caption=lhs+' '+symbol+' '+b+' =';
      result(operations[symbol](lhs,b)); record(caption+' '+display.value); lhs=Number(display.value);
    }
    function press(k){
      let n=Number(display.value);
      if(k==='C'){clear();return;}
      if(k==='MC'){memory=0;return;}
      if(!Number.isFinite(n)){
        if(!/^[0-9.]$/.test(k)&&!['CE','MR'].includes(k))return;
        clear();n=0;
      }
      if(/^[0-9.]$/.test(k)){
        if(!entering){display.value='0';entering=true;if(!op){repeat='';caption='';}}
        const s=display.value;
        if(k==='.' && s.includes('.'))return;
        if(s.length<15)display.value=s==='0'&&k!=='.'?k:s+k;
        supplied=true;return;
      }
      if(k==='CE'){result(0);repeat='';caption='';return;}
      if(k==='←'){if(entering)display.value=display.value.slice(0,-1).replace(/^-$|^$/,'0');return;}
      if(k==='MR'){result(memory);repeat='';return;}
      if(k==='MS'){memory=n;return;}
      if(k==='M+'||k==='M−'){const sum=memory+(k==='M+'?n:-n);if(Number.isFinite(sum))memory=Number(format(sum));return;}
      if(['±','√','1/x','%'].includes(k)){
        const values={'±':-n,'√':Math.sqrt(n),'1/x':1/n,'%':(op==='+'||op==='−'?lhs:1)*n/100};
        result(values[k]);repeat='';return;
      }
      if(k in operations){
        if(op && supplied)calculate(op,n);
        if(display.value==='Error')return;
        lhs=Number(display.value);op=k;caption=lhs+' '+op;entering=false;supplied=false;repeat='';return;
      }
      if(k==='=' && (op||repeat)){
        if(op){repeat=op;rhs=supplied?n:lhs;}
        calculate(repeat,rhs);op='';
      }
    }
    function input(k){press(k);expression.textContent=[memory?'M':'',caption].filter(Boolean).join('   ');}
    app.querySelector('.calc-keys').onclick=e=>{if(e.target.dataset.key)input(e.target.dataset.key);};
    const win=app.closest('.modal-window');
    win.tabIndex=-1;
    requestAnimationFrame(()=>win.focus({preventScroll:true}));
    win.onkeydown=e=>{
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      if(e.key==='Enter' && (e.target.id==='dialog-close'||e.target.tagName==='SUMMARY'))return;
      const k=({'/':'÷','*':'×','-':'−',Enter:'=',Delete:'CE',Backspace:'←',c:'C',C:'C'})[e.key]||e.key;
      if(keys.includes(k)){e.preventDefault();input(k);}
    };
  };
  H.seaTrial = function (modal, delivered) {
    modal('Submarine (final).exe', '<h2>Sea Trial</h2><p>Deliver one calculator. Hold Dive or Space to descend. Release to rise through the harbour gates. Press Fire or X to shoot the targets.</p><canvas class="sea-view" width="320" height="118" aria-label="Harbour approach"></canvas><p role="status" id="sea-status">Ready at the quay.</p><div class="sea-controls"><button class="btn primary" id="sea-start">Cast off</button><button class="btn sea-dive" disabled>Dive</button><button class="btn sea-fire" id="sea-fire" disabled>Fire</button></div>');
    const canvas=document.querySelector('.sea-view'), ctx=canvas.getContext('2d');
    const start=document.querySelector('#sea-start'), dive=document.querySelector('.sea-dive'), fire=document.querySelector('#sea-fire'), status=document.querySelector('#sea-status');
    const win=canvas.closest('.modal-window');
    const gates=[{x:160,y:70},{x:275,y:44},{x:390,y:76},{x:520,y:49}];
    // Moored practice targets sit between the gates at different depths.
    const marks=[{x:118,y:68},{x:228,y:88},{x:338,y:33},{x:458,y:92}];
    const SUB_NOSE=55, SHOT_SPEED=170, COOLDOWN=0.2;
    let distance=0, depth=52, running=false, previous=0, arrived=false, clock=0;
    let diveKey=false, fireKey=false, fireQueued=false, cooldown=0, flash=0, hits=0, fired=0;
    let targets=[], shots=[], bursts=[];
    const divePointers=new Set(), firePointers=new Set();
    const diving=()=>diveKey||divePointers.size>0, firing=()=>fireKey||firePointers.size>0;
    function rect(x,y,w,h,colour){ctx.fillStyle=colour;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
    function targetY(t){return t.y+Math.round(Math.sin(clock*2.4+t.x)*2);}
    function blocked(x,y){return gates.some(g=>x>=g.x && x<=g.x+8 && (y<g.y-23 || y>g.y+23));}
    function burst(x,y,colours,count){for(let i=0;i<count;i++){const a=i/count*Math.PI*2;bursts.push({x,y,vx:Math.cos(a)*40,vy:Math.sin(a)*40,life:0.35,colour:colours[i%colours.length]});}}
    function draw(){
      rect(0,0,320,118,'#81d9e2');rect(0,13,320,105,'#237790');rect(0,75,320,43,'#195873');
      for(let x=0;x<340;x+=18)rect(x-distance%18,14,10,2,'#b2f4da');
      for(const t of targets){
        if(t.hit)continue;
        const x=t.x-distance, y=targetY(t);
        if(x<-8||x>328)continue;
        rect(x,y+5,1,118,'#163f52');
        rect(x-3,y-4,7,9,'#ef655d');rect(x-4,y-3,9,7,'#ef655d');rect(x-2,y-2,5,5,'#fff4dc');rect(x-1,y-1,3,3,'#ef655d');
      }
      for(const gate of gates){
        const x=gate.x-distance;
        rect(x,15,8,gate.y-38,'#39364e');rect(x,gate.y+23,8,118,'#39364e');
        rect(x-1,gate.y-25,10,3,'#ffca68');rect(x-1,gate.y+23,10,3,'#ffca68');
      }
      const buoy=644-distance;
      rect(buoy,8,3,10,'#ef655d');rect(buoy-4,17,12,4,'#f5dfa1');
      for(const s of shots){const x=s.x-distance;rect(x-6,s.y,6,1,'#b2f4da');rect(x,s.y-1,6,3,'#fff4c2');rect(x+6,s.y-1,2,3,'#ffca68');}
      for(const b of bursts)rect(b.x-distance,b.y,2,2,b.colour);
      rect(34,depth-4,19,9,'#3a3049');rect(36,depth-3,16,6,'#efb14f');rect(51,depth-2,4,4,'#f5dfa1');rect(40,depth-8,5,5,'#f0b94f');rect(31,depth-3,3,7,'#df8552');
      if(flash>0){rect(SUB_NOSE,depth-2,3,4,'#fff4c2');rect(SUB_NOSE+3,depth-1,2,2,'#ffca68');}
      if(arrived){rect(45,depth-9,5,7,'#d7cce3');rect(46,depth-8,3,2,'#426858');}
    }
    function releaseControls(){diveKey=false;fireKey=false;fireQueued=false;divePointers.clear();firePointers.clear();fire.classList.remove('is-held');}
    function stop(message){running=false;releaseControls();dive.disabled=true;fire.disabled=true;start.hidden=false;start.textContent='Try again';status.textContent=message;}
    function shoot(){
      shots.push({x:distance+SUB_NOSE+1,y:Math.round(depth)-1});
      cooldown=COOLDOWN;flash=0.06;fireQueued=false;canvas.dataset.shots=++fired;
    }
    function updateShots(dt){
      for(const s of shots){
        const from=s.x;s.x+=SHOT_SPEED*dt;
        for(let x=from;x<=s.x && !s.done;x+=2){
          if(blocked(x+7,s.y)){s.done=true;burst(x+7,s.y,['#ffca68','#fff4c2'],4);break;}
          for(const t of targets){
            if(t.hit)continue;
            const ty=targetY(t);
            if(Math.abs(x+7-t.x)<=4 && s.y+1>=ty-4 && s.y-1<=ty+4){
              t.hit=true;s.done=true;hits++;canvas.dataset.hits=hits;
              burst(t.x,ty,['#ef655d','#fff4dc','#ffca68'],8);
              status.textContent='Target hit. '+hits+' of '+targets.length+'.';
              break;
            }
          }
        }
        if(s.x-distance>330)s.done=true;
      }
      shots=shots.filter(s=>!s.done);
      for(const b of bursts){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;}
      bursts=bursts.filter(b=>b.life>0);
    }
    function tick(now){
      if(!running||!canvas.isConnected)return;
      const dt=previous?Math.min((now-previous)/1000,0.05):0;previous=now;clock+=dt;
      distance+=22*dt;depth=Math.max(20,Math.min(109,depth+(diving()?43:-33)*dt));
      cooldown=Math.max(0,cooldown-dt);flash=Math.max(0,flash-dt);
      if((fireQueued||firing()) && cooldown===0)shoot();
      updateShots(dt);
      if(gates.some(g=>g.x-distance<55 && g.x+8-distance>31 && (depth-8<g.y-23 || depth+5>g.y+23)))stop('Clipped a harbour gate. Have another go.');
      if(distance>=600){distance=600;if(depth<=23){arrived=true;delivered();stop('Delivery complete. One pocket calculator. Targets hit: '+hits+' of '+targets.length+'.');start.textContent='Play again';}else status.textContent='Release Dive to surface beside the buoy.';}
      draw();if(running)requestAnimationFrame(tick);
    }
    start.onclick=()=>{
      distance=0;depth=52;previous=0;clock=0;arrived=false;running=true;
      releaseControls();cooldown=0;flash=0;hits=0;fired=0;shots=[];bursts=[];targets=marks.map(t=>({...t,hit:false}));canvas.dataset.hits=0;canvas.dataset.shots=0;
      start.hidden=true;dive.disabled=false;fire.disabled=false;dive.focus();status.textContent='Under way.';requestAnimationFrame(tick);
    };
    for(const surface of [dive,canvas]){
      surface.onpointerdown=e=>{if(running){e.preventDefault();dive.focus();surface.setPointerCapture(e.pointerId);divePointers.add(e.pointerId);}};
      surface.onpointerup=surface.onlostpointercapture=surface.onpointercancel=e=>{divePointers.delete(e.pointerId);};
    }
    // Fire is a separate control so one thumb can hold Dive while the other shoots.
    fire.onpointerdown=e=>{
      if(!running||(e.pointerType==='mouse'&&e.button!==0))return;
      e.preventDefault();
      try{fire.setPointerCapture(e.pointerId);}catch(_){}
      firePointers.add(e.pointerId);fireQueued=true;fire.classList.add('is-held');
    };
    fire.onpointerup=fire.onlostpointercapture=fire.onpointercancel=e=>{firePointers.delete(e.pointerId);if(!firePointers.size)fire.classList.remove('is-held');};
    fire.onclick=e=>{if(running&&e.detail===0)fireQueued=true;};
    fire.oncontextmenu=e=>e.preventDefault();
    dive.onkeydown=e=>{if(e.code==='Space'){e.preventDefault();diveKey=true;}};
    dive.onkeyup=e=>{if(e.code==='Space'){e.preventDefault();diveKey=false;}};
    dive.onblur=()=>{diveKey=false;};
    win.addEventListener('keydown',e=>{
      if(e.code!=='KeyX'||e.ctrlKey||e.metaKey||e.altKey||!running)return;
      e.preventDefault();if(!e.repeat){fireKey=true;fireQueued=true;}
    });
    win.addEventListener('keyup',e=>{if(e.code==='KeyX')fireKey=false;});
    win.addEventListener('focusout',e=>{if(!win.contains(e.relatedTarget))fireKey=false;});
    targets=marks.map(t=>({...t,hit:false}));
    draw();
  };
})(globalThis.Hired);
