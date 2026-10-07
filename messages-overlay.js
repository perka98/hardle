'use strict';
(async()=>{
  const c=window.HardleAccountConfig;
  const button=document.getElementById('home-messages'),modal=document.getElementById('messages-overlay'),list=document.getElementById('messages-overlay-list'),status=document.getElementById('messages-overlay-status'),close=document.getElementById('messages-overlay-close');
  if(!button||!modal||!list||!c)return;
  let session=null;try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||sessionStorage.getItem('hardle-auth-v1')||'null')}catch{}
  if(!session?.access_token){button.hidden=true;return}
  button.hidden=false;
  hide();
  const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const avatar=x=>'/data/avatars/'+(/^avatar-0[1-8]\\.svg$/.test(x||'')?x:'avatar-01.svg');
  const call=async(path,body)=>{const r=await fetch(c.url+path,{method:'POST',headers:{apikey:c.key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body||{})});if(!r.ok)throw Error();return r.json()};
  function hide(){modal.hidden=true;modal.style.display='none'}
  async function show(){
    modal.hidden=false;modal.style.display='block';
    await load();
    const panel=document.getElementById('messages-overlay-panel');
    if(!panel)return;
    const saved=localStorage.getItem('hardle-messages-position');
    if(saved){try{const p=JSON.parse(saved);panel.style.left=p.left+'px';panel.style.top=p.top+'px';panel.style.right='auto';panel.style.bottom='auto';return}catch{}}
    const leader=document.querySelector('.dailyTop');
    if(!leader)return;
    requestAnimationFrame(()=>{
      const r=leader.getBoundingClientRect(),w=panel.offsetWidth,h=panel.offsetHeight;
      const x=Math.max(8,Math.min(window.innerWidth-w-8,r.left+r.width/2-w/2));
      const y=r.top-h-14>=8?r.top-h-14:Math.min(window.innerHeight-h-8,Math.max(8,r.top+20));
      panel.style.left=x+'px';panel.style.top=y+'px';panel.style.right='auto';panel.style.bottom='auto';
    });
  }
  close.onclick=hide;modal.addEventListener('click',e=>{if(e.target===modal)hide()});button.addEventListener('click',e=>{e.preventDefault();show()});
  async function load(){list.innerHTML='<div style="padding:18px;color:#888;text-align:center">Loading…</div>';status.textContent='';try{const rows=await call('/rest/v1/rpc/hardle_my_messages');if(!Array.isArray(rows)||!rows.length){list.innerHTML='<div style="padding:20px;color:#888;text-align:center">No messages yet.</div>';return}const unread=rows.filter(m=>m.recipient_id===session.user.id&&!m.read_at).map(m=>m.id);for(const m of rows.slice(0,20)){const mine=m.sender_id===session.user.id,other=mine?m.recipient_username:m.sender_username,otherId=mine?m.recipient_id:m.sender_id;const el=document.createElement('article');el.style.cssText='padding:12px 0;border-bottom:1px solid #ffffff12';el.innerHTML='<div style="display:flex;gap:10px;align-items:center"><img src="'+avatar(mine?m.recipient_avatar:m.sender_avatar)+'" style="width:34px;height:34px;border-radius:9px;border:1px solid #ffffff18"><div style="min-width:0;flex:1"><div style="font-weight:700;font-size:13px">'+esc(other)+'</div><div style="font-size:10px;color:#777">'+(mine?'Sent':'Received')+' · '+esc(new Date(m.created_at).toLocaleString())+'</div></div>'+(m.recipient_id===session.user.id&&!m.read_at?'<span style="width:7px;height:7px;border-radius:50%;background:#e21b23"></span>':'')+'</div><div style="margin:9px 0 0 44px;font-size:13px;color:#ccc;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere">'+esc(m.body)+'</div>'+(!mine?'<div style="margin:8px 0 0 44px"><button class="overlay-reply" data-id="'+esc(otherId)+'" style="background:#86212a;color:#fff;border:0;border-radius:7px;padding:6px 10px;font-size:11px;cursor:pointer">Reply</button></div>':'');list.append(el)}for(const b of list.querySelectorAll('.overlay-reply'))b.onclick=()=>compose(b.dataset.id);if(unread.length){await call('/rest/v1/rpc/hardle_mark_messages_read',{p_ids:unread});const badge=document.getElementById('home-unread');if(badge)badge.hidden=true}}catch{list.innerHTML='<div style="padding:20px;color:#ff5961;text-align:center">Could not load messages.</div>'}}
  async function compose(recipient){const old=document.getElementById('messages-overlay-compose');if(old)old.remove();const box=document.createElement('div');box.id='messages-overlay-compose';box.style.cssText='padding:12px 0 14px;border-bottom:1px solid #ffffff18';box.innerHTML='<textarea id="overlay-compose-body" maxlength="500" rows="3" placeholder="Write a message..." style="width:100%;background:#09090d;color:#fff;border:1px solid #444;border-radius:9px;padding:9px;resize:vertical;font:inherit"></textarea><div style="display:flex;justify-content:flex-end;gap:7px;margin-top:7px"><button id="overlay-compose-cancel" style="background:#17171c;color:#bbb;border:1px solid #ffffff20;border-radius:7px;padding:6px 10px;cursor:pointer">Cancel</button><button id="overlay-compose-send" style="background:#86212a;color:#fff;border:0;border-radius:7px;padding:6px 10px;cursor:pointer">Send</button></div>';list.parentElement.insertBefore(box,list);box.querySelector('#overlay-compose-cancel').onclick=()=>box.remove();box.querySelector('#overlay-compose-send').onclick=async()=>{const body=box.querySelector('#overlay-compose-body').value.trim();if(!body)return;try{await call('/rest/v1/rpc/hardle_send_message',{p_recipient:recipient,p_body:body});status.textContent='Message sent ✓';box.remove();load()}catch{status.textContent='Could not send message.'}}}
})();


// Draggable messages panel; position persists for the current browser.
(() => {
  const panel = document.getElementById('messages-overlay-panel');
  if (!panel) return;
  const saved = localStorage.getItem('hardle-messages-position');
  if (saved) { try { const p=JSON.parse(saved); panel.style.left=p.left+'px'; panel.style.top=p.top+'px'; panel.style.right='auto'; panel.style.bottom='auto'; } catch(e) {} }
  let dragging=false, ox=0, oy=0;
  panel.addEventListener('pointerdown', e => {
    if (e.target.closest('button, a, input, textarea, select')) return;
    dragging=true; panel.setPointerCapture(e.pointerId);
    const r=panel.getBoundingClientRect(); ox=e.clientX-r.left; oy=e.clientY-r.top;
  });
  panel.addEventListener('pointermove', e => {
    if (!dragging) return;
    const x=Math.max(0,Math.min(window.innerWidth-panel.offsetWidth,e.clientX-ox));
    const y=Math.max(0,Math.min(window.innerHeight-panel.offsetHeight,e.clientY-oy));
    panel.style.left=x+'px'; panel.style.top=y+'px'; panel.style.right='auto'; panel.style.bottom='auto';
  });
  panel.addEventListener('pointerup', () => { if(dragging){dragging=false; const r=panel.getBoundingClientRect(); localStorage.setItem('hardle-messages-position',JSON.stringify({left:r.left,top:r.top}));} });
})();
