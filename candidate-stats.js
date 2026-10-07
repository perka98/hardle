'use strict';
(async()=>{
 const get=id=>document.getElementById(id),config=window.HardleAccountConfig;
 let session;try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||'null')}catch{}
 const history=get('score-history'),rows=get('history-rows');
 get('score-history-open').onclick=()=>history.showModal();get('score-history-close').onclick=()=>history.close();
 get('legacy-score').textContent='';get('daily-score-tier').textContent='';
 if(!session?.access_token){
  try{
   const key=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm'}).format(new Date());
   const local=JSON.parse(localStorage.getItem('hardle-menu-result-'+key)||'{}');
   const games={daily:'/daily',djdle:'/djdle',artist:'/artist',orderdle:'/orderdle'};
   let dailyScore=0;
   for(const [game,result] of Object.entries(local)){
    if(!games[game]||!result)continue;
    const points=Number(result.score);
    if(Number.isFinite(points))dailyScore+=Math.max(0,Math.min(1000,points));
    const card=document.querySelector('a[href="'+games[game]+'"]');
    if(!card)continue;
    card.classList.add(result.won?'completed':'failed');
    card.dataset.result=result.won?(Number(result.score)>=700?'good':'medium'):'failed';
    card.querySelectorAll('.completedBadge,.failedBadge').forEach(el=>el.remove());
    const badge=document.createElement('span');
    badge.className=result.won?'completedBadge':'failedBadge';
    badge.textContent=result.won?'✓ Completed today':'✕ Failed today';
    const play=card.querySelector('.play');
    if(play)play.before(badge);
   }
   get('daily-score').textContent=dailyScore.toLocaleString('en-US');
   get('combined-score').textContent='0';
   const tier=dailyScore>=3500?['green','🟢 Hardcore']:dailyScore>=3000?['yellow','🟡 Great']:dailyScore>=2000?['orange','🟠 Solid']:dailyScore>0?['red','🔴 Keep playing']:['neutral','Not played yet'];
   get('daily-score-card').dataset.tier=tier[0];
   get('daily-score-tier').textContent=tier[1];
   const grid=get('combined-stats');
   grid.replaceChildren();
   const played=Object.keys(local).filter(game=>games[game]&&local[game]).length;
   const wins=Object.values(local).filter(r=>r&&r.won).length;
   for(const [label,value] of [['Games Played',played],['Wins',wins],['Daily Score',dailyScore]]){
    const cell=document.createElement('div'),b=document.createElement('b'),span=document.createElement('span');
    b.textContent=value;span.textContent=label;cell.append(b,span);grid.append(cell);
   }
   rows.textContent=dailyScore>0?'Guest score — stored only on this device for today.':'Play today’s games to build your Daily Score.';
  }catch{
   get('daily-score').textContent='0';
   get('combined-score').textContent='0';
   get('daily-score-tier').textContent='';
   rows.textContent='Play today’s games to build your Daily Score.';
  }
  return;
 }
 async function request(name){const response=await fetch(config.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();return response.json()}
 try{
 const [stats,historyRows]=await Promise.all([request('hardle_my_stats'),request('hardle_my_history')]);
 if(!Array.isArray(historyRows))throw Error();
 get('daily-score').textContent=Number(stats.dailyScore).toLocaleString('en-US');get('combined-score').textContent=Number(stats.totalScore).toLocaleString('en-US');
 const score=Number(stats.dailyScore),todayParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),todayKey=['year','month','day'].map(t=>todayParts.find(p=>p.type===t).value).join('-');
 const playedToday=historyRows.some(row=>row.puzzle_date===todayKey);
 const tier=!playedToday?['neutral','Not played yet']:score>=3500?['green','🟢 Hardcore']:score>=3000?['yellow','🟡 Great']:score>=2000?['orange','🟠 Solid']:['red','🔴 Keep playing'];
 get('daily-score-card').dataset.tier=tier[0];get('daily-score-tier').textContent=tier[1];
 const grid=get('combined-stats');grid.replaceChildren();for(const [label,value] of [['Games Played',stats.played],['Wins',stats.wins],['Win Rate',(stats.played?Math.round(stats.wins/stats.played*100):0)+'%']]){const cell=document.createElement('div'),b=document.createElement('b'),span=document.createElement('span');b.textContent=value;span.textContent=label;cell.append(b,span);grid.append(cell)}
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const today=['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');
 const gameHrefs={daily:'/daily',djdle:'/djdle',artist:'/artist',orderdle:'/orderdle'};
 for(const item of historyRows.filter(row=>String(row.puzzle_date||'')===today)){
   const card=document.querySelector('a[href="'+gameHrefs[item.game]+'"]');
   if(!card)continue;
   const won=Boolean(item.won),score=Number(item.score)||0;
   card.classList.remove('completed','failed');
   card.removeAttribute('data-result');
   card.querySelectorAll('.completedBadge,.failedBadge').forEach(el=>el.remove());
   card.classList.add(won?'completed':'failed');
   card.dataset.result=!won?'failed':score>=700?'good':'medium';
   const badge=document.createElement('span');
   badge.className=won?'completedBadge':'failedBadge';
   badge.textContent=won?'✓ Completed today':'✕ Failed today';
   const play=card.querySelector('.play');
   if(play)play.before(badge);
 }
 rows.replaceChildren();for(const item of historyRows){const row=document.createElement('p');row.textContent=item.puzzle_date+' · '+item.game+' · '+item.score+' points';rows.append(row)}if(!historyRows.length)rows.textContent='No verified results yet.';
 }catch{get('daily-score').textContent='—';get('combined-score').textContent='—';rows.textContent='Verified results unavailable.'}
})();
