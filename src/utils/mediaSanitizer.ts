export function sanitizeVideoSource(input?: string): string {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return '';
  let candidate = trimmed;
  if (trimmed.startsWith('<')) {
    if (!/^<iframe\b/i.test(trimmed)) {
      throw new Error('Yalnızca HTTPS video linki veya <iframe src="..."> gömme kodu kabul edilir.');
    }
    const match = trimmed.match(/\ssrc\s*=\s*(["'])(.*?)\1/i);
    if (!match?.[2]) {
      throw new Error('Iframe içinde geçerli bir src bağlantısı bulunamadı.');
    }
    candidate = match[2].replace(/&amp;/gi, '&').trim();
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Geçerli bir HTTPS video bağlantısı gir.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Video bağlantısı HTTP veya HTTPS olmalıdır.');
  }
  const host = parsed.hostname.toLowerCase();
  if (host.includes('sibnet.ru') && !parsed.pathname.includes('shell.php')) {
    const vidMatch = parsed.pathname.match(/video(\d+)/i);
    if (vidMatch?.[1]) {
      return `https://video.sibnet.ru/shell.php?videoid=${vidMatch[1]}`;
    }
  }
  if ((host === 'www.youtube.com' || host === 'youtube.com') && parsed.pathname === '/watch') {
    const v = parsed.searchParams.get('v');
    if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
  }
  if (host === 'youtu.be' && parsed.pathname.length > 1) {
    return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
  }
  return parsed.href;
}

export function normalizeSubtitleVtt(raw?: string): string {
  const text = (raw ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith('WEBVTT')) return text;
  const converted = text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return `WEBVTT\n\n${converted}`;
}
