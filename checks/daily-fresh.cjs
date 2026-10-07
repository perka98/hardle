const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('daily-fresh-candidate.html','utf8');
(async()=>{
 let plays=0,pauses=0,guesses=0;const handlers={};
 const dom=new JSDOM(html,{url:'https://preview.example',runScripts:'dangerously',beforeParse(w){
 w.fetch=async()=>({ok:false,json:async()=>[]});
 w.HardleScore={total:()=>0};
 w.SC={Widget:Object.assign(()=>({bind(name,fn){handlers[name]=fn;if(name==='ready')queueMicrotask(fn)},setVolume(){},getDuration(fn){fn(240000)},seekTo(){},play(){plays++;handlers.play();handlers.progress?.({currentPosition:35000})},pause(){pauses++;handlers.pause()}}),{Events:{READY:'ready',PLAY:'play',PAUSE:'pause',ERROR:'error',FINISH:'finish',PLAY_PROGRESS:'progress'}})};
 w.HardleSecureGame=class{constructor(){this.pending=null}async start(){return {public_payload:{audio:{soundcloud:'https://soundcloud.com/test/track'},clipStart:35},guesses:[],completed:false}}async guess(id){guesses++;return {attempts:1,completed:false,won:false,feedback:{title:'noMatch'},guessed:{title:'Dragonborn',artist:'Headhunterz',country:'NL',genre:'Hardstyle',year:2012}}}};
 }});
 await new Promise(r=>setTimeout(r,50));const d=dom.window.document;
 assert.equal(d.getElementById('playBtn').disabled,false);d.getElementById('playBtn').click();assert.equal(plays,1);d.getElementById('playBtn').click();assert.equal(pauses,1);
 const input=d.getElementById('guessInput');input.value='Dragonborn';input.dispatchEvent(new dom.window.Event('input'));const choice=d.querySelector('#results .result');assert(choice);choice.click();assert.equal(d.activeElement.id,'guessInput');input.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,20));assert.equal(guesses,1);assert(d.getElementById('guessList').textContent.includes('Dragonborn'));
 const original=fs.readFileSync('daily.html','utf8');assert.equal(html.slice(0,html.indexOf('<script src=')).replace('allow="autoplay; encrypted-media"','allow="autoplay"'),original.slice(0,original.indexOf('<script src=')));
 dom.window.close();console.log('Full original-page execution: identical UI markup, original search selection, Play/Pause and server guess passed with simulated providers');
})().catch(e=>{console.error(e);process.exitCode=1});
