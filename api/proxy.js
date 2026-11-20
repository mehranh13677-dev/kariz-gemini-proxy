export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-goog-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const fullUrl = new URL(req.url, 'https://localhost');
  const queryPath = fullUrl.searchParams.get('path');
  const subPath = fullUrl.pathname.replace(/^\/api\/proxy/, '');
  const upstreamPath = queryPath || subPath;

  if (req.method === 'GET' && (!upstreamPath || upstreamPath === '/')) {
    return res.status(200).json({
      ok: true,
      service: 'Kariz Teb Gemini Proxy',
      status: 'ready'
    });
  }

  fullUrl.searchParams.delete('path');
  const cleanSearch = fullUrl.searchParams.toString();
  const normalizedPath = upstreamPath.startsWith('/') ? upstreamPath : `/${upstreamPath}`;
  const targetUrl = `https://generativelanguage.googleapis.com${normalizedPath}${cleanSearch ? `?${cleanSearch}` : ''}`;

  const forwardHeaders = {
    'Content-Type': 'application/json'
  };
  if (req.headers['x-goog-api-key']) {
    forwardHeaders['x-goog-api-key'] = req.headers['x-goog-api-key'];
  }

  let body = undefined;
  if (!['GET', 'HEAD'].includes(req.method)) {
    if (typeof req.body === 'string') {
      body = req.body;
    } else if (req.body && typeof req.body === 'object') {
      body = JSON.stringify(req.body);
    } else {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      body = Buffer.concat(chunks);
    }
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });

    const text = await upstreamRes.text();
    const contentType = upstreamRes.headers.get('content-type') || 'application/json; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    return res.status(upstreamRes.status).send(text);
  } catch (err) {
    return res.status(502).json({
      error: 'Proxy request failed',
      detail: err.message
    });
  }
}
