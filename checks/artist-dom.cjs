const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
async function run(resumed){
 const dom=new JSDOM(fs.readFileSync('artist-candidate.html','utf8'),{url:'https://preview.example',runScripts:'outside-only'}),w=dom.window;let calls=0;
 const result={completed:true,won:true,score:1000,answer:{name:'Sefa',clues:['Age: 26','Label: Test','Active since: 2014','Country: Netherlands','Genre: Frenchcore']}};
 w.fetch=async()=>({ok:true,json:async()=>null});
 w.HardleSecureGame=class{constructor(){this.pending=null}async start(){return {public_payload:{clues:['Age: 26']},guesses:resumed?[{guess:{canonical:'artist-1'},feedback:result}]:[],completed:resumed,result:resumed?result:null}}async request(){return {items:[{id:'artist-1',name:'Sefa'}]}}async guess(id){calls++;assert.equal(id,'artist-1');return result}};
 // outside-only does not load the scoring script referenced by the page.
 w.eval(fs.readFileSync('scoring.js','utf8'));
 w.eval(fs.readFileSync('artist-server.js','utf8'));await new Promise(r=>setTimeout(r,10));
 assert.equal(w.document.querySelectorAll('#clues li').length,1);
 if(!resumed){w.document.getElementById('guess').value='Sefa';await w.searchArtists();const button=w.document.querySelector('#artist-results button');assert(button);button.click();w.document.getElementById('guess-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));assert.equal(calls,1)}
 assert(w.document.getElementById('result-modal').classList.contains('show'));
 assert.equal(w.document.getElementById('result-artist').textContent,'Sefa');
 assert.equal(w.document.getElementById('guess').disabled,true);
 assert(w.document.getElementById('artist-stats').textContent.includes('1000'));
 dom.window.close();
}
(async()=>{await run(false);await run(true);console.log('Artist DOM search selection, server result, modal and resume passed')})().catch(e=>{console.error(e);process.exitCode=1});
