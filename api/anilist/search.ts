const ANILIST_GENRE_TR: Record<string, string> = {
  Action: 'Aksiyon',
  Adventure: 'Macera',
  Comedy: 'Komedi',
  Drama: 'Dram',
  Fantasy: 'Fantezi',
  Horror: 'Korku',
  Mystery: 'Gizem',
  Psychological: 'Psikolojik',
  Romance: 'Romantizm',
  'Sci-Fi': 'Bilim Kurgu',
  'Slice of Life': 'Günlük Yaşam',
  Sports: 'Spor',
  Supernatural: 'Doğaüstü',
  Thriller: 'Gerilim',
  Mecha: 'Mecha',
  Music: 'Müzik',
  Ecchi: 'Ecchi',
};

function stripHtml(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

export default async function handler(req: any, res: any) {
  const q = String(req.query?.q ?? '').trim();
  const isPopular = req.query?.popular === '1' || !q;
  if (!q && req.query?.popular !== '1') {
    res.status(200).json({ results: [] });
    return;
  }

  const query = isPopular
    ? `
      query {
        Page(page: 1, perPage: 12) {
          media(type: ANIME, sort: POPULARITY_DESC) {
            id
            title { romaji english native }
            coverImage { extraLarge large }
            bannerImage
            description(asHtml: false)
            studios(isMain: true) { nodes { name } }
            status
            seasonYear
            averageScore
            episodes
            genres
            tags { name rank }
            trailer { id site }
          }
        }
      }
    `
    : `
      query ($search: String) {
        Page(page: 1, perPage: 12) {
          media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
            id
            title { romaji english native }
            coverImage { extraLarge large }
            bannerImage
            description(asHtml: false)
            studios(isMain: true) { nodes { name } }
            status
            seasonYear
            averageScore
            episodes
            genres
            tags { name rank }
            trailer { id site }
          }
        }
      }
    `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isPopular ? { query } : { query, variables: { search: q } }),
    });
    const json = (await response.json()) as {
      data?: {
        Page?: {
          media?: Array<{
            id: number;
            title: { romaji?: string; english?: string };
            coverImage: { extraLarge?: string; large?: string };
            bannerImage?: string;
            description?: string;
            studios?: { nodes?: Array<{ name: string }> };
            status?: string;
            seasonYear?: number;
            averageScore?: number;
            episodes?: number;
            genres?: string[];
            tags?: Array<{ name: string; rank?: number }>;
            trailer?: { id: string; site: string };
          }>;
        };
      };
    };
    const mediaList = json.data?.Page?.media ?? [];
    const results = mediaList.map((m) => {
      const mappedGenres = (m.genres || ['Aksiyon']).map((g) => ANILIST_GENRE_TR[g] || g);
      const hasSchoolTag = (m.tags ?? []).some((t) => t.name === 'School' && (t.rank ?? 0) >= 60);
      if (hasSchoolTag && !mappedGenres.includes('Okul')) {
        mappedGenres.push('Okul');
      }
      return {
        id: m.id,
        title: m.title.english || m.title.romaji || 'İsimsiz Anime',
        romajiTitle: m.title.romaji || '',
        coverUrl: m.coverImage.extraLarge || m.coverImage.large || '',
        bannerUrl: m.bannerImage || m.coverImage.extraLarge || m.coverImage.large || '',
        description: stripHtml(m.description),
        studio: m.studios?.nodes?.[0]?.name || 'Bilinmeyen Stüdyo',
        status: m.status === 'RELEASING' ? 'Devam Ediyor' : 'Tamamlandı',
        year: m.seasonYear || 2024,
        score: m.averageScore ? Number((m.averageScore / 10).toFixed(1)) : 8.0,
        episodeCount: m.episodes || 12,
        genres: mappedGenres,
        trailerId: m.trailer?.site === 'youtube' ? m.trailer.id : undefined,
      };
    });
    res.status(200).json({ results });
  } catch {
    res.status(502).json({ error: 'AniList sunucusuna ulaşılamadı.' });
  }
}
