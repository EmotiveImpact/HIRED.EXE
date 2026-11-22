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
})(globalThis.Hired);
