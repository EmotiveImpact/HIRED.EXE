(function (H) {
  'use strict';
  H.desktopCalculator = function (modal, unlocked) {
    const keys = ['7','8','9','÷','4','5','6','×','1','2','3','−','C','0','.','+','='];
    modal('Calculator', '<output class="calc-display">0</output><div class="calc-keys">' +
      keys.map(key => '<button class="btn">'+key+'</button>').join('') + '</div>' +
      (unlocked ? '<details><summary>History</summary>£4,000,000 ÷ 1 download = £4,000,000 per download</details>' : ''));
    const output = document.querySelector('.calc-display');
    let first = 0, operation = '', fresh = true;
    const operations = {'+':(a,b)=>a+b,'−':(a,b)=>a-b,'×':(a,b)=>a*b,'÷':(a,b)=>a/b};
    function press(key) {
      if (key === 'C') { output.value='0'; first=0; operation=''; fresh=true; return; }
      if (/^[0-9.]$/.test(key)) {
        let value = fresh ? '0' : output.value;
        if (key === '.' && value.includes('.')) return;
        if (value.length < 14) output.value = value === '0' && key !== '.' ? key : value + key;
        fresh=false; return;
      }
      if (!(key in operations) && key !== '=') return;
      if (operation && !fresh) {
        const result=operations[operation](first,Number(output.value));
        output.value=Number.isFinite(result)?String(Number(result.toPrecision(12))):'Error';
      }
      first=Number(output.value);
      operation=key==='=' || !Number.isFinite(first)?'':key;
      fresh=true;
    }
    const grid=document.querySelector('.calc-keys');
    grid.onclick=e=>{if(e.target.tagName==='BUTTON')press(e.target.textContent);};
    grid.closest('.modal-window').onkeydown=e=>{
      const key=({'/':'÷','*':'×','-':'−','Enter':'=','Delete':'C'})[e.key]||e.key;
      if (e.key==='Enter' && e.target.tagName==='BUTTON')return;
      if(keys.includes(key)){e.preventDefault();press(key);}
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
