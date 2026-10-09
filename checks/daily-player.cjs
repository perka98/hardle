const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
async function run(completed){
 const dom=new JSDOM(fs.readFileSync('daily.html','utf8'),{url:'https://preview.example',runScripts:'outside-only'}),w=dom.window;
 let played=0,seek=[],paused=0,volume=[];const events={};
 const widget={bind(name,fn){events[name]=fn;if(name==='ready')queueMicrotask(fn)},setVolume(v){volume.push(v)},seekTo(v){seek.push(v)},play(){played++;events.play()},pause(){paused++;events.pause()}};
 w.SC={Widget:Object.assign(()=>widget,{Events:{READY:'ready',ERROR:'error',PLAY:'play',PAUSE:'pause',FINISH:'finish'}})};
 w.HardleSecureGame=class{async start(){return {public_payload:{audio:{soundcloud:'https://soundcloud.com/test/track'},clipStart:35},guesses:[],completed,result:completed?{won:false,score:0}:null}}};
 w.eval(fs.readFileSync('daily-server.js','utf8'));
 await new Promise(r=>setTimeout(r,20));
 const play=w.document.getElementById('playBtn');assert.equal(play.disabled,false);
 play.click();assert.equal(played,1);assert.equal(seek[0],35000);assert(play.textContent.includes('Pause'));
 play.click();assert.equal(paused,1);
 play.click();assert.equal(played,2);assert.equal(seek[1],35000);
 dom.window.close();console.log('Daily actual player initialization + Play/Pause/replay event flow passed with simulated SoundCloud widget; external/iPhone audio unverified');
}
(async()=>{await run(false);await run(true)})().catch(e=>{console.error(e);process.exitCode=1});
