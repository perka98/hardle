'use strict';
(async()=>{
  const status=document.getElementById('daily-top-status');
  const list=document.getElementById('daily-top-list');
  const config=window.HardleAccountConfig;
  try{
    const response=await fetch(config.url+'/rest/v1/rpc/hardle_leaderboard',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({period:'daily'}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error();
    const rows=await response.json();
    if(!Array.isArray(rows))throw Error();
    const top=rows.filter(row=>typeof row.username==='string'&&Number.isFinite(Number(row.score))).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,10);
    for(const row of top){const item=document.createElement('li'),line=document.createElement('span'),name=document.createElement('span'),avatar=document.createElement('img'),nameText=document.createElement('span'),score=document.createElement('b');name.className='leaderName';avatar.className='leaderAvatar';avatar.src='/data/avatars/'+(typeof row.avatar==='string'&&/^avatar-0[1-8]\.svg$/.test(row.avatar)?row.avatar:'avatar-01.svg');avatar.alt='';avatar.loading='lazy';nameText.className='leaderNameText';nameText.textContent=row.username;name.append(avatar,nameText);score.textContent=Number(row.score).toLocaleString('en-US');line.append(name,score);item.append(line);list.append(item)}
    status.textContent=top.length?'':'No scores yet today.';
    status.hidden=top.length>0;
  }catch{status.hidden=false;status.textContent='Today’s leaderboard is not available yet.'}
})();
