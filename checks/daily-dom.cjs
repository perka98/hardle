const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const dom=new JSDOM(fs.readFileSync('daily-integration.html','utf8'),{url:'https://preview.example',runScripts:'outside-only'}),w=dom.window;
 w.fetch=async()=>({ok:false});
 const guessed={title:'Example Track',artist:'Example DJ',country:'NL',genre:'Hardstyle',year:2020};
 w.HardleSecureGame=class{constructor(){this.pending=null}async start(){return {public_payload:{audio:{youtube:'abcdefghijk'},clipStart:35},guesses:[{guess:{canonical:'song-1'},feedback:{guessed,feedback:{title:'noMatch',artist:'close',country:'match',genre:'match',year:'close'}}}],completed:false}}async request(){return {items:[{id:'song-2',title:'New Track',artist:'DJ'}]}}async guess(){return {attempts:2,completed:true,won:true,score:850,guessed,feedback:{title:'match'},answer:{title:'Example Track',artist:'Example DJ'}}}};
 w.eval(fs.readFileSync('daily-server.js','utf8').replace('await prepareAudio();','{audioPrepared=true;playBtn.disabled=false}'));
 await new Promise(r=>setTimeout(r,10));
 assert.equal(w.document.getElementById('guessInput').disabled,false);
 assert.match(w.document.getElementById('countdown').textContent,/^\d{2}:\d{2}:\d{2}$/);
 assert(w.document.getElementById('guessList').textContent.includes('Example Track'));assert(!w.document.getElementById('guessList').textContent.includes('song-1'));
 w.document.getElementById('guessInput').value='New';await w.document.getElementById('guessInput').oninput();
 const choice=w.document.querySelector('#results button');assert(choice);choice.click();await w.document.getElementById('guessSubmit').onclick();
 assert(w.document.getElementById('correctModal').classList.contains('show'));assert.equal(w.document.getElementById('correctScore').textContent,'850');assert.equal(w.document.getElementById('guessInput').disabled,true);assert.equal(w.document.activeElement.id,'correctClose');w.document.getElementById('correctModal').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!w.document.getElementById('correctModal').classList.contains('show'));
 dom.window.close();console.log('Daily original DOM: restored metadata, search/select, server result and completion lock passed; external playback not tested');
})().catch(e=>{console.error(e);process.exitCode=1});
