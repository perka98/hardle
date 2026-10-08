'use strict';
(async function () {
  const status = document.getElementById('home-account-status');
  const config = window.HardleAccountConfig;
  const signInButton = document.getElementById('home-signin');
  const profileAvatar = document.getElementById('home-profile-avatar');
  const profileLink = document.getElementById('home-profile-link');
  const accountBar = document.getElementById('home-account-bar');
  const registerButton = document.getElementById('home-register');
  async function revealAccountBar(avatarUrl) {
  if (profileAvatar && avatarUrl) {
    await new Promise(resolve => {
      const img = new Image();
      img.onload = () => { profileAvatar.src = avatarUrl; resolve(); };
      img.onerror = resolve;
      img.src = avatarUrl;
    });
  }
  if (accountBar) { accountBar.classList.remove('authChecking'); accountBar.style.visibility = 'visible'; }
  if (profileAvatar) profileAvatar.style.visibility = 'visible';
}
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
    if (accountBar) accountBar.classList.add('authChecking');
    if (signOutButton) { signOutButton.remove(); signOutButton = null; }
    status.textContent = '';
    if (signInButton) { signInButton.textContent = 'Sign in'; signInButton.href = '/account?mode=signin'; signInButton.style.pointerEvents = ''; signInButton.removeAttribute('aria-disabled'); } if (registerButton) registerButton.hidden = false;
    let session;
    try { session = JSON.parse(localStorage.getItem('hardle-auth-v1') || 'null'); } catch { return; }
    if (!session?.access_token || !config) {
      revealAccountBar('/data/avatars/avatar-01.svg')
      return;
    }
    try {
      const response = await fetch(config.url + '/auth/v1/user', {
        headers: { apikey: config.key, Authorization: 'Bearer ' + session.access_token },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        revealAccountBar()
        return;
      }
      const user = await response.json();
      if (current !== revision || !user.id) return;
      let avatarUrl = '/data/avatars/avatar-01.svg';
      const avatar = user.user_metadata?.avatar || 'avatar-01.svg';
      if (/^avatar-0[1-8]\.svg$/.test(avatar)) avatarUrl = '/data/avatars/' + avatar;
      else if (avatar.startsWith('custom/')) avatarUrl = config.url + '/storage/v1/object/public/hardle-avatars/' + avatar.replace(/^custom\//, '');
      await revealAccountBar(avatarUrl);
      if (signInButton) { signInButton.textContent = 'You are signed in'; signInButton.removeAttribute('href'); signInButton.setAttribute('aria-disabled','true'); signInButton.style.pointerEvents = 'none'; } if (registerButton) registerButton.hidden = true;
      ensureSignOutButton();
      revealAccountBar();
    } catch { revealAccountBar(); }
  }
  window.addEventListener('pageshow', update);
  window.addEventListener('focus', update);
  await update();
})();
