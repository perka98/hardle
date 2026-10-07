'use strict';
const authoritativeDaily=new window.HardleSecureGame('daily');
let authoritativeBusy=true,authoritativeAudio=null;
playBtn.disabled=true;guessInput.disabled=true;guessSubmit.disabled=true;
const originalAudioSource=audioSource;
audioSource=function(song){return authoritativeAudio||originalAudioSource(song)};
function appendServerGuess(data){
 const item=data.guessed;if(!item)return;
 const row=document.createElement('div');row.className='guessRow'+(data.won?' correct':'');
 for(const [key,value] of [['title',item.title],['artist',item.artist],['country',item.country],['genre',item.genre],['year',item.year]]){
 const cell=document.createElement('div');cell.className='guessCell '+(data.feedback?.[key]||'noMatch')+(key==='title'?' title':'');
 if(key==='country')cell.innerHTML=flag(value);else cell.textContent=value;row.append(cell);
 }
 guessList.prepend(row);
}
async function submitOriginalServerGuess(){
 if(authoritativeBusy||gameOver)return;
 const index=Number(guessInput.dataset.song),selected=songs[index];
 if(!authoritativeDaily.pending&&!selected)return;
 authoritativeBusy=true;guessSubmit.disabled=true;stopClip();
 try{
 let id=authoritativeDaily.pending?.guess;
 if(!id){const result=await authoritativeDaily.request('/api/secure-search',{game:'daily',query:selected[0]});const match=result.items.find(item=>item.title===selected[0]&&item.artist===selected[1]);if(!match)throw Error('Track not found on game server');id=match.id}
 const data=await authoritativeDaily.guess(id);appendServerGuess(data);guesses=data.attempts;
 if(selected)guessedTracks.add(trackIdentity(selected));guessInput.value='';delete guessInput.dataset.song;results.replaceChildren();guessCount.textContent=guesses+'/6 guesses';updateClipUI();
 if(data.completed){gameOver=true;won=data.won;guessInput.disabled=true;if(data.answer){target=[data.answer.title,data.answer.artist,data.answer.country,data.answer.genre,data.answer.year];correctScore.textContent=data.score;revealCoverArt();getServerResult(data)}}
 }catch(error){guessCount.textContent=error.message}
 finally{authoritativeBusy=false;guessSubmit.disabled=gameOver}
}
function getServerResult(data){showCorrectPopup();correctScore.textContent=data.score}
guessSubmit.onclick=submitOriginalServerGuess;
submitGuess=submitOriginalServerGuess;
(async()=>{
 try{const state=await authoritativeDaily.start();authoritativeAudio=state.public_payload.audio;if(!authoritativeAudio)throw Error('Server audio unavailable');
 guessList.replaceChildren();guesses=state.guesses.length;for(const previous of state.guesses)appendServerGuess(previous.feedback);
 gameOver=!!state.completed;won=!!state.result?.won;guessCount.textContent=guesses+'/6 guesses';updateClipUI();
 authoritativeBusy=false;guessInput.disabled=gameOver;guessSubmit.disabled=gameOver;await prepareAudio();
 if(gameOver&&state.result?.answer){const a=state.result.answer;target=[a.title,a.artist,a.country,a.genre,a.year];getServerResult(state.result)}
 }catch(error){guessCount.textContent='Server startup: '+error.message;playBtn.disabled=true;guessInput.disabled=true;guessSubmit.disabled=true}
})();
