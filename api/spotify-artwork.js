module.exports = async function handler(req, res) {
  const id = req.query.album;
  if (typeof id !== 'string' || !/^[A-Za-z0-9]{22}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid album ID' });
  }
  try {
    const url = 'https://open.spotify.com/album/' + id;
    const response = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Spotify returned ' + response.status);
    const data = await response.json();
    if (!data.thumbnail_url || !data.thumbnail_url.startsWith('https://')) throw new Error('Missing artwork');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ thumbnail_url: data.thumbnail_url });
  } catch (error) {
    return res.status(502).json({ error: 'Spotify artwork unavailable' });
  }
};
