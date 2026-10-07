'use strict';
(async()=>{
  const status=document.getElementById('daily-top-status');
  const list=document.getElementById('daily-top-list');
  document.getElementById('daily-top-date').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',day:'numeric',month:'short'}).format(new Date());
  const config=window.HardleAccountConfig;
  try{
    const response=await fetch(config.url+'/rest/v1/rpc/hardle_leaderboard',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({period:'daily'}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error();
    const rows=await response.json();
    if(!Array.isArray(rows))throw Error();
    const top=rows.filter(row=>typeof row.username==='string'&&Number.isFinite(Number(row.score))).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,10);
    for(const row of top){const item=document.createElement('li'),line=document.createElement('span'),name=document.createElement('span'),score=document.createElement('b');name.textContent=row.username;score.textContent=Number(row.score).toLocaleString('en-US');line.append(name,score);item.append(line);list.append(item)}
    status.textContent=top.length?'':'No scores yet today.';
    status.hidden=top.length>0;
  }catch{status.textContent='Today’s leaderboard is not available yet.'}
})();
