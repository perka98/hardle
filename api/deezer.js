export default async function handler(req, res) {
  try {
    const q = String(req.query?.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Missing q' });

    const url = 'https://api.deezer.com/search/track?q=' + encodeURIComponent(q) + '&limit=10';
    const response = await fetch(url);
    if (!response.ok) return res.status(502).json({ error: 'Deezer request failed' });

    const data = await response.json();
    const tracks = Array.isArray(data.data) ? data.data.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist?.name || '',
      preview: track.preview || '',
      link: track.link || ''
    })) : [];

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ tracks });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error' });
  }
}
