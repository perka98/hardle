'use strict';
(async function () {
  const status = document.getElementById('home-account-status');
  const config = window.HardleAccountConfig;
  const signInButton = document.querySelector('a[href="/account?mode=signin"]');
  const signOutButton = document.getElementById('home-sign-out');
  signOutButton.onclick = async () => {
    signOutButton.disabled = true;
    try {
      const session = JSON.parse(sessionStorage.getItem('hardle-auth-v1') || 'null');
      if (session?.access_token) await fetch(config.url + '/auth/v1/logout', {
        method: 'POST', headers: { apikey: config.key, Authorization: 'Bearer ' + session.access_token },
        signal: AbortSignal.timeout(10000)
      });
    } catch { /* Always clear the local session on explicit sign-out. */ }
    try { sessionStorage.removeItem('hardle-auth-v1'); } catch {}
    signOutButton.disabled = false;
    await update();
  };
  let revision = 0;
  async function update() {
    const current = ++revision;
    status.hidden = true;
    signOutButton.hidden = true;
    status.textContent = '';
    if (signInButton) signInButton.textContent = 'Sign in';
    let session;
    try { session = JSON.parse(sessionStorage.getItem('hardle-auth-v1') || 'null'); } catch { return; }
    if (!session?.access_token || !config) return;
    try {
      const response = await fetch(config.url + '/auth/v1/user', {
        headers: { apikey: config.key, Authorization: 'Bearer ' + session.access_token },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return;
      const user = await response.json();
      if (current !== revision || !user.id) return;
      if (signInButton) signInButton.textContent = 'You are signed in';
      signOutButton.hidden = false;
    } catch { /* Do not claim a verified login when verification fails. */ }
  }
  window.addEventListener('pageshow', update);
  window.addEventListener('focus', update);
  await update();
})();
