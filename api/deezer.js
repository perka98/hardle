export default async function handler(req, res) {
  try {
    const q = String(req.query?.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Missing q' });

    const countries = ['se', 'us', 'gb', 'de', 'nl'];
    const normalize = value =>
      String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const wanted = q.split(/\s+/).map(normalize).filter(Boolean);
    let best = null;

    for (const country of countries) {
      const url =
        'https://itunes.apple.com/search?term=' + encodeURIComponent(q) +
        '&entity=song&limit=25&country=' + country;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!response.ok) continue;

      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];

      const exact = results.find(track => {
        const title = normalize(track.trackName);
        const artist = normalize(track.artistName);
        const combined = title + ' ' + artist;
        return wanted.every(word => combined.includes(word)) && !!track.previewUrl;
      });

      const titleMatch = results.find(track =>
        normalize(track.trackName) === normalize(q) && !!track.previewUrl
      );

      const candidate = exact || titleMatch;
      if (candidate) {
        best = candidate;
        break;
      }
    }

    if (!best) return res.status(404).json({ error: 'No Apple preview found' });

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      title: best.trackName || '',
      artist: best.artistName || '',
      preview: best.previewUrl || '',
      link: best.trackViewUrl || '',
      artwork: best.artworkUrl100 || ''
    });
  } catch (error) {
    return res.status(500).json({ error: 'Preview lookup failed' });
  }
}
