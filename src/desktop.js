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
    modal('Submarine (final).exe', '<h2>Sea Trial</h2><p>Deliver one calculator. Hold Dive or Space to descend. Release to rise through the harbour gates.</p><canvas class="sea-view" width="320" height="118" aria-label="Harbour approach"></canvas><p role="status" id="sea-status">Ready at the quay.</p><button class="btn primary" id="sea-start">Cast off</button> <button class="btn sea-dive" disabled>Dive</button>');
    const canvas=document.querySelector('.sea-view'), ctx=canvas.getContext('2d');
    const start=document.querySelector('#sea-start'), dive=document.querySelector('.sea-dive'), status=document.querySelector('#sea-status');
    const gates=[{x:160,y:70},{x:275,y:44},{x:390,y:76},{x:520,y:49}];
    let distance=0, depth=52, held=false, running=false, previous=0, arrived=false;
    function rect(x,y,w,h,colour){ctx.fillStyle=colour;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
    function draw(){
      rect(0,0,320,118,'#81d9e2');rect(0,13,320,105,'#237790');rect(0,75,320,43,'#195873');
      for(let x=0;x<340;x+=18)rect(x-distance%18,14,10,2,'#b2f4da');
      for(const gate of gates){
        const x=gate.x-distance;
        rect(x,15,8,gate.y-38,'#39364e');rect(x,gate.y+23,8,118,'#39364e');
        rect(x-1,gate.y-25,10,3,'#ffca68');rect(x-1,gate.y+23,10,3,'#ffca68');
      }
      const buoy=644-distance;
      rect(buoy,8,3,10,'#ef655d');rect(buoy-4,17,12,4,'#f5dfa1');
      rect(34,depth-4,19,9,'#3a3049');rect(36,depth-3,16,6,'#efb14f');rect(51,depth-2,4,4,'#f5dfa1');rect(40,depth-8,5,5,'#f0b94f');rect(31,depth-3,3,7,'#df8552');
      if(arrived){rect(45,depth-9,5,7,'#d7cce3');rect(46,depth-8,3,2,'#426858');}
    }
    function stop(message){running=false;held=false;dive.disabled=true;start.hidden=false;start.textContent='Try again';status.textContent=message;}
    function tick(now){
      if(!running||!canvas.isConnected)return;
      const dt=previous?Math.min((now-previous)/1000,0.05):0;previous=now;
      distance+=22*dt;depth=Math.max(20,Math.min(109,depth+(held?43:-33)*dt));
      if(gates.some(g=>g.x-distance<55 && g.x+8-distance>31 && (depth-8<g.y-23 || depth+5>g.y+23)))stop('Clipped a harbour gate. Have another go.');
      if(distance>=600){distance=600;if(depth<=23){arrived=true;delivered();stop('Delivery complete. One pocket calculator.');start.textContent='Play again';}else status.textContent='Release Dive to surface beside the buoy.';}
      draw();if(running)requestAnimationFrame(tick);
    }
    start.onclick=()=>{distance=0;depth=52;previous=0;held=false;arrived=false;running=true;start.hidden=true;dive.disabled=false;dive.focus();status.textContent='Under way.';requestAnimationFrame(tick);};
    for(const surface of [dive,canvas]){
      surface.onpointerdown=e=>{if(running){e.preventDefault();dive.focus();surface.setPointerCapture(e.pointerId);held=true;}};
      surface.onpointerup=surface.onlostpointercapture=surface.onpointercancel=()=>{held=false;};
    }
    dive.onkeydown=e=>{if(e.code==='Space'){e.preventDefault();held=true;}};
    dive.onkeyup=e=>{if(e.code==='Space'){e.preventDefault();held=false;}};
    dive.onblur=()=>{held=false;};
    draw();
  };
})(globalThis.Hired);
