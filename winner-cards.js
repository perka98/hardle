'use strict';
(function(){
 const cfg=window.HardleAccountConfig,modal=document.getElementById('profile-message-modal');
 if(!cfg||!modal)return;
 const img=document.getElementById('pm-avatar'),nm=document.getElementById('pm-name'),box=document.getElementById('pm-profile'),body=document.getElementById('pm-body'),status=document.getElementById('pm-status');
 const av=v=>typeof v==='string'&&/^custom\\/[0-9a-f-]+\\/avatar\\.(jpg|jpeg|png|webp|gif)$/i.test(v)?cfg.url+'/storage/v1/object/public/hardle-avatars/'+v.replace(/^custom\\//,''):typeof v==='string'&&/^avatar-0[1-8]\\.svg$/.test(v)?'/data/avatars/'+v:'/data/avatars/avatar-01.svg';
 const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 async function open(row){
  nm.textContent=row.username;img.src=av(row.avatar);box.innerHTML='<div style="color:#aaa;font-size:13px">Loading profile…</div>';body.value='';status.textContent='';modal.hidden=false;modal.style.display='flex';
  try{const r=await fetch(cfg.url+'/rest/v1/rpc/hardle_public_profile',{method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},body:JSON.stringify({p_user_id:row.user_id})});if(!r.ok)throw 0;const p=await r.json(),x=Array.isArray(p)?p[0]:p;if(!x)throw 0;const a=[['Username',x.username],['Name',x.full_name],['Country',x.country],['Favorite DJ',x.favorite_dj],['Favorite Hardstyle Track',x.favorite_track],['About me',x.bio]].filter(x=>x[1]);box.innerHTML=a.map(x=>'<div style="padding:9px 10px;background:#09090d;border:1px solid #ffffff12;border-radius:9px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777;margin-bottom:3px">'+esc(x[0])+'</div><div style="font-size:14px;color:#ddd;white-space:pre-wrap;overflow-wrap:anywhere">'+esc(x[1])+'</div></div>').join('')}catch{box.innerHTML='<div style="color:#aaa;font-size:13px">Could not load this profile.</div>'}
 }
 async function load(period,card,title){
  try{const r=await fetch(cfg.url+'/rest/v1/rpc/hardle_leaderboard',{method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},body:JSON.stringify({period}),cache:'no-store'});if(!r.ok)throw 0;const a=await r.json(),row=Array.isArray(a)?a.filter(x=>x?.user_id&&x?.username&&Number.isFinite(Number(x.score))).sort((x,y)=>Number(y.score)-Number(x.score))[0]:null;if(!row)return;card.innerHTML='<div class="lmLabel">'+title+'</div>';const b=document.createElement('button');b.type='button';b.className='winnerProfileLink';b.innerHTML='<span class="lmAvatarWrap"><img class="lmAvatar" src="'+av(row.avatar)+'" alt=""><span class="crown" aria-hidden="true">👑</span></span><span class="lmName">'+esc(row.username)+'</span><b class="lmScore">'+Number(row.score).toLocaleString('en-US')+'</b>';b.addEventListener('click',()=>open(row));card.append(b)}catch{}
 }
 document.getElementById('pm-close')?.addEventListener('click',()=>{modal.hidden=true;modal.style.display='none'});
 const l=document.getElementById('yesterday-winner-content')?.closest('.winnerCard'),r=document.querySelector('.topBoardRight .winnerCard');
 if(l)load('yesterday',l,'Yesterday’s Winner');if(r)load('previous_month',r,'Last Month’s Winner');
})();