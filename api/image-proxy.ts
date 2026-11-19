const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254']);

function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(lower) || lower.endsWith('.local')) return true;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(lower)) return true;
  return false;
}

export default async function handler(req: any, res: any) {
  const rawUrl = String(req.query?.url ?? '').trim();
  if (!rawUrl) {
    res.status(400).send('URL gerekli.');
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    res.status(400).send('Geçersiz görsel URL.');
    return;
  }

  if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || isPrivateHost(parsed.hostname)) {
    res.status(400).send('Bu URL desteklenmiyor.');
    return;
  }

  try {
    const upstream = await fetch(parsed.href, {
      headers: { Accept: 'image/*' },
    });
    if (!upstream.ok) {
      res.status(502).send('Görsel indirilemedi.');
      return;
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      res.status(400).send('Geçersiz görsel formatı.');
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.byteLength > 5 * 1024 * 1024) {
      res.status(413).send('Görsel 5MB sınırını aşıyor.');
      return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buf);
  } catch {
    res.status(502).send('Görsel sunucusuna ulaşılamadı.');
  }
}
