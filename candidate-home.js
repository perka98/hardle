'use strict';
(async function () {
  const status = document.getElementById('home-account-status');
  const config = window.HardleAccountConfig;
  const signInButton = document.getElementById('home-signin');
  const profileAvatar = document.getElementById('home-profile-avatar');
  const profileLink = document.getElementById('home-profile-link');
  const accountBar = document.getElementById('home-account-bar');
  const registerButton = document.getElementById('home-register');
  async function revealAccountBar(avatarUrl = '/data/avatars/avatar-01.svg') {
  const fallbackAvatar = '/data/avatars/avatar-01.svg';
  if (profileAvatar) {
    const resolvedAvatar = avatarUrl || fallbackAvatar;
    profileAvatar.onerror = () => {
      profileAvatar.onerror = null;
      profileAvatar.src = fallbackAvatar;
    };
    profileAvatar.src = resolvedAvatar + (resolvedAvatar.includes('?') ? '&' : '?') + 'v=' + Date.now();
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
    window.HardlePlayerStorage.switchTo('guest');
    window.location.reload();
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
      revealAccountBar('/data/avatars/avatar-0' + (1 + Math.floor(Math.random() * 8)) + '.svg')
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
      let savedProfile = {};
      try { savedProfile = JSON.parse(localStorage.getItem('hardle-profile-v1-' + user.id) || '{}'); } catch {}
      const profile = { ...(user.user_metadata || {}), ...savedProfile };
      const avatar = profile.avatar || 'avatar-01.svg';
      if (/^avatar-0[1-8]\.svg$/.test(avatar)) {
        avatarUrl = '/data/avatars/' + avatar;
      } else {
        // Match Settings: custom avatars are stored at <user-id>/avatar.<extension>.
        const extension = String(avatar).match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1] || 'jpg';
        avatarUrl = config.url + '/storage/v1/object/public/hardle-avatars/' + encodeURIComponent(user.id) + '/avatar.' + extension;
      }
      await revealAccountBar(avatarUrl);
      if (signInButton) { signInButton.textContent = 'You are signed in'; signInButton.removeAttribute('href'); signInButton.setAttribute('aria-disabled','true'); signInButton.style.pointerEvents = 'none'; } if (registerButton) registerButton.hidden = true;
      ensureSignOutButton();
    } catch { revealAccountBar(); }
  }
  async function consumeAuthRedirect() {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash || !config) return false;
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) return false;
    try {
      const response = await fetch(config.url + '/auth/v1/user', {
        headers: { apikey: config.key, Authorization: 'Bearer ' + accessToken },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return false;
      const user = await response.json();
      if (!user?.id) return false;
      const nextSession = {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: params.get('token_type') || 'bearer',
        expires_in: Number(params.get('expires_in')) || 3600,
        expires_at: Number(params.get('expires_at')) || Math.floor(Date.now() / 1000) + (Number(params.get('expires_in')) || 3600),
        user
      };
      localStorage.setItem('hardle-auth-v1', JSON.stringify(nextSession));
      sessionStorage.removeItem('hardle-auth-v1');
      history.replaceState(null, '', window.location.pathname + window.location.search);
      return true;
    } catch {
      return false;
    }
  }
  // Supabase confirmation links can return the verified session in the URL hash.
  // Capture it before rendering the menu so email verification also signs the user in.
  await consumeAuthRedirect();
  await update();
})();
