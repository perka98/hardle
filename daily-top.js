'use strict';
(async()=>{
  const status=document.getElementById('daily-top-status');
  const list=document.getElementById('daily-top-list');
  const config=window.HardleAccountConfig;
  let selectedUserId=null;
  const modal=document.getElementById('profile-message-modal');
  const pmAvatar=document.getElementById('pm-avatar'),pmName=document.getElementById('pm-name'),pmBody=document.getElementById('pm-body'),pmStatus=document.getElementById('pm-status');
  function openMessage(row){
    let session=null; try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||sessionStorage.getItem('hardle-auth-v1')||'null')}catch{}
    if(!session?.access_token){pmStatus.textContent='Sign in to send messages.';pmBody.disabled=true;document.getElementById('pm-send').disabled=true}
    else{pmStatus.textContent='';pmBody.disabled=false;document.getElementById('pm-send').disabled=false}
    selectedUserId=row.user_id;pmName.textContent=row.username;pmAvatar.src='/data/avatars/'+(typeof row.avatar==='string'&&/^avatar-0[1-8]\\.svg$/.test(row.avatar)?row.avatar:'avatar-01.svg');pmBody.value='';modal.hidden=false;modal.style.display='flex';setTimeout(()=>pmBody.focus(),0);
  }
  document.getElementById('pm-close')?.addEventListener('click',()=>{modal.hidden=true;modal.style.display='none'});
  document.getElementById('pm-send')?.addEventListener('click',async()=>{
    let session=null;try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||sessionStorage.getItem('hardle-auth-v1')||'null')}catch{}
    const body=pmBody.value.trim();if(!session?.access_token||!selectedUserId||!body)return;
    pmStatus.textContent='Sending…';
    try{const r=await fetch(config.url+'/rest/v1/rpc/hardle_send_message',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({p_recipient:selectedUserId,p_body:body})});if(!r.ok)throw Error();pmStatus.textContent='Message sent ✓';pmBody.value='';setTimeout(()=>{modal.hidden=true;modal.style.display='none'},900)}catch{pmStatus.textContent='Could not send message.'}
  });
  try{
    const response=await fetch(config.url+'/rest/v1/rpc/hardle_leaderboard',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({period:'daily'}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error();
    const rows=await response.json();
    if(!Array.isArray(rows))throw Error();
    const top=rows.filter(row=>typeof row.username==='string'&&Number.isFinite(Number(row.score))).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,10);
    for(const row of top){const item=document.createElement('li'),line=document.createElement('span'),name=document.createElement('span'),avatar=document.createElement('img'),nameText=document.createElement('span'),score=document.createElement('b');name.className='leaderName';name.style.cursor='pointer';name.title='Click to send a message';name.addEventListener('click',()=>openMessage(row));avatar.className='leaderAvatar';avatar.src='/data/avatars/'+(typeof row.avatar==='string'&&/^avatar-0[1-8]\.svg$/.test(row.avatar)?row.avatar:'avatar-01.svg');avatar.alt='';avatar.loading='lazy';nameText.className='leaderNameText';nameText.textContent=row.username;name.append(avatar,nameText);score.textContent=Number(row.score).toLocaleString('en-US');line.append(name,score);item.append(line);list.append(item)}
    status.textContent=top.length?'':'No scores yet today.';
    status.hidden=top.length>0;
  }catch{status.hidden=false;status.textContent='Today’s leaderboard is not available yet.'}
})();
