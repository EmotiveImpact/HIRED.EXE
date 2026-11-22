'use strict';
const key='hire-exe-director-worlds-v4', choices=['Approved','Rerender','Unreviewed'];
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
const byId=id=>document.getElementById(id);
const revised=new Set(['p02-form', 'p04-gatekeeper', 'p05-play', 'alley-1', 'city-1', 'p15-attachment']);
let votes={};
try{votes=JSON.parse(localStorage.getItem(key))||{};}catch{}
for(const scene of directorScenes)for(const [id] of scene.shots)if(!revised.has(id)&&!votes[id])votes[id]={vote:'Approved'};
const records=[];
function refresh(){
  const total=records.filter(({id})=>choices.slice(0,2).includes(votes[id]?.vote)).length;
  byId('count').textContent=total+' of '+records.length+' reviewed';
  for(const {id,card,buttons} of records){
    const vote=votes[id]?.vote||'Unreviewed';
    card.hidden=Boolean(byId('filter').value && byId('filter').value!==vote);
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vote===vote)));
  }
  document.querySelectorAll('#board section').forEach(s=>s.hidden=!s.querySelector('article:not([hidden])'));
}
function save(id,change){
  votes[id]={...votes[id],...change};
  try{localStorage.setItem(key,JSON.stringify(votes));}catch{byId('status').textContent='Browser storage is unavailable. Download the notes before leaving.';}
  refresh();
}
directorScenes.forEach(({title,place,cue,shots},s)=>{
  const section=el('section'),grid=el('div'),jump=el('a',title);
  section.id='scene-'+(s+1);jump.href='#'+section.id;document.querySelector('nav').append(jump);
  grid.className='grid';const label=el('p',place);label.className='place';const direction=el('p',cue);direction.className='cue';
  section.append(label,el('h2',title),direction,grid);byId('board').append(section);
  shots.forEach(([id,shot,...lines])=>{
    const num=String(records.length+1).padStart(2,'0'),card=el('article'),pic=el('img'),details=el('div'),buttons=[],actions=el('div');
    card.id='shot-'+num;card.className='frame';pic.alt=place+' · '+shot;pic.loading='lazy';
    pic.src=directorPanel(id);
    const full=el('a');if(id==='p04-gatekeeper'){full.className='illustration';full.dataset.caption='(for illustrative purposes only)';}full.href=pic.src;full.target='_blank';full.rel='noopener';full.append(pic);
    details.className='details';details.append(el('small','SHOT '+num),el('h3',shot));
    for(const line of lines.filter(Boolean)){const [speaker,words]=line.split('|');const p=el('p');p.append(el('strong',speaker+' '),document.createTextNode(words));details.append(p);}
    if(!lines.length)details.append(el('p','Silent.'));
    actions.className='actions';
    for(const vote of choices){const b=el('button',({Approved:'Approve',Rerender:'Disapprove / rerender',Unreviewed:'Undecided'})[vote]);b.dataset.vote=vote;b.onclick=()=>save(id,{vote});buttons.push(b);actions.append(b);}
    const note=el('textarea');note.placeholder='Direction for the next render';note.setAttribute('aria-label','Direction for shot '+num);note.value=votes[id]?.note||'';note.oninput=()=>save(id,{note:note.value});
    details.append(actions,note);card.append(full,details);grid.append(card);records.push({num,id,card,buttons,place,shot});
  });
});
byId('filter').onchange=refresh;
byId('download').onclick=()=>{
  const report={edition:'HIREME.EXE director review · worlds v4',shots:records.map(({num,id,place,shot})=>({number:num,id,place,shot,decision:votes[id]?.vote||'Unreviewed',direction:votes[id]?.note||''}))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='HIRE-EXE-director-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
};refresh();
