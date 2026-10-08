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
      for (const query of [...new Set([searchTitle + ' ' + artist, searchTitle + ' ' + artist.split(/,|&|\bfeat\b/i)[0].trim(), searchTitle])]) {
        const response = await fetch('https://spotify.xwolf.space/api/search?q=' + encodeURIComponent(query) + '&type=' + type + '&limit=20', { signal: AbortSignal.timeout(6000) });
        if (!response.ok) { console.warn('Spotify search upstream', JSON.stringify({type, title:searchTitle, status:response.status})); continue; }
        const data = await response.json();
        const group=type === 'track' ? 'tracks' : 'albums';
        const items = data[group]?.items || data.data?.[group]?.items || data.items || (Array.isArray(data[group])?data[group]:null) || (Array.isArray(data.results)?data.results:null) || (Array.isArray(data)?data:[]);
        console.info('Spotify response shape',JSON.stringify({type,query,keys:Object.keys(data),dataKeys:data.data?Object.keys(data.data):[],count:items.length}));
        console.info('Spotify search candidates', JSON.stringify({type,title:searchTitle,count:items.length,candidates:items.slice(0,5).map(raw=>{const item=raw.track||raw;return {title:item.name||item.title,artists:(item.artists||[]).map(a=>a.name||a),artwork:!!(item.album?.images?.length||item.images?.length)}})}));
        const match = items.find(raw => {
          const item = raw.track || raw;
          const actualArtists = (item.artists || []).flatMap(a => artists(a.name || a));
          const actualTitle = norm(item.name || item.title);
          const actualBase=norm(String(item.name || item.title || '').replace(/\s*\([^)]*\)/g,'').trim());
          const titleMatch=titleVariants.some(t => norm(t) === actualTitle || norm(t) === actualBase);
          const artistMatch=wantedArtists.length===0 || wantedArtists.some(a => actualArtists.includes(a));
          return titleMatch && artistMatch;
        });
        if (!match) continue;
        const item = match.track || match;
        const spotifyUrl = type === 'track' ? (item.external_urls?.spotify || (item.id ? 'https://open.spotify.com/track/' + item.id : '')) : '';
        let image = (type === 'track' ? item.album?.images : item.images)?.[0]?.url;
        if (!image && spotifyUrl) {
          const oe = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(spotifyUrl), { signal: AbortSignal.timeout(6000) });
          if (oe.ok) image = (await oe.json()).thumbnail_url;
        }
        if (image) return res.status(200).json({ thumbnail_url: image, ...(spotifyUrl ? { spotify_url: spotifyUrl } : {}) });
        if (type === 'track' && spotifyUrl) {
          try {
            const deezer = await fetch('https://api.deezer.com/search?q=' + encodeURIComponent(title + ' ' + artist) + '&limit=25', { signal: AbortSignal.timeout(6000) });
            if (deezer.ok) {
              const dd = await deezer.json();
              const di = (dd.data || []).find(x => titleVariants.some(v => norm(v) === norm(x.title)) && (!wantedArtists.length || wantedArtists.some(a => norm(x.artist?.name) === a)));
              const fallbackImage = di?.album?.cover_xl || di?.album?.cover_big || di?.album?.cover_medium;
              if (fallbackImage) return res.status(200).json({ thumbnail_url: fallbackImage, spotify_url: spotifyUrl });
            }
          } catch {}
          continue;
        }
      }
    }
    }
    // Fallback: Deezer's public search API often has cover art even when the Spotify search proxy fails.
    try {
      const deezerQuery = encodeURIComponent(title + ' ' + artist);
      const response = await fetch('https://api.deezer.com/search?q=' + deezerQuery + '&limit=25', { signal: AbortSignal.timeout(6000) });
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data.data) ? data.data : [];
        const match = items.find(item => {
          const t = norm(item.title);
          const a = norm(item.artist?.name || '');
          return titleVariants.some(v => norm(v) === t) && (!wantedArtists.length || wantedArtists.some(w => a === w || a.includes(w) || w.includes(a)));
        }) || items.find(item => titleVariants.some(v => norm(v) === norm(item.title)));
        const image = match?.album?.cover_xl || match?.album?.cover_big || match?.album?.cover_medium;
        if (image && /^https:\/\//.test(image)) return res.status(200).json({ thumbnail_url: image });
      }
    } catch (fallbackError) {
      console.warn('Deezer artwork fallback failed:', fallbackError.message);
    }
    // Final artwork fallback: iTunes Search API is public and usually has reliable cover art.
    try {
      const itunes = await fetch('https://itunes.apple.com/search?term=' + encodeURIComponent(title + ' ' + artist) + '&entity=song&limit=25', { signal: AbortSignal.timeout(6000) });
      if (itunes.ok) {
        const data = await itunes.json();
        const items = Array.isArray(data.results) ? data.results : [];
        const match = items.find(item => {
          const t = norm(item.trackName || '');
          const a = norm(item.artistName || '');
          return titleVariants.some(v => norm(v) === t || norm(v) === norm(String(item.trackName || '').replace(/\\s*\\([^)]*\\)/g, '').trim()))
            && (!wantedArtists.length || wantedArtists.some(w => a === w || a.includes(w) || w.includes(a)));
        }) || items.find(item => titleVariants.some(v => norm(v) === norm(item.trackName || '')));
        const image = String(match?.artworkUrl100 || '').replace(/100x100/g, '600x600');
        if (image && /^https:\\/\\//.test(image)) return res.status(200).json({ thumbnail_url: image });
      }
    } catch (itunesError) {
      console.warn('iTunes artwork fallback failed:', itunesError.message);
    }
    const spotifySearchUrl='https://open.spotify.com/search/'+encodeURIComponent(title+' '+artist);\n    return res.status(200).json({ thumbnail_url: null, spotify_url: spotifySearchUrl });
  } catch (error) {
    console.error('Spotify artwork search failed:', error.message);
    return res.status(502).json({ error: 'Spotify search unavailable' });
  }
};
