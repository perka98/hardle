'use strict';
const game=new window.HardleSecureGame('daily'),get=id=>document.getElementById(id);
const playBtn=get('playBtn'),volumeControl=get('volumeControl'),soundcloudPlayer=get('soundcloudPlayer');
let soundcloudWidget=null,soundcloudReady=false,soundcloudLoading=null,soundcloudPlaying=false,soundcloudUrlActive='',youtubePlayer=null,youtubeReady=false,youtubeLoading=null,youtubePlaying=false,youtubeIdActive='',clipTimer=null;
let target=null,guesses=0,completed=false,busy=true,selected=null,searchRevision=0,clipStart=20;
const guessedIds=new Set();let searchTimer;
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
    const timeout=setTimeout(()=>reject(new Error("SoundCloud API timeout")),10000);
    script.onload=()=>{clearTimeout(timeout);if(window.SC?.Widget)resolve();else reject(new Error("SoundCloud API unavailable"))};
    script.onerror=()=>{clearTimeout(timeout);script.remove();reject(new Error("SoundCloud Widget API failed"))};
    document.head.appendChild(script);
  });
  return soundcloudLoading.catch(error=>{soundcloudLoading=null;throw error});
}
async function initYouTube(id){
  if(!youtubeLoading){
    youtubeLoading=new Promise((resolve,reject)=>{
      if(window.YT?.Player){youtubeReady=true;resolve();return}
      const s=document.createElement("script");
      s.src="https://www.youtube.com/iframe_api";
      window.onYouTubeIframeAPIReady=()=>{youtubeReady=true;resolve()};
      const timeout=setTimeout(()=>reject(new Error("YouTube API timeout")),10000);
      const ready=window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);ready()};
      s.onerror=()=>{clearTimeout(timeout);s.remove();reject(new Error("YouTube API failed"))};
      document.head.appendChild(s);
    });
  }
  try{await youtubeLoading}catch(error){youtubeLoading=null;throw error}
  if(!youtubePlayer||youtubeIdActive!==id){
    youtubeReady=false;youtubePlaying=false;
    if(youtubePlayer?.destroy){youtubePlayer.destroy();if(!document.getElementById('youtubePlayer')){const mount=document.createElement('div');mount.id='youtubePlayer';mount.style.cssText='position:absolute;width:1px;height:1px;left:-9999px;top:-9999px';document.body.append(mount)}}
    await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error("YouTube player timeout")),15000);
    youtubePlayer=new YT.Player("youtubePlayer",{height:"1",width:"1",videoId:id,playerVars:{autoplay:0,controls:0,playsinline:1,rel:0},events:{
      onReady:e=>{youtubeReady=true;e.target.mute();applyPlayerVolume(e.target);clearTimeout(timeout);resolve()},
      onError:e=>{clearTimeout(timeout);audioPrepared=false;clipPending=false;youtubePlaying=false;youtubeIdActive='';playBtn.disabled=false;playBtn.textContent="Retry audio";get("guessCount").textContent="YouTube playback failed ("+e.data+"). Retry audio.";reject(new Error("YouTube player error: "+e.data))},
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
  soundcloudReady=false;soundcloudPlaying=false;
  soundcloudWidget=SC.Widget(soundcloudPlayer);
  await new Promise((resolve,reject)=>{
    let done=false;
    const finish=()=>{if(!done){done=true;resolve()}};
    soundcloudWidget.bind(SC.Widget.Events.READY,finish);
    soundcloudWidget.bind(SC.Widget.Events.ERROR,()=>{audioPrepared=false;clipPending=false;soundcloudPlaying=false;soundcloudReady=false;playBtn.disabled=false;playBtn.textContent="Retry audio";get("guessCount").textContent="SoundCloud playback failed. Retry audio.";if(!done){done=true;reject(new Error("SoundCloud player error"))}});
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
    console.error("Daily audio preparation failed");
    get("guessCount").textContent="Audio preparation failed: "+e.message;
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
function finish(data){completed=!!data.completed;if(!completed)return;stopClip();const answer=data.answer;get('correctTitle').textContent=data.won?'CORRECT!':'ROUND COMPLETE';get('correctTrack').textContent=answer?.title||'';get('correctArtist').textContent=answer?.artist||'';get('correctGuesses').textContent=guesses+' / 6';get('correctScore').textContent=data.score;get('correctGenre').textContent=answer?.genre||'—';get('correctYear').textContent=answer?.year||'—';get('shareText').textContent='HARDLE Daily · '+(data.won?guesses+'/6':'X/6')+' · '+data.score+' points';loadResultArtwork(answer);get('correctModal').classList.add('show');get('correctModal').setAttribute('aria-hidden','false');get('correctClose').focus();showVerifiedDailyStats()}
get('correctClose').onclick=()=>{get('correctModal').classList.remove('show');get('correctModal').setAttribute('aria-hidden','true')};
async function searchDaily(){selected=null;const revision=++searchRevision,q=get('guessInput').value.trim();get('results').replaceChildren();get('results').hidden=true;if(!q||busy||completed)return;try{const data=await game.request('/api/secure-search',{game:'daily',query:q});if(revision!==searchRevision)return;for(const item of data.items.filter(item=>!guessedIds.has(item.id))){const button=document.createElement('button');button.className='result';button.textContent=item.title+' — '+item.artist;button.onclick=()=>{selected=item;get('guessInput').value=item.title+' — '+item.artist;get('results').replaceChildren()};get('results').append(button)}get('results').hidden=!get('results').children.length}catch(error){get('guessCount').textContent=error.message}};
async function submitGuess(){if(busy||completed)return;if(!selected&&!game.pending){get('guessCount').textContent='Choose a track from the suggestions.';return}const choice=selected;const submittedId=game.pending?.guess||choice.id;if(!game.pending&&guessedIds.has(submittedId)){get('guessCount').textContent='You already guessed this track.';return}busy=true;controls();try{const data=await game.guess(game.pending?.guess||choice.id);guessedIds.add(submittedId);guesses=data.attempts;addFeedback(choice?.title||'Retried guess',data.feedback,data.guessed);get('guessInput').value='';selected=null;finish(data)}catch(error){get('guessCount').dataset.error=error.message}finally{busy=false;controls();if(get('guessCount').dataset.error){get('guessCount').textContent=get('guessCount').dataset.error;delete get('guessCount').dataset.error}if(game.pending)get('guessCount').textContent='Connection interrupted — retry this guess.'}}
get('guessSubmit').onclick=submitGuess;get('guessInput').onkeydown=e=>{if(e.key==='Enter')submitGuess()};
(async()=>{controls();playBtn.disabled=true;try{const state=await game.start();target=state.public_payload?.audio;clipStart=state.public_payload?.clipStart??20;if(!Number.isInteger(clipStart)||clipStart<0||clipStart>600)throw Error('Invalid server clip start');if(!target||!Array.isArray(state.guesses))throw Error('Invalid server puzzle');guesses=state.guesses.length;for(const previous of state.guesses){guessedIds.add(previous.guess.canonical);addFeedback(previous.guess.canonical,previous.feedback.feedback,previous.feedback.guessed)}if(state.completed)finish({...state.result,completed:true});busy=false;controls();await prepareAudio()}catch(error){busy=false;get('guessCount').textContent='Game startup failed: '+error.message;get('guessInput').disabled=true;get('guessSubmit').disabled=true;playBtn.disabled=true}})();

let artworkRevision=0;
async function loadResultArtwork(answer){
 const revision=++artworkRevision;
 const image=get('correctCover'),link=get('spotifyBtn');
 image.hidden=true;image.removeAttribute('src');link.hidden=true;link.removeAttribute('href');
 if(!answer?.title||!answer?.artist)return;
 try{const response=await fetch('/api/spotify-search?title='+encodeURIComponent(answer.title)+'&artist='+encodeURIComponent(answer.artist));if(!response.ok)return;const data=await response.json();if(revision!==artworkRevision)return;
 const artwork=data.thumbnail_url;
 if(typeof artwork==='string'&&artwork.startsWith('https://')){image.src=artwork;image.alt=answer.title+' cover';image.hidden=false;image.onerror=()=>{image.hidden=true}}
 if(typeof data.spotify_url==='string'&&/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/.test(data.spotify_url)){link.href=data.spotify_url;link.hidden=false}
 }catch{}
}
async function copyDailyResult(){try{await navigator.clipboard.writeText(get('shareText').textContent);get('copyBtn').textContent='Copied!'}catch{get('copyBtn').textContent='Copy unavailable'}}
get('copyBtn').onclick=copyDailyResult;
get('shareBtn').onclick=async()=>{const text=get('shareText').textContent;try{if(navigator.share)await navigator.share({text});else await copyDailyResult()}catch{}};

function stockholmDay(now=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-')}
const openedDay=stockholmDay();
function updateDailyCountdown(){const now=new Date();if(stockholmDay(now)!==openedDay){location.reload();return}let low=now.getTime(),high=low+27*3600000;while(high-low>1){const mid=Math.floor((low+high)/2);if(stockholmDay(new Date(mid))===openedDay)low=mid;else high=mid}const ms=high-now.getTime();get('countdown').textContent=[Math.floor(ms/3600000),Math.floor(ms%3600000/60000),Math.floor(ms%60000/1000)].map(value=>String(value).padStart(2,'0')).join(':')}
updateDailyCountdown();setInterval(updateDailyCountdown,1000);window.addEventListener('focus',updateDailyCountdown);
get('correctModal').addEventListener('keydown',event=>{if(event.key==='Escape')get('correctClose').click();if(event.key==='Tab'){const buttons=[...get('correctModal').querySelectorAll('button,a')].filter(node=>!node.hidden),first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
async function showVerifiedDailyStats(){
 let session;try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||'null')}catch{}
 const config=window.HardleAccountConfig;if(!session?.access_token||!config)return;
 try{const response=await fetch(config.url+'/rest/v1/rpc/hardle_my_game_stats',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({p_game:'daily'}),signal:AbortSignal.timeout(10000)});if(!response.ok)return;const stats=await response.json();
 const section=document.querySelector('section.stats');section.replaceChildren();for(const [label,value] of [['Played',stats.played],['Current Streak',stats.streak],['Best Streak',stats.best],['Total Score',stats.totalScore]]){const cell=document.createElement('div');cell.className='stat';const b=document.createElement('b'),span=document.createElement('span');b.textContent=value;span.textContent=label;cell.append(b,span);section.append(cell)}
 const banner=get('streakBanner');banner.querySelector('b').textContent='🔥 '+stats.streak+' DAY STREAK';
 }catch{}
}
async function loadDailySummary(){
 const config=window.HardleAccountConfig;if(!config)return;
 for(const [id,label] of [['yesterday','Yesterday’s Song'],['todayResults','Today’s Results']]){get(id).replaceChildren();const b=document.createElement('b'),span=document.createElement('span');b.textContent=label;span.textContent='Loading…';get(id).append(b,span)}
 try{const response=await fetch(config.url+'/rest/v1/rpc/hardle_daily_summary',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();const data=await response.json();get('yesterday').querySelector('span').textContent=data.yesterday?data.yesterday.title+' — '+data.yesterday.artist:'No previous server round yet.';get('todayResults').querySelector('span').textContent=data.played?Math.round(data.correct/data.played*100)+'% guessed correctly':'No results yet.'}
 catch{get('yesterday').querySelector('span').textContent='Summary not available yet.';get('todayResults').querySelector('span').textContent='Summary not available yet.'}
}
get('dailyLabel').textContent='Daily Hardle #'+String(Math.max(1,Math.floor((Date.parse(openedDay+'T00:00:00Z')-Date.parse('2026-10-05T00:00:00Z'))/86400000)+1)).padStart(3,'0');
showVerifiedDailyStats();loadDailySummary();
get('guessInput').oninput=()=>{selected=null;searchRevision++;clearTimeout(searchTimer);get('results').replaceChildren();get('results').hidden=true;searchTimer=setTimeout(searchDaily,250)};
