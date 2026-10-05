export default async function handler(req, res) {
  try {
    const q = String(req.query?.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Missing q' });

    let clientId = process.env.SOUNDCLOUD_CLIENT_ID || '';
    if (!clientId) {
      const home = await fetch('https://soundcloud.com/', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const html = await home.text();
      const match = html.match(/client_id[:=]\s*["']([A-Za-z0-9_-]{20,})["']/i);
      clientId = match?.[1] || '9jZvetLfDs6An08euQgJ0lYlHkKdGFzV';
    }

    const searchUrl =
      'https://api-v2.soundcloud.com/search/tracks?q=' +
      encodeURIComponent(q) +
      '&client_id=' + encodeURIComponent(clientId) +
      '&limit=10&offset=0&linked_partitioning=1';

    const searchResponse = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
    });
    if (!searchResponse.ok) {
      return res.status(502).json({ error: 'SoundCloud search failed' });
    }

    const searchData = await searchResponse.json();
    const collection = Array.isArray(searchData.collection) ? searchData.collection : [];
    const candidates = collection.map(item => item.track || item).filter(Boolean);

    const normalize = value =>
      String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const parts = q.split(/\s+/).map(normalize).filter(Boolean);
    const exact = candidates.find(t => {
      const title = normalize(t.title);
      const user = normalize(t.user?.username);
      const artist = normalize(t.metadata_artist || '');
      const haystack = title + ' ' + user + ' ' + artist;
      return parts.every(p => haystack.includes(p));
    }) || candidates.find(t => {
      const title = normalize(t.title);
      return parts.some(p => title.includes(p));
    });

    if (!exact) return res.status(404).json({ error: 'Track not found' });

    let track = exact;
    if (!track.media?.transcodings && track.id) {
      const detail = await fetch(
        'https://api-v2.soundcloud.com/tracks/' + encodeURIComponent(track.id) +
        '?client_id=' + encodeURIComponent(clientId),
        { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }
      );
      if (detail.ok) track = await detail.json();
    }

    const preview =
      track.preview_mp3_128_url ||
      track.media?.transcodings?.find(t =>
        t.format?.mime_type === 'audio/mpeg' &&
        String(t.quality || '').toLowerCase().includes('preview')
      )?.url ||
      '';

    let previewUrl = preview;
    if (!previewUrl && track.media?.transcodings) {
      const preferred = track.media.transcodings.find(t =>
        String(t.format?.protocol || '').toLowerCase() === 'progressive'
      ) || track.media.transcodings[0];

      if (preferred?.url) {
        const streamResponse = await fetch(
          preferred.url +
          (preferred.url.includes('?') ? '&' : '?') +
          'client_id=' + encodeURIComponent(clientId)
        );
        if (streamResponse.ok) {
          const streamData = await streamResponse.json();
          previewUrl = streamData.preview_mp3_128_url || streamData.url || '';
        }
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      title: track.title || '',
      artist: track.metadata_artist || track.user?.username || '',
      preview: previewUrl,
      soundcloudUrl: track.permalink_url || ''
    });
  } catch (error) {
    return res.status(500).json({ error: 'SoundCloud preview error' });
  }
}
