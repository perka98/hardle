'use strict';
const game=new window.HardleSecureGame('djdle'),get=id=>document.getElementById(id);
let length=0,completed=false,busy=false;
function controls(){get('submit').disabled=busy||completed||!length;get('guess').disabled=busy||completed||!length||!!game.pending}
function row(word,feedback){
 if(typeof word!=='string'||!Array.isArray(feedback)||feedback.length!==word.length)throw Error('Invalid server feedback');
 const item=document.createElement('li');
 [...word].forEach((letter,index)=>{const cell=document.createElement('span');cell.textContent=letter;const mark=feedback[index];if(!['green','yellow','gray'].includes(mark))throw Error('Invalid server feedback');cell.className=mark;cell.setAttribute('aria-label',letter+' '+mark);item.append(cell)});
 get('history').append(item);
}
function finish(data){completed=!!data.completed;if(completed){get('result').textContent=(data.won?'Correct!':'Round completed.')+' Score: '+data.score+(data.answer?.name?' · '+data.answer.name:'');get('status').textContent='Your result is saved by the server.'}}
async function start(){
 busy=true;controls();get('retry').hidden=true;get('status').textContent='Connecting…';
 try{
 const state=await game.start(),payload=state.public_payload;
 if(!Number.isInteger(payload?.length)||payload.length<1||payload.length>100||!Array.isArray(state.guesses))throw Error('Invalid server puzzle');
 length=payload.length;get('guess').maxLength=length;get('history').replaceChildren();
 for(const previous of state.guesses)row(previous.guess.canonical,previous.feedback.feedback);
 completed=!!state.completed;get('status').textContent='Guess the '+length+'-letter DJ name. Up to '+payload.maxAttempts+' attempts.';
 if(completed)finish({...state.result,completed:true});
 }catch(error){length=0;get('status').textContent=error.message;get('retry').hidden=false}
 finally{busy=false;controls()}
}
get('form').onsubmit=async event=>{
 event.preventDefault();if(busy||completed||!length)return;
 const word=game.pending?.guess||get('guess').value.toUpperCase().normalize('NFD').replace(/[^A-Z]/g,'');
 if(word.length!==length){get('status').textContent='Enter '+length+' letters.';return}
 busy=true;controls();
 try{const data=await game.guess(word);row(word,data.feedback);finish(data);get('guess').value='';if(!completed)get('status').textContent='Attempt '+data.attempts+' recorded.'}
 catch(error){get('status').textContent=error.message}
 finally{busy=false;get('submit').textContent=game.pending?'Retry this guess':'Guess';controls()}
};
get('retry').onclick=start;start();
