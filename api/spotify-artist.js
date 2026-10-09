const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
module.exports = async function handler(req, res) {
  const { artist } = req.query;
  if (typeof artist !== 'string' || !artist.trim() || artist.length > 200) return res.status(400).json({ error: 'Invalid artist' });
  try {
    const response = await fetch('https://spotify.xwolf.space/api/search?q=' + encodeURIComponent(artist) + '&type=artist&limit=20', { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return res.status(502).json({ error: 'Artist search unavailable' });
    const data = await response.json();
    const items = data.artists?.items || data.data?.artists?.items || data.items || (Array.isArray(data.artists) ? data.artists : []) ;
    const matches = items.filter(item => norm(item.name) === norm(artist) && /^[A-Za-z0-9]{22}$/.test(item.id || ''));
    if (matches.length !== 1) return res.status(404).json({ error: 'No unique matching artist' });
    return res.json({ spotify_url: 'https://open.spotify.com/artist/' + matches[0].id });
  } catch { return res.status(502).json({ error: 'Artist search unavailable' }); }
};
