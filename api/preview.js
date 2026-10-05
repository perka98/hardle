export default async function handler(req, res) {
  try {
    const q = String(req.query?.q || '').trim();
    if (!q) return res.status(400).send('Missing q');

    const normalize = value =>
      String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const parts = q.split(/\\s+/).filter(Boolean);
    const titleHint = parts.length > 1 ? parts.slice(0, -1).join(' ') : q;
    const artistHint = parts.length > 1 ? parts[parts.length - 1] : '';

    for (const country of ['se', 'us', 'gb', 'de', 'nl']) {
      const url =
        'https://itunes.apple.com/search?term=' +
        encodeURIComponent(q) +
        '&entity=song&limit=50&country=' + country;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!response.ok) continue;

      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];

      const titleNorm = normalize(titleHint);
      const artistNorm = normalize(artistHint);

      const candidate =
        results.find(track => {
          const title = normalize(track.trackName);
          const artist = normalize(track.artistName);
          return !!track.previewUrl &&
            title === titleNorm &&
            (!artistNorm || artist.includes(artistNorm) || artistNorm.includes(artist));
        }) ||
        results.find(track =>
          !!track.previewUrl && normalize(track.trackName) === titleNorm
        ) ||
        results.find(track => !!track.previewUrl);

      if (!candidate?.previewUrl) continue;

      const audioResponse = await fetch(candidate.previewUrl);
      if (!audioResponse.ok) continue;

      const buffer = Buffer.from(await audioResponse.arrayBuffer());
      res.setHeader('Content-Type', audioResponse.headers.get('content-type') || 'audio/mp4');
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(buffer);
    }

    return res.status(404).send('Preview unavailable');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Preview lookup failed');
  }
}
