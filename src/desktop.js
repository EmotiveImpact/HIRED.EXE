(function (H) {
  'use strict';
  H.desktopCalculator = function (modal) {
    // Windows 3.1's Standard Calculator: a memory column, the number pad, the operators, and
    // C, CE and Back above them. The keys keep their proper symbols inside (data-key) and wear
    // the captions the real one had.
    const pad = ['MC','7','8','9','÷','√','MR','4','5','6','×','%','MS','1','2','3','−','1/x','M+','0','±','.','+','='];
    const top = ['C','CE','←'];
    const keys = [...top, ...pad];
    const captions = {'←':'Back','÷':'/','×':'*','−':'-','√':'sqrt','±':'+/-'};
    const spoken = {'←':'Backspace','÷':'Divide','×':'Multiply','−':'Subtract','√':'Square root','±':'Change sign'};
    const tint = k => top.includes(k) ? 'calc-clear' : /^M|^[÷×−+=]$/.test(k) ? 'calc-red' : ['√','%','1/x'].includes(k) ? 'calc-navy' : 'calc-digit';
    const button = k => '<button type="button" class="'+tint(k)+'" data-key="'+k+'"'+(spoken[k]?' aria-label="'+spoken[k]+'"':'')+'>'+(captions[k]||k)+'</button>';
    const operations = {'+':(a,b)=>a+b,'−':(a,b)=>a-b,'×':(a,b)=>a*b,'÷':(a,b)=>a/b};
    let win = null;
    const copy = () => navigator.clipboard?.writeText(display.value).catch(()=>{});
    const paste = () => navigator.clipboard?.readText().then(text=>{
      for(const ch of text.trim())if(/[0-9.]/.test(ch))input(ch);
    }).catch(()=>{});
    modal('Calculator', '<section class="standard-calc"><output class="calc-display" aria-label="Result" data-whole>0</output>' +
      '<div class="calc-top"><span class="calc-memory" aria-label="Memory"></span><span class="calc-clears">' + top.map(button).join('') + '</span></div>' +
      '<div class="calc-keys">' + pad.map(button).join('') + '</div>' +
      '<details><summary>History</summary><ol class="calc-history"></ol></details></section>', false, {menu:[
      { label: '&Edit', id: 'calc-edit', items: () => [
        { label: '&Copy', key: 'Ctrl+C', id: 'calc-copy', disabled: !navigator.clipboard?.writeText, action: copy },
        { label: '&Paste', key: 'Ctrl+V', id: 'calc-paste', disabled: !navigator.clipboard?.readText, action: paste }
      ] },
      { label: '&View', id: 'calc-view', items: () => [
        { label: '&Scientific', disabled: true },
        { label: 'S&tandard', checked: true },
        '-',
        { label: '&History', id: 'calc-history-menu', checked: details.open, action: () => { details.open = !details.open; } }
      ] },
      { label: '&Help', id: 'calc-help', items: () => [
        { label: '&Contents', key: 'F1', disabled: true },
        { label: '&Search for Help On...', disabled: true },
        { label: '&How to Use Help', action: () => H.winhelp?.('using-help') },
        '-',
        { label: '&About Calculator...', id: 'calc-about', action: () => H.progman.about('Calculator', win) }
      ] }
    ]});
    const app=document.querySelector('.standard-calc');
    const display=app.querySelector('output'), memoryBox=app.querySelector('.calc-memory'), details=app.querySelector('details');
    const history=app.querySelector('ol');
    record('£4,000,000 ÷ 1 download = £4,000,000 per download');
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
      if(k==='M+'){const sum=memory+n;if(Number.isFinite(sum))memory=Number(format(sum));return;}
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
    // The real one shows a whole number with a full stop after it (styles.css draws that), and an
    // M in the box on the left while memory holds something.
    function input(k){
      if(k)press(k);
      memoryBox.textContent=memory?'M':'';
      display.toggleAttribute('data-whole',/^-?\d+$/.test(display.value));
    }
    app.onclick=e=>{const k=e.target.closest('[data-key]')?.dataset.key;if(k)input(k);};
    win=app.closest('.modal-window');
    win.tabIndex=-1;
    requestAnimationFrame(()=>win.focus({preventScroll:true}));
    win.onkeydown=e=>{
      if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('.w31-caption,.w31-menu'))return;
      if(e.key==='Enter' && (e.target.id==='dialog-close'||e.target.tagName==='SUMMARY'))return;
      const k=({'/':'÷','*':'×','-':'−',Enter:'=',Delete:'CE',Backspace:'←',c:'C',C:'C'})[e.key]||e.key;
      if(keys.includes(k)){e.preventDefault();input(k);}
    };
  };
})(globalThis.Hired);
