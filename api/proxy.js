export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-goog-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const fullUrl = new URL(req.url, 'https://localhost');
  const upstreamPath = fullUrl.pathname.replace(/^\/api\/proxy/, '') || '/';
  const targetUrl = `https://generativelanguage.googleapis.com${upstreamPath}${fullUrl.search}`;

  const forwardHeaders = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const key = k.toLowerCase();
    if (!['host', 'connection', 'content-length'].includes(key) && v !== undefined) {
      forwardHeaders[key] = Array.isArray(v) ? v.join(', ') : v;
    }
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

    const contentType = upstreamRes.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.status(upstreamRes.status).send(Buffer.from(arrayBuffer));
  } catch (err) {
    return res.status(502).json({ error: 'Proxy request failed', detail: err.message });
  }
}
