import { CommunityProfile } from '../types/anime';

export interface TasteMatchResult {
  profile: CommunityProfile;
  sharedGenres: string[];
  sharedAnimeTitles: string[];
  matchScore: number;
}

export function computeTasteMatches(
  currentUser: CommunityProfile,
  profiles: CommunityProfile[],
  animesById: Map<string, { title: string; genres: string[] }>
): TasteMatchResult[] {
  const myGenres = new Set((currentUser.favoriteGenres ?? []).map((g) => g.toLowerCase()));
  const myAnimeTitles = new Set<string>();
  const myAnimeIds = new Set<string>();

  for (const pick of currentUser.topAnimePicks ?? []) {
    myAnimeIds.add(pick.id);
    if (pick.anilistId) myAnimeIds.add(`anilist-${pick.anilistId}`);
    myAnimeTitles.add(pick.title.toLowerCase());
  }
  for (const fid of currentUser.favoriteAnimeIds ?? []) {
    myAnimeIds.add(fid);
    const a = animesById.get(fid);
    if (a) myAnimeTitles.add(a.title.toLowerCase());
  }

  return profiles
    .filter((p) => p.id !== currentUser.id)
    .map((p) => {
      const theirGenres = p.favoriteGenres ?? [];
      const sharedGenres = theirGenres.filter((g) => myGenres.has(g.toLowerCase()));

      const sharedAnimeTitles: string[] = [];
      for (const pick of p.topAnimePicks ?? []) {
        const hit =
          myAnimeIds.has(pick.id) ||
          (pick.anilistId && myAnimeIds.has(`anilist-${pick.anilistId}`)) ||
          myAnimeTitles.has(pick.title.toLowerCase());
        if (hit && !sharedAnimeTitles.includes(pick.title)) {
          sharedAnimeTitles.push(pick.title);
        }
      }
      for (const fid of p.favoriteAnimeIds ?? []) {
        const a = animesById.get(fid);
        if (a && (myAnimeIds.has(fid) || myAnimeTitles.has(a.title.toLowerCase()))) {
          if (!sharedAnimeTitles.includes(a.title)) sharedAnimeTitles.push(a.title);
        }
      }

      const matchScore = sharedGenres.length * 2 + sharedAnimeTitles.length * 5;
      return {
        profile: p,
        sharedGenres,
        sharedAnimeTitles,
        matchScore,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore || (b.profile.likesCount ?? 0) - (a.profile.likesCount ?? 0));
}
