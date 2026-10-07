'use strict';
(async()=>{
 const get=id=>document.getElementById(id),config=window.HardleAccountConfig;
 let session;try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||'null')}catch{}
 const history=get('score-history'),rows=get('history-rows');
 get('score-history-open').onclick=()=>history.showModal();get('score-history-close').onclick=()=>history.close();
 get('legacy-score').textContent='';get('daily-score-tier').textContent='Verified results';
 if(!session?.access_token){get('daily-score').textContent='—';get('combined-score').textContent='—';rows.textContent='Sign in to view verified results.';return}
 async function request(name){const response=await fetch(config.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();return response.json()}
 try{
 const [stats,historyRows]=await Promise.all([request('hardle_my_stats'),request('hardle_my_history')]);
 if(!Array.isArray(historyRows))throw Error();
 get('daily-score').textContent=stats.dailyScore;get('combined-score').textContent=stats.totalScore;
 const grid=get('combined-stats');grid.replaceChildren();for(const [label,value] of [['Games Played',stats.played],['Wins',stats.wins],['Win Rate',(stats.played?Math.round(stats.wins/stats.played*100):0)+'%']]){const cell=document.createElement('div'),b=document.createElement('b'),span=document.createElement('span');b.textContent=value;span.textContent=label;cell.append(b,span);grid.append(cell)}
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const today=['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');
 for(const item of historyRows.filter(row=>row.puzzle_date===today)){const card=document.querySelector('a[href="/'+({daily:'daily-fresh',artist:'artist',djdle:'djdle',orderdle:'orderdle'}[item.game])+'-candidate.html"]');if(card){card.classList.add(item.won?'completed':'failed');const badge=document.createElement('span');badge.className=item.won?'completedBadge':'failedBadge';badge.textContent=item.won?'✓ Completed today':'✕ Failed today';card.querySelector('.play').before(badge)}}
 rows.replaceChildren();for(const item of historyRows){const row=document.createElement('p');row.textContent=item.puzzle_date+' · '+item.game+' · '+item.score+' points';rows.append(row)}if(!historyRows.length)rows.textContent='No verified results yet.';
 }catch{get('daily-score').textContent='—';get('combined-score').textContent='—';rows.textContent='Verified results unavailable.'}
})();
