'use strict';
(async()=>{
  const status=document.getElementById('daily-top-status'),list=document.getElementById('daily-top-list'),config=window.HardleAccountConfig;
  let selectedUserId=null;
  const modal=document.getElementById('profile-message-modal'),profileBox=document.getElementById('pm-profile');
  const pmAvatar=document.getElementById('pm-avatar'),pmName=document.getElementById('pm-name'),pmBody=document.getElementById('pm-body'),pmStatus=document.getElementById('pm-status'),pmSend=document.getElementById('pm-send');
  const avatarSrc=value=>{if(typeof value!=='string')return '/data/avatars/avatar-01.svg';if(/^avatar-0[1-8]\.svg$/.test(value))return '/data/avatars/'+value;if(/^custom\/[0-9a-f-]+\/avatar\.(jpg|jpeg|png|webp|gif)$/i.test(value))return config.url+'/storage/v1/object/public/hardle-avatars/'+value.replace(/^custom\//,'');return '/data/avatars/avatar-01.svg'}; const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function showField(label,value){if(!value)return;const row=document.createElement('div');row.style.cssText='padding:9px 10px;background:#09090d;border:1px solid #ffffff12;border-radius:9px';row.innerHTML='<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:3px">'+esc(label)+'</div><div style="font-size:14px;color:#ddd;white-space:pre-wrap;overflow-wrap:anywhere">'+esc(value)+'</div>';profileBox.append(row)}
  async function openProfile(row){
    selectedUserId=row.user_id;pmName.textContent=row.username;pmAvatar.src=avatarSrc(row.avatar);
    profileBox.replaceChildren();showField('Username',row.username);pmStatus.textContent='Loading profile…';pmBody.value='';
    modal.hidden=false;modal.style.display='flex';
    try{
      const r=await fetch(config.url+'/rest/v1/rpc/hardle_public_profile',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({p_user_id:row.user_id})});
      if(!r.ok)throw Error();const p=await r.json();const profile=Array.isArray(p)?p[0]:p;if(!profile)throw Error();
      profileBox.replaceChildren();showField('Username',profile.username);
      showField('Name',profile.full_name);showField('Country',profile.country);showField('Favorite DJ',profile.favorite_dj);showField('Favorite Hardstyle Track',profile.favorite_track);showField('About me',profile.bio);
      pmStatus.textContent='';
    }catch{pmStatus.textContent='Could not load this profile.'}
    let session=null;try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||sessionStorage.getItem('hardle-auth-v1')||'null')}catch{}
    pmBody.disabled=!session?.access_token||session.user?.id===row.user_id;pmSend.disabled=pmBody.disabled;
    if(!session?.access_token)pmStatus.textContent='Sign in to send messages.';else if(session.user?.id===row.user_id)pmStatus.textContent='This is your profile.';
  }
  document.getElementById('pm-close')?.addEventListener('click',()=>{modal.hidden=true;modal.style.display='none'});
  pmSend?.addEventListener('click',async()=>{
    let session=null;try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||sessionStorage.getItem('hardle-auth-v1')||'null')}catch{}
    const body=pmBody.value.trim();if(!session?.access_token||!selectedUserId||!body||session.user?.id===selectedUserId)return;
    pmStatus.textContent='Sending…';
    try{const r=await fetch(config.url+'/rest/v1/rpc/hardle_send_message',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({p_recipient:selectedUserId,p_body:body})});if(!r.ok)throw Error();pmStatus.textContent='Message sent ✓';pmBody.value='';setTimeout(()=>{modal.hidden=true;modal.style.display='none'},900)}catch{pmStatus.textContent='Could not send message.'}
  });
  try{const hs=JSON.parse(localStorage.getItem('hardle-auth-v1')||sessionStorage.getItem('hardle-auth-v1')||'null');if(hs?.access_token){const ur=await fetch(config.url+'/rest/v1/rpc/hardle_unread_count',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+hs.access_token,'Content-Type':'application/json'},body:'{}'});if(ur.ok){const n=Number(await ur.json()),link=document.getElementById('home-messages'),badge=document.getElementById('home-unread');if(link)link.hidden=false;if(badge){badge.textContent=n;badge.hidden=n<1}}}}catch{}
  try{
    const response=await fetch(config.url+'/rest/v1/rpc/hardle_leaderboard',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({period:'daily'}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error();const rows=await response.json();if(!Array.isArray(rows))throw Error();
    const top=rows.filter(row=>typeof row.username==='string'&&row.user_id&&Number.isFinite(Number(row.score))).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,10);
    for(const row of top){
      const item=document.createElement('li'),line=document.createElement('span'),name=document.createElement('span'),avatar=document.createElement('img'),nameText=document.createElement('span'),score=document.createElement('b');
      name.className='leaderName';name.style.cursor='pointer';name.title='View profile';name.setAttribute('role','button');name.tabIndex=0;
      name.addEventListener('click',()=>openProfile(row));name.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')openProfile(row)});
      avatar.className='leaderAvatar';avatar.src=avatarSrc(row.avatar);avatar.alt='';avatar.loading='lazy';
      nameText.className='leaderNameText';nameText.textContent=row.username;name.append(avatar,nameText);score.textContent=Number(row.score).toLocaleString('en-US');line.append(name,score);item.append(line);list.append(item)
    }
    status.textContent=top.length?'':'No scores yet today.';status.hidden=top.length>0;
  }catch{status.hidden=false;status.textContent='Today’s leaderboard is not available yet.'}
  try{
    const winner=document.getElementById('yesterday-winner-content');
    const response=await fetch(config.url+'/rest/v1/rpc/hardle_leaderboard',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({period:'yesterday'}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error();
    const rows=await response.json();const top=Array.isArray(rows)?rows.filter(row=>row?.username&&row?.user_id&&Number.isFinite(Number(row.score))).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,1):[];
    if(top.length){const row=top[0];winner.innerHTML='<img class="lmAvatar" src="'+avatarSrc(row.avatar)+'" alt=""><span class="lmName">'+esc(row.username)+'</span><b class="lmScore">'+Number(row.score).toLocaleString('en-US')+'</b>';}else winner.innerHTML='<span class="lmName" style="color:#777">No winner yet</span>';
  }catch{const winner=document.getElementById('yesterday-winner-content');if(winner)winner.innerHTML='<span class="lmName" style="color:#777">No winner yet</span>'}
  try{
    const winner=document.getElementById('last-month-winner');
    const response=await fetch(config.url+'/rest/v1/rpc/hardle_leaderboard',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({period:'previous_month'}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error();
    const rows=await response.json();const top=Array.isArray(rows)?rows.filter(row=>row?.username&&row?.user_id&&Number.isFinite(Number(row.score))).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,1):[];
    if(top.length){
      const row=top[0];winner.innerHTML='<div class="lmLabel">Last Month’s Winner</div><div class="lmRow"><img class="lmAvatar" src="'+avatarSrc(row.avatar)+'" alt=""><span class="lmName">'+esc(row.username)+'</span><b class="lmScore">'+Number(row.score).toLocaleString('en-US')+'</b></div>';winner.hidden=false;
    }
  }catch{}
  try{
    const monthlyStatus=document.getElementById('monthly-top-status'),monthlyList=document.getElementById('monthly-top-list');
    const response=await fetch(config.url+'/rest/v1/rpc/hardle_leaderboard',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({period:'monthly'}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error();const rows=await response.json();if(!Array.isArray(rows))throw Error();
    const top=rows.filter(row=>typeof row.username==='string'&&row.user_id&&Number.isFinite(Number(row.score))).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,10);
    for(const row of top){
      const item=document.createElement('li'),line=document.createElement('span'),name=document.createElement('span'),avatar=document.createElement('img'),nameText=document.createElement('span'),score=document.createElement('b');
      name.className='leaderName';name.style.cursor='pointer';name.title='View profile';name.setAttribute('role','button');name.tabIndex=0;
      name.addEventListener('click',()=>openProfile(row));name.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')openProfile(row)});
      avatar.className='leaderAvatar';avatar.src=avatarSrc(row.avatar);avatar.alt='';avatar.loading='lazy';
      nameText.className='leaderNameText';nameText.textContent=row.username;name.append(avatar,nameText);score.textContent=Number(row.score).toLocaleString('en-US');line.append(name,score);item.append(line);monthlyList.append(item)
    }
    monthlyStatus.textContent=top.length?'':'No scores yet this month.';monthlyStatus.hidden=top.length>0;
  }catch{const el=document.getElementById('monthly-top-status');if(el){el.hidden=false;el.textContent='Monthly leaderboard is not available yet.'}}
})();