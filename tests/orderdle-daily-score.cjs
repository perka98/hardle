const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(){const store=new Map();const context={window:{},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},AbortSignal,fetch:async()=>({ok:true,json:async()=>[{puzzle_date:'2026-10-09',game:'daily',score:850},{puzzle_date:'2026-10-09',game:'djdle',score:700},{puzzle_date:'2026-10-09',game:'artist',score:550},{puzzle_date:'2026-10-09',game:'orderdle',score:600},{puzzle_date:'2026-10-08',game:'daily',score:1000}]})};vm.createContext(context);vm.runInContext(fs.readFileSync('scoring.js','utf8'),context);return {context,store,score:context.window.HardleScore}}
function permutations(items){return items.length?items.flatMap((item,i)=>permutations(items.filter((_,j)=>i!==j)).map(rest=>[item,...rest])):[[]]}
test('all 24 play orders: today only, one result per game, reopen never adds points',async()=>{
 for(const order of permutations(['daily','djdle','artist','orderdle'])){
 const {score,store}=setup();const points={daily:850,djdle:700,artist:550,orderdle:600};const results={};let sum=0;
 store.set('hardle-menu-result-2026-10-08',JSON.stringify({daily:{score:1000},orderdle:{score:1000}}));
 store.set('hardle-score-v2-orderdle-2026-10-08',JSON.stringify({points:1000}));
 for(const game of order){results[game]={score:points[game]};sum+=points[game];store.set('hardle-menu-result-2026-10-09',JSON.stringify(results));assert.equal(await score.verifiedDailyTotal('2026-10-09'),sum);store.set('hardle-menu-result-2026-10-09',JSON.stringify(results));assert.equal(score.dailyTotal('2026-10-09'),sum)}
 assert.equal(score.dailyTotal('2026-10-10'),0);
 }
});
test('signed-in uses existing verified daily total, not all-time or local totals',async()=>{const {context,store,score}=setup();context.window.HardleAccountConfig={url:'https://example.invalid',key:'test'};store.set('hardle-auth-v1',JSON.stringify({access_token:'test'}));store.set('hardle-menu-result-2026-10-09',JSON.stringify({daily:{score:1000}}));assert.equal(await score.verifiedDailyTotal('2026-10-09'),2700)});
test('additional daily games included exactly once',()=>{const {store,score}=setup();store.set('hardle-menu-result-2026-10-09',JSON.stringify({daily:{score:800},futureGame:{score:500},orderdle:{score:0}}));assert.equal(score.dailyTotal('2026-10-09'),1300)});

test('signed-in restores missing games and deduplicates local/account results',async()=>{const {context,store,score}=setup();context.window.HardleAccountConfig={url:'https://example.invalid',key:'test'};store.set('hardle-auth-v1',JSON.stringify({access_token:'test'}));store.set('hardle-menu-result-2026-10-09',JSON.stringify({orderdle:{score:600}}));assert.equal(await score.verifiedDailyTotal('2026-10-09'),2700);assert.equal(await score.verifiedDailyTotal('2026-10-09'),2700)});
