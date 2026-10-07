const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{const dom=new JSDOM(fs.readFileSync('anticheat-candidate.html','utf8'),{url:'https://preview.example',runScripts:'outside-only'}),w=dom.window;
 w.localStorage.setItem('hardle-auth-v1',JSON.stringify({access_token:'test-token'}));w.HardleAccountConfig={url:'https://auth.example',key:'public-test'};
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const today=['year','month','day'].map(t=>parts.find(p=>p.type===t).value).join('-');
 w.fetch=async url=>({ok:true,json:async()=>url.endsWith('hardle_my_stats')?{played:2,wins:1,dailyScore:850,totalScore:1850}:[{puzzle_date:today,game:'daily',score:850,won:true}]});
 w.eval(fs.readFileSync('candidate-stats.js','utf8'));await new Promise(r=>setTimeout(r,10));const d=w.document;
 assert.equal(d.getElementById('daily-score').textContent,'850');assert.equal(d.getElementById('combined-score').textContent,'1850');assert(d.getElementById('history-rows').textContent.includes('850'));assert(d.querySelector('a[href="/daily-fresh-candidate.html"] .completedBadge'));dom.window.close();console.log('Candidate menu verified-score/history and completed marker DOM test passed')})().catch(e=>{console.error(e);process.exitCode=1});
