export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const { message, context } = await req.json();
    if (!message || typeof message !== 'string') return Response.json({ error: 'Message required' }, { status: 400 });
    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
    if (!apiKey) return Response.json({ error: 'AI Gateway is not configured yet' }, { status: 503 });
    const system = `You are HARDLE AI, a concise expert on hardstyle, rawstyle, hardcore and the HARDLE guessing game. Help the player understand guesses, artists, labels, eras and genres without revealing today's answer unless the player has already finished the game. Be fun, direct and use Swedish unless the user writes in English. Never invent track metadata. Available HARDLE catalog context: ${JSON.stringify(context || [])}`;
    const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': \`Bearer ${apiKey}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: message }],
        max_tokens: 300
      })
    });
    const data = await r.json();
    if (!r.ok) return Response.json({ error: data?.error?.message || 'AI request failed' }, { status: 502 });
    return Response.json({ text: data.choices?.[0]?.message?.content || 'Ingen respons.' });
  } catch (e) {
    return Response.json({ error: 'AI agent unavailable' }, { status: 500 });
  }
}
