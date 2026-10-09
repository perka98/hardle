'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
(async()=>{
 for(const game of ['artist','djdle','daily']){
  const dom=new JSDOM('<div id="stats"></div><div id="chart"></div>');
  const session=JSON.stringify({access_token:'test'});
  const data={played:1,wins:1,streak:1,best:1,totalScore:100,distribution:[0,2,1,0,0,0,0]};
  const context={window:{HardleAccountConfig:{url:'https://example.invalid',key:'test'}},document:dom.window.document,localStorage:{getItem:()=>session},fetch:async()=>({ok:true,json:async()=>data}),AbortSignal};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../verified-game-stats.js'),'utf8'),context);
  await context.window.loadVerifiedGameStats(game,'stats','chart');
  const chart=dom.window.document.getElementById('chart');
  if(game==='daily'){assert.equal(chart.firstChild.textContent,'1: 0');assert.equal(chart.querySelector('.distBar'),null)}
  else{
   assert.equal(chart.children.length,game==='djdle'?7:6);
   assert.equal(chart.querySelector('.distBar').style.getPropertyValue('--bar-h'),'4px');
   assert.equal(chart.children[1].querySelector('.distBar').style.getPropertyValue('--bar-h'),'68px');
   assert.equal(chart.children[2].querySelector('.distBar').style.getPropertyValue('--bar-h'),'34px');
   assert.equal(chart.firstChild.querySelector('.distCount').textContent,'0');
   assert.equal(chart.firstChild.querySelector('.distLabel').textContent,'1');
  }
  console.log('PASS verified '+game+' distribution');
 }
})().catch(error=>{console.error(error);process.exitCode=1});
// Guard against late, ID-specific styles overriding the shared chart geometry.
for(const page of ['djdle.html','artist.html']){
 const html=fs.readFileSync(require.resolve('../'+page),'utf8');
 assert.ok(html.includes('href="/result-distribution.css"'));
 const styles=Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g),m=>m[1]).join('\n');
 assert.ok(!/#distribution\s*>\s*div\s*\{[^}]*background[^}]*!important/.test(styles),'No full-height green column override');
 assert.ok(!/\.distribution\s*\{[^}]*margin-top:0!important/.test(styles),'No chart spacing override');
}
console.log('PASS both pages have no late chart background/spacing overrides');
