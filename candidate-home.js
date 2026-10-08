'use strict';
(async function () {
  const status = document.getElementById('home-account-status');
  const config = window.HardleAccountConfig;
  const signInButton = document.getElementById('home-signin');
  const profileAvatar = document.getElementById('home-profile-avatar');
  let signOutButton = null;
  function ensureSignOutButton() {
    if (signOutButton) return signOutButton;
    signOutButton = document.createElement('button');
    signOutButton.id = 'home-sign-out';
    signOutButton.type = 'button';
    signOutButton.className = 'accountBtn';
    signOutButton.textContent = 'Sign out';
    document.querySelector('.accountAuth')?.appendChild(signOutButton);
    signOutButton.onclick = async () => {
    signOutButton.disabled = true;
    try {
      const session = JSON.parse(localStorage.getItem('hardle-auth-v1') || 'null');
      if (session?.access_token) await fetch(config.url + '/auth/v1/logout', {
        method: 'POST', headers: { apikey: config.key, Authorization: 'Bearer ' + session.access_token },
        signal: AbortSignal.timeout(10000)
      });
    } catch { /* Always clear the local session on explicit sign-out. */ }
    try { localStorage.removeItem('hardle-auth-v1');sessionStorage.removeItem('hardle-auth-v1'); } catch {}
    signOutButton.disabled = false;
    await update();
    };
    return signOutButton;
  }
  let revision = 0;
  async function update() {
    const current = ++revision;
    status.hidden = true;
    if (signOutButton) { signOutButton.remove(); signOutButton = null; }
    if (profileAvatar) profileAvatar.src = '/data/avatars/avatar-01.svg';
    status.textContent = '';
    if (signInButton) { signInButton.textContent = 'Sign in'; signInButton.href = '/account?mode=signin'; signInButton.style.pointerEvents = ''; signInButton.removeAttribute('aria-disabled'); }
    let session;
    try { session = JSON.parse(localStorage.getItem('hardle-auth-v1') || 'null'); } catch { return; }
    if (!session?.access_token || !config) return;
    try {
      const response = await fetch(config.url + '/auth/v1/user', {
        headers: { apikey: config.key, Authorization: 'Bearer ' + session.access_token },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return;
      const user = await response.json();
      if (current !== revision || !user.id) return;
      if (profileAvatar) { const avatar = user.user_metadata?.avatar || 'avatar-01.svg'; profileAvatar.src = /^avatar-0[1-8]\.svg$/.test(avatar) ? '/data/avatars/' + avatar : avatar.startsWith('custom/') ? config.url + '/storage/v1/object/public/hardle-avatars/' + avatar.replace(/^custom\//, '') : '/data/avatars/avatar-01.svg'; }
      if (signInButton) { signInButton.textContent = 'You are signed in'; signInButton.removeAttribute('href'); signInButton.setAttribute('aria-disabled','true'); signInButton.style.pointerEvents = 'none'; }
      ensureSignOutButton();
    } catch { /* Do not claim a verified login when verification fails. */ }
  }
  window.addEventListener('pageshow', update);
  window.addEventListener('focus', update);
  await update();
})();
