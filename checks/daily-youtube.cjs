const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const dom=new JSDOM(fs.readFileSync('daily-integration.html','utf8'),{url:'https://preview.example',runScripts:'outside-only'}),w=dom.window;
 let played=0,paused=0,seek=[],active,created=0;
 w.YT={PlayerState:{PLAYING:1,PAUSED:2,ENDED:0},Player:class{
 constructor(id,config){created++;this.config=config;active=this;queueMicrotask(()=>config.events.onReady({target:this}))}
 destroy(){w.document.getElementById('youtubePlayer')?.remove()}mute(){}unMute(){}setVolume(){}cueVideoById(data){assert.equal(data.startSeconds,35)}seekTo(s){seek.push(s)}
 playVideo(){played++;this.config.events.onStateChange({data:1,target:this})}pauseVideo(){paused++;this.config.events.onStateChange({data:2,target:this})}
 }};
 w.HardleSecureGame=class{async start(){return {public_payload:{audio:{youtube:'abcdefghijk'},clipStart:35},guesses:[],completed:false}}};
 w.eval(fs.readFileSync('daily-server.js','utf8'));await new Promise(r=>setTimeout(r,20));
 const play=w.document.getElementById('playBtn');assert.equal(play.disabled,false);play.click();assert.equal(played,1);assert.equal(seek[0],35);play.click();assert.equal(paused,1);play.click();assert.equal(played,2);active.config.events.onError({data:5});assert.equal(play.textContent,'Retry audio');assert.equal(play.disabled,false);play.click();await new Promise(r=>setTimeout(r,20));play.click();assert.equal(played,3);assert.equal(created,2);assert(w.document.getElementById('youtubePlayer'));
 dom.window.close();console.log('Daily YouTube initialization, cue, gesture Play, Pause and replay passed with simulated provider');
})().catch(e=>{console.error(e);process.exitCode=1});
