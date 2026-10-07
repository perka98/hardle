'use strict';
const $=id=>document.getElementById(id);
function date(now=new Date()){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(t=>p.find(x=>x.type===t).value).join('-')}
const today=date(),key='hardle-orderdle-age-v1-'+today,statsKey='hardle-orderdle-stats-v1';
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
let target=[],order=[],guesses=[],ended=false,lastFocus=null,busy=false,serverResult=null;
const secure=new window.HardleSecureGame('orderdle');
function age(birthDate){const born=birthDate.split('-').map(Number),now=today.split('-').map(Number);return now[0]-born[0]-((now[1]<born[1]||(now[1]===born[1]&&now[2]<born[2]))?1:0)}
function shuffle(items,seed){const result=[...items];for(let i=result.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[result[i],result[j]]=[result[j],result[i]]}return result}
function marks(g){return serverResult?.feedback||Array(5).fill(false)}
function won(){return !!serverResult?.won}
function valid(g){return Array.isArray(g)&&g.length===5&&new Set(g).size===5&&g.every(id=>target.some(t=>t.id===id))}
function render(focusId){ended=!!serverResult?.completed;$('tracks').replaceChildren();const previous=guesses.length?guesses.at(-1):null;
order.forEach((id,i)=>{const song=target.find(t=>t.id===id),li=document.createElement('li');li.className='track'+(previous&&previous[i]===id?(marks(previous)[i]?' correct':' wrong'):'');const pos=document.createElement('b');pos.textContent=i+1;const name=document.createElement('div');name.className='name';name.textContent=song.title;const artist=document.createElement('small');artist.textContent=song.artist;li.append(pos,name);
li.dataset.songId=id;li.tabIndex=ended?-1:0;li.setAttribute('aria-label',song.title+', position '+(i+1)+'. Drag to reorder, or use arrow keys.');li.classList.toggle('draggable',!ended&&!busy&&!secure.pending);const handle=document.createElement('span');handle.className='dragHandle';handle.textContent='⠿';handle.setAttribute('aria-hidden','true');li.prepend(handle);
li.onpointerdown=e=>{if(ended||busy||secure.pending||e.button!==0)return;e.preventDefault();const rect=li.getBoundingClientRect(),offsetX=e.clientX-rect.left,offsetY=e.clientY-rect.top;const ghost=li.cloneNode(true);ghost.removeAttribute('id');ghost.removeAttribute('data-song-id');ghost.classList.add('dragGhost');ghost.style.width=rect.width+'px';ghost.style.left=rect.left+'px';ghost.style.top=rect.top+'px';document.body.append(ghost);li.style.opacity='.25';li.setPointerCapture(e.pointerId);let destination=id;
li.onpointermove=event=>{ghost.style.left=(event.clientX-offsetX)+'px';ghost.style.top=(event.clientY-offsetY)+'px';const hovered=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-song-id]');destination=hovered?hovered.dataset.songId:id};
const finish=event=>{li.onpointermove=null;li.onpointerup=null;li.onpointercancel=null;ghost.remove();li.style.opacity='';if(li.hasPointerCapture(event.pointerId))li.releasePointerCapture(event.pointerId);if(event.type!=='pointercancel'){const from=order.indexOf(id),to=order.indexOf(destination);if(from>=0&&to>=0)[order[from],order[to]]=[order[to],order[from]]}persist();render('song-'+id)};li.onpointerup=finish;li.onpointercancel=finish};
li.id='song-'+id;li.onkeydown=e=>{if(ended||busy||secure.pending||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const from=order.indexOf(id),to=from+(e.key==='ArrowUp'?-1:1);if(to<0||to>=5)return;[order[from],order[to]]=[order[to],order[from]];persist();render(li.id)};$('tracks').append(li)});
$('submit').disabled=ended||busy||target.length!==5;$('results').hidden=!ended;$('message').textContent=ended?(won()?'Correct! Come back tomorrow for five new DJs.':'No attempts left. See the correct age order in your results.'):'';
$('history').replaceChildren();guesses.forEach(g=>{const row=document.createElement('div');row.textContent=marks(g).map(x=>x?'🟩':'🟨').join('');row.setAttribute('aria-label',marks(g).map((x,i)=>'Position '+(i+1)+(x?' correct':' incorrect')).join(', '));$('history').append(row)});if(focusId){const b=$(focusId);if(b&&!b.disabled)b.focus();else $('submit').focus()}}
function persist(){}
function stats(){const s=read(statsKey,{});for(const k of ['played','wins','streak','best','totalScore'])s[k]=Number.isFinite(s[k])&&s[k]>=0?s[k]:0;return s}
function record(){}
function resultText(){return 'OrderDle '+today+' '+(won()?guesses.length:'X')+'/1\n'+guesses.map(g=>marks(g).map(x=>x?'🟩':'🟨').join('')).join('\n')}
function showResult(){if(window.loadVerifiedGameStats)window.loadVerifiedGameStats('orderdle','stats','distribution');if(!ended&&!busy)return;lastFocus=document.activeElement;const win=won(),s=stats();const correct=marks(guesses.at(-1)).filter(Boolean).length;const feedback=correct===5?['PERFECT!','🟢🔥']:correct===4?['ALMOST PERFECT!','🟢']:correct===3?['NICE!','🟡']:correct===2?['NOT BAD!','🟠']:['BETTER LUCK TOMORROW!','🔴'];const box=document.querySelector('.correctBox');box.classList.remove('loss');box.dataset.correct=correct;$('result-title').textContent=feedback[0];document.querySelector('.correctIcon').textContent=feedback[1];document.querySelector('.correctSub').textContent=correct===5?'You got all 5 correct!':'You got '+correct+'/5 correct.';$('stats').replaceChildren();for(const [label,value] of [['Correct',correct+'/5'],['Score',serverResult?.score||0],['Today',win?'1/1':'X/1']]){const div=document.createElement('div'),b=document.createElement('b'),span=document.createElement('span');b.textContent=value;span.textContent=label;div.append(b,span);$('stats').append(div)}$('result-correct').textContent=marks(guesses.at(-1)).filter(Boolean).length+'/5 correct';$('answer').replaceChildren();(serverResult?.answer||[]).forEach((song,i)=>{const li=document.createElement('li'),mark=document.createElement('span'),name=document.createElement('span');mark.textContent=marks(guesses.at(-1))[i]?'🟩':'🟨';mark.setAttribute('aria-label',marks(guesses.at(-1))[i]?'Correct position':'Incorrect position');name.textContent=song.name+' — '+age(song.birthDate)+' years old';li.append(mark,name);$('answer').append(li)});$('share-grid').textContent='';$('result-modal').hidden=false;$('close-result').focus()}
function closeResult(){$('result-modal').hidden=true;(lastFocus&&!lastFocus.disabled?lastFocus:$('results')).focus()}
$('close-result').onclick=closeResult;$('results').onclick=showResult;
$('share').onclick=async()=>{try{await navigator.clipboard.writeText(resultText());$('share').textContent='Copied!'}catch{$('share').textContent='Select the result above to copy'}};
document.addEventListener('keydown',e=>{if($('result-modal').hidden)return;if(e.key==='Escape')closeResult();if(e.key==='Tab'){const buttons=[...$('result-modal').querySelectorAll('button,a')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
function applyServer(data){serverResult=data;ended=!!data.completed;render();if(ended)showResult()}
$('submit').onclick=async()=>{
 if(date()!==today){location.reload();return}if(ended||busy)return;
 busy=true;render();$('message').textContent='Checking…';
 try{const guess=secure.pending?.guess||[...order];const data=await secure.guess(guess);guesses=[guess];applyServer(data)}
 catch(error){$('message').textContent=error.message}
 finally{busy=false;render();if(secure.pending){$('submit').textContent='Retry this order';$('message').textContent='Connection interrupted. Retry the same order.'}}
};
(async()=>{busy=true;try{
 const state=await secure.start(),items=state.public_payload?.items;
 if(!Array.isArray(items)||items.length!==5||!Array.isArray(state.guesses))throw Error('Invalid server puzzle');
 if(items.some(x=>typeof x.id!=='string'||typeof x.name!=='string')||new Set(items.map(x=>x.id)).size!==5)throw Error('Invalid server items');
 target=items.map(x=>({id:x.id,title:x.name}));order=target.map(x=>x.id);
 const previous=state.guesses.at(-1);if(previous){guesses=[previous.guess.canonical];order=[...guesses[0]];serverResult=previous.feedback}
 if(state.completed)serverResult={...serverResult,...state.result,completed:true};
 busy=false;render();if(state.completed)showResult();
 }catch(error){busy=false;$('message').textContent=error.message;$('submit').disabled=true}
})();
window.addEventListener('focus',()=>{if(date()!==today)location.reload()});
