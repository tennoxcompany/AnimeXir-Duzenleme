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
    res.status(400).send('Geçersiz altyazı URL.');
    return;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    res.status(400).send('Yalnızca HTTP/HTTPS desteklenir.');
    return;
  }
  try {
    const upstream = await fetch(parsed.href);
    if (!upstream.ok) {
      res.status(502).send('Altyazı dosyası indirilemedi.');
      return;
    }
    const text = (await upstream.text()).replace(/\r\n/g, '\n').trim();
    const vtt = text.startsWith('WEBVTT')
      ? text
      : `WEBVTT\n\n${text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')}`;
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.status(200).send(vtt);
  } catch {
    res.status(502).send('Altyazı sunucusuna ulaşılamadı.');
  }
}
