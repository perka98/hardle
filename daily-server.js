'use strict';
const game=new window.HardleSecureGame('daily'),get=id=>document.getElementById(id);
const playBtn=get('playBtn'),volumeControl=get('volumeControl'),soundcloudPlayer=get('soundcloudPlayer');
let soundcloudWidget=null,soundcloudReady=false,soundcloudLoading=null,soundcloudPlaying=false,soundcloudUrlActive='',youtubePlayer=null,youtubeReady=false,youtubeLoading=null,youtubePlaying=false,youtubeIdActive='',clipTimer=null;
let target=null,guesses=0,completed=false,busy=true,selected=null,searchRevision=0,clipStart=20;
const usesDeviceVolume=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
volumeControl.value='1';
function applyPlayerVolume(player){if(!usesDeviceVolume)player.setVolume(Number(volumeControl.value))}
if(usesDeviceVolume){const note=document.createElement('span');note.textContent='Use iPhone volume buttons';note.style.cssText='font-size:12px;color:#aaa';volumeControl.closest('label').replaceWith(note)}
function audioSource(){return target||{}}
function loadSoundCloudApi(){
  if(window.SC?.Widget) return Promise.resolve();
  if(soundcloudLoading) return soundcloudLoading;
  soundcloudLoading=new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="https://w.soundcloud.com/player/api.js";
    script.onload=()=>resolve();
    script.onerror=()=>reject(new Error("SoundCloud Widget API failed"));
    document.head.appendChild(script);
  });
  return soundcloudLoading;
}
async function initYouTube(id){
  if(!youtubeLoading){
    youtubeLoading=new Promise((resolve,reject)=>{
      if(window.YT?.Player){youtubeReady=true;resolve();return}
      const s=document.createElement("script");
      s.src="https://www.youtube.com/iframe_api";
      window.onYouTubeIframeAPIReady=()=>{youtubeReady=true;resolve()};
      s.onerror=()=>reject(new Error("YouTube API failed"));
      document.head.appendChild(s);
    });
  }
  await youtubeLoading;
  if(!youtubePlayer||youtubeIdActive!==id){
    youtubeReady=false;
    if(youtubePlayer?.destroy)youtubePlayer.destroy();
    await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error("YouTube player timeout")),15000);
    youtubePlayer=new YT.Player("youtubePlayer",{height:"1",width:"1",videoId:id,playerVars:{autoplay:0,controls:0,playsinline:1,rel:0},events:{
      onReady:e=>{youtubeReady=true;e.target.mute();applyPlayerVolume(e.target);clearTimeout(timeout);resolve()},
      onError:e=>{clearTimeout(timeout);reject(new Error("YouTube player error: "+e.data))},
      onStateChange:e=>{
        if(e.data===YT.PlayerState.PLAYING){youtubePlaying=true;playBtn.textContent="❚❚ Pause";applyPlayerVolume(e.target);e.target.unMute();beginClipTimer()}
        if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.ENDED){youtubePlaying=false;playBtn.textContent="▶ Play"}
      }
    }});
    });
    youtubeIdActive=id;

  }
}
async function initSoundCloud(url){
  await loadSoundCloudApi();
  soundcloudPlayer.src="https://w.soundcloud.com/player/?url="+encodeURIComponent(url)+"&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false";
  soundcloudWidget=SC.Widget(soundcloudPlayer);
  await new Promise((resolve,reject)=>{
    let done=false;
    const finish=()=>{if(!done){done=true;resolve()}};
    soundcloudWidget.bind(SC.Widget.Events.READY,finish);
    soundcloudWidget.bind(SC.Widget.Events.ERROR,()=>{if(!done){done=true;reject(new Error("SoundCloud player error"))}});
    setTimeout(()=>{if(!done){done=true;reject(new Error("SoundCloud player timeout"))}},10000);
  });
  soundcloudWidget.bind(SC.Widget.Events.PLAY,()=>{soundcloudPlaying=true;playBtn.textContent="❚❚ Pause";applyPlayerVolume(soundcloudWidget);beginClipTimer();});
  soundcloudWidget.bind(SC.Widget.Events.PAUSE,()=>{soundcloudPlaying=false;playBtn.textContent="▶ Play"});
  soundcloudWidget.bind(SC.Widget.Events.FINISH,()=>{soundcloudPlaying=false;playBtn.textContent="▶ Play"});
  applyPlayerVolume(soundcloudWidget);
  soundcloudUrlActive=url;
  soundcloudReady=true;
}
const CLIP_LENGTHS=[3,6,10,15,20,30];
function getClipStart(){return clipStart}
function currentClipLength(){return CLIP_LENGTHS[Math.min(guesses,CLIP_LENGTHS.length-1)]}
function updateClipUI(){
  const seconds=currentClipLength();
  const label=document.getElementById("clipLength");
  if(label) label.textContent=seconds+" sec";
  document.querySelectorAll(".clipStep").forEach((el,i)=>el.classList.toggle("active",i===Math.min(guesses,CLIP_LENGTHS.length-1)));
  playBtn.textContent="▶ Play "+seconds+" sec";
  const skip=document.getElementById("skipBtn");
  if(skip) skip.textContent=guesses>=5?"Skip":"Skip +"+(CLIP_LENGTHS[Math.min(guesses+1,5)]-seconds)+" sec";
}
function stopClip(){
  if(clipTimer){clearTimeout(clipTimer);clipTimer=null;}
  if(soundcloudWidget&&soundcloudReady&&soundcloudPlaying) soundcloudWidget.pause();
  if(youtubePlayer&&youtubeReady&&youtubePlaying) youtubePlayer.pauseVideo();
}
// Prepare the player before the tap so playback is requested directly by a gesture.
let audioPreparing=false,audioPrepared=false,clipPending=false;
function beginClipTimer(){
  if(!clipPending)return;
  clipPending=false;
  if(clipTimer)clearTimeout(clipTimer);
  clipTimer=setTimeout(()=>{stopClip();updateClipUI()},currentClipLength()*1000);
}
async function prepareAudio(){
  if(audioPreparing)return;
  audioPreparing=true;
  audioPrepared=false;
  playBtn.disabled=true;
  playBtn.textContent="Loading audio…";
  try{
    const source=audioSource(target);
    if(source.soundcloud)await initSoundCloud(source.soundcloud);
    else if(source.youtube){
      await initYouTube(source.youtube);
      youtubePlayer.cueVideoById({videoId:source.youtube,startSeconds:getClipStart()});
    }else throw new Error("No audio source");
    audioPrepared=true;
    updateClipUI();
  }catch(e){
    console.error(e);
    playBtn.textContent="Retry audio";
  }finally{audioPreparing=false;playBtn.disabled=false}
}
function playSoundCloudAtVolume(){
  applyPlayerVolume(soundcloudWidget);
  clipPending=true;
  soundcloudWidget.seekTo(getClipStart()*1000);
  soundcloudWidget.play();
}
playBtn.onclick=()=>{
  if(busy)return;
  if(!audioPrepared){prepareAudio();return}
  if(soundcloudPlaying||youtubePlaying){clipPending=false;stopClip();updateClipUI();return}
  const source=audioSource(target);
  clipPending=true;
  if(source.soundcloud){
    clipPending=false;
    playSoundCloudAtVolume();
  }else if(source.youtube){
    applyPlayerVolume(youtubePlayer);
    youtubePlayer.unMute();
    youtubePlayer.seekTo(getClipStart(),true);
    youtubePlayer.playVideo();
  }
};

document.getElementById("skipBtn").style.display="none";
volumeControl.oninput=()=>{
  if(soundcloudWidget&&soundcloudReady)applyPlayerVolume(soundcloudWidget);
  if(youtubePlayer&&youtubeReady&&youtubePlayer.setVolume)applyPlayerVolume(youtubePlayer);
};
function controls(){get('guessInput').disabled=busy||completed||!!game.pending;get('guessSubmit').disabled=busy||completed;get('guessCount').textContent=guesses+'/6 guesses';updateClipUI()}
function addFeedback(name,feedback,metadata={}){const row=document.createElement('div');row.className='guessRow';for(const key of ['title','artist','country','genre','year']){const cell=document.createElement('div');cell.className='guessCell '+(feedback[key]||'noMatch');cell.textContent=metadata[key]??(key==='title'?name:'—');row.append(cell)}get('guessList').append(row)}
function finish(data){completed=!!data.completed;if(!completed)return;stopClip();const answer=data.answer;get('correctTitle').textContent=data.won?'CORRECT!':'ROUND COMPLETE';get('correctTrack').textContent=answer?.title||'';get('correctArtist').textContent=answer?.artist||'';get('correctGuesses').textContent=guesses+' / 6';get('correctScore').textContent=data.score;get('correctModal').classList.add('show');get('correctModal').setAttribute('aria-hidden','false')}
get('correctClose').onclick=()=>{get('correctModal').classList.remove('show');get('correctModal').setAttribute('aria-hidden','true')};
get('guessInput').oninput=async()=>{selected=null;const revision=++searchRevision,q=get('guessInput').value.trim();get('results').replaceChildren();get('results').hidden=true;if(!q||busy||completed)return;try{const data=await game.request('/api/secure-search',{game:'daily',query:q});if(revision!==searchRevision)return;for(const item of data.items){const button=document.createElement('button');button.className='result';button.textContent=item.title+' — '+item.artist;button.onclick=()=>{selected=item;get('guessInput').value=item.title+' — '+item.artist;get('results').replaceChildren()};get('results').append(button)}get('results').hidden=!data.items.length}catch(error){get('guessCount').textContent=error.message}};
async function submitGuess(){if(busy||completed)return;if(!selected&&!game.pending){get('guessCount').textContent='Choose a track from the suggestions.';return}const choice=selected;busy=true;controls();try{const data=await game.guess(game.pending?.guess||choice.id);guesses=data.attempts;addFeedback(choice?.title||'Retried guess',data.feedback,data.guessed);get('guessInput').value='';selected=null;finish(data)}catch(error){get('guessCount').textContent=error.message}finally{busy=false;controls();if(game.pending)get('guessCount').textContent='Connection interrupted — retry this guess.'}}
get('guessSubmit').onclick=submitGuess;get('guessInput').onkeydown=e=>{if(e.key==='Enter')submitGuess()};
(async()=>{controls();playBtn.disabled=true;try{const state=await game.start();target=state.public_payload?.audio;clipStart=state.public_payload?.clipStart??20;if(!Number.isInteger(clipStart)||clipStart<0||clipStart>600)throw Error('Invalid server clip start');if(!target||!Array.isArray(state.guesses))throw Error('Invalid server puzzle');guesses=state.guesses.length;for(const previous of state.guesses)addFeedback(previous.guess.canonical,previous.feedback.feedback,previous.feedback.guessed);if(state.completed)finish({...state.result,completed:true});busy=false;controls();await prepareAudio()}catch(error){get('guessCount').textContent=error.message;get('guessInput').disabled=true;get('guessSubmit').disabled=true;playBtn.disabled=true}})();
