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
