export default async function handler(req, res) {
  try {
    const q = String(req.query?.q || '').trim();
    if (!q) return res.status(400).send('Missing q');

    const countries = ['se', 'us', 'gb', 'de', 'nl'];
    const normalize = value =>
      String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const wanted = q.split(/\s+/).map(normalize).filter(Boolean);
    let previewUrl = '';

    for (const country of countries) {
      const response = await fetch(
        'https://itunes.apple.com/search?term=' +
          encodeURIComponent(q) +
          '&entity=song&limit=25&country=' + country,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
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
      if (candidate?.previewUrl) {
        previewUrl = candidate.previewUrl;
        break;
      }
    }

    if (!previewUrl) return res.status(404).send('Preview unavailable');

    const audio = await fetch(previewUrl);
    if (!audio.ok) return res.status(502).send('Preview source unavailable');

    const contentType = audio.headers.get('content-type') || 'audio/mp4';
    const buffer = Buffer.from(await audio.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('Accept-Ranges', 'bytes');
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).send('Preview lookup failed');
  }
}
