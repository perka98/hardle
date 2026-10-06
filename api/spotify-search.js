const norm = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const artists = value => String(value || '').split(/\s*(?:,|&|\bfeat\.?|\bft\.?|\bfeaturing\b)\s*/i).map(norm).filter(Boolean);
module.exports = async function handler(req, res) {
  const { title, artist } = req.query;
  if (typeof title !== 'string' || typeof artist !== 'string' || !title.trim() || !artist.trim() || title.length > 200 || artist.length > 300) return res.status(400).json({ error: 'Invalid song' });
  const wantedArtists = artists(artist);
  const titleVariants = [...new Set([title, title.replace(/\s*\([^)]*\)/g, '').trim()])];
  try {
    for (const type of ['track', 'album']) {
      for (const searchTitle of titleVariants) {
        const query = searchTitle + ' ' + artist;
        const response = await fetch('https://spotify.xwolf.space/api/search?q=' + encodeURIComponent(query) + '&type=' + type + '&limit=20', { signal: AbortSignal.timeout(6000) });
        if (!response.ok) continue;
        const data = await response.json();
        const items = data[type === 'track' ? 'tracks' : 'albums']?.items || data.items || [];
        const match = items.find(raw => {
          const item = raw.track || raw;
          const actualArtists = (item.artists || []).flatMap(a => artists(a.name || a));
          const actualTitle = norm(item.name || item.title);
          return titleVariants.some(t => norm(t) === actualTitle) && wantedArtists.every(a => actualArtists.includes(a));
        });
        if (!match) continue;
        const item = match.track || match;
        const spotifyUrl = item.external_urls?.spotify || (item.id ? 'https://open.spotify.com/' + type + '/' + item.id : '');
        let image = (type === 'track' ? item.album?.images : item.images)?.[0]?.url;
        if (!image && spotifyUrl) {
          const oe = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(spotifyUrl), { signal: AbortSignal.timeout(6000) });
          if (oe.ok) image = (await oe.json()).thumbnail_url;
        }
        if (image && /^https:\/\//.test(image)) return res.status(200).json({ thumbnail_url: image, spotify_url: spotifyUrl });
      }
    }
    return res.status(404).json({ error: 'No matching Spotify artwork' });
  } catch (error) {
    console.error('Spotify artwork search failed:', error.message);
    return res.status(502).json({ error: 'Spotify search unavailable' });
  }
};
