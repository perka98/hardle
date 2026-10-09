const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
async function run(resumed){
 const dom=new JSDOM(fs.readFileSync('djdle.html','utf8'),{url:'https://preview.example',runScripts:'outside-only'}),w=dom.window;let calls=0;
 const result={completed:true,won:true,score:1000,feedback:['green','green','green','green'],answer:{name:'Sefa'}};
 w.HardleSecureGame=class{constructor(){this.pending=null}async start(){return {public_payload:{length:4,maxAttempts:7},guesses:resumed?[{guess:{canonical:'SEFA'},feedback:result}]:[],completed:resumed,result:resumed?result:null}}async guess(word){calls++;assert.equal(word,'SEFA');return result}};
 // outside-only does not load the scoring script referenced by the page.
 w.eval(fs.readFileSync('scoring.js','utf8'));
 w.eval(fs.readFileSync('djdle-server.js','utf8'));await new Promise(r=>setTimeout(r,10));
 assert.equal(w.document.querySelectorAll('#board .row').length,7);assert.equal(w.document.querySelectorAll('#board .cell').length,28);
 assert.equal(w.document.querySelectorAll('[data-letter]').length,26);
 if(!resumed){w.document.getElementById('guess').value='SEFA';await w.submit();await new Promise((resolve,reject)=>{const deadline=Date.now()+3000;function wait(){if(!w.document.getElementById('result-modal').hidden)return resolve();if(Date.now()>deadline)return reject(Error('Result modal did not open after reveal'));setTimeout(wait,20)}wait()})}
 assert.equal(w.document.getElementById('guess').disabled,true);assert.equal(w.document.getElementById('result-modal').hidden,false);assert.equal(w.document.getElementById('result-name').textContent,'Sefa');assert(w.document.getElementById('stats').textContent.includes('1000'));
 await w.submit();assert.equal(calls,resumed?0:1);dom.window.close();
}
(async()=>{await run(false);await run(true);console.log('DJdle original DOM: full board/keyboard, server feedback, result, resume and lock passed')})().catch(e=>{console.error(e);process.exitCode=1});
