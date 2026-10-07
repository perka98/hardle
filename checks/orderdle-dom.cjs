const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('orderdle-candidate.html','utf8'),code=fs.readFileSync('orderdle-server.js','utf8');
const items=Array.from({length:5},(_,i)=>({id:'p'+i,name:'DJ '+i}));
const result={completed:true,won:false,score:600,feedback:[true,true,true,false,false],answer:items.map((p,i)=>({name:p.name,birthDate:(1980+i)+'-01-01'}))};
async function run(resumed){
 const dom=new JSDOM(html,{url:'https://preview.example',runScripts:'outside-only'}),w=dom.window;let calls=0;
 w.HardleSecureGame=class{constructor(){this.pending=null}async start(){return {public_payload:{items},guesses:resumed?[{guess:{canonical:items.map(p=>p.id)},feedback:result}]:[],completed:resumed,result:resumed?result:null}}async guess(value){calls++;assert.equal(value.length,5);return result}};
 w.eval(code);await new Promise(r=>setTimeout(r,10));
 assert.equal(w.document.querySelectorAll('#tracks .track').length,5);
 if(!resumed){assert.equal(w.document.getElementById('submit').disabled,false);await w.document.getElementById('submit').onclick();assert.equal(calls,1)}
 assert.equal(w.document.getElementById('submit').disabled,true);
 assert.equal(w.document.getElementById('result-modal').hidden,false);
 assert.equal(w.document.querySelectorAll('#answer li').length,5);
 assert(w.document.getElementById('stats').textContent.includes('600'));
 await w.document.getElementById('submit').onclick();assert.equal(calls,resumed?0:1);
 dom.window.close();
}
(async()=>{await run(false);await run(true);console.log('Original Orderdle DOM: initial render, submit, server score, answer reveal, resume and completion lock passed')})().catch(e=>{console.error(e);process.exitCode=1});
