'use strict';
(async function () {
  const status = document.getElementById('home-account-status');
  const config = window.HardleAccountConfig;
  let revision = 0;
  async function update() {
    const current = ++revision;
    status.hidden = true;
    status.textContent = '';
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
      const identity = user.user_metadata?.username || user.email;
      status.textContent = identity ? 'Signed in as ' + identity : 'Signed in';
      status.hidden = false;
    } catch { /* Do not claim a verified login when verification fails. */ }
  }
  window.addEventListener('pageshow', update);
  window.addEventListener('focus', update);
  await update();
})();
