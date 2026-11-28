export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'kariz-onesignal-proxy' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const rawPath = typeof req.query?.path === 'string' && req.query.path.startsWith('/')
      ? req.query.path
      : '/notifications';

    const targetUrl = 'https://api.onesignal.com' + rawPath;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';

    const bodyText = typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body || {});

    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {})
      },
      body: bodyText
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({
      error: 'OneSignal proxy error',
      detail: err?.message || String(err)
    });
  }
}

