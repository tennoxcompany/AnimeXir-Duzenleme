export default async function handler(req: any, res: any) {
  const q = String(req.query?.q ?? '').trim();
  if (!q) {
    res.status(200).json({ characters: [] });
    return;
  }

  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 12) {
        characters(search: $search, sort: FAVOURITES_DESC) {
          id
          name { full }
          image { large }
          media(perPage: 1, type: ANIME, sort: POPULARITY_DESC) {
            nodes { title { english romaji } bannerImage coverImage { extraLarge } }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { search: q } }),
    });
    const json = (await response.json()) as {
      data?: {
        Page?: {
          characters?: Array<{
            id: number;
            name: { full: string };
            image: { large?: string };
            media?: {
              nodes?: Array<{
                title?: { english?: string; romaji?: string };
                bannerImage?: string;
                coverImage?: { extraLarge?: string };
              }>;
            };
          }>;
        };
      };
    };

    const chars = (json.data?.Page?.characters ?? []).map((c) => {
      const media = c.media?.nodes?.[0];
      return {
        id: `anilist-char-${c.id}`,
        name: c.name.full,
        anime: media?.title?.english || media?.title?.romaji || 'Anime',
        avatarUrl: c.image.large || '',
        bannerUrl: media?.bannerImage || media?.coverImage?.extraLarge || c.image.large || '',
      };
    });
    res.status(200).json({ characters: chars });
  } catch {
    res.status(200).json({ characters: [] });
  }
}
