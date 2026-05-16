import type { FuseResult } from "fuse.js";
import { getMatchedRegExp } from "./getMatchedRegExp";

type RecentContextBoost = {
  activeHostname: string | null;
  recentHostnames: Set<string>;
};

const RECENT_HOSTNAME_BOOST = 0.025;

function getHostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./u, "");
  } catch {
    return null;
  }
}

function getRecentContextBoostScore(item: SearchItem, recentContext: RecentContextBoost) {
  const hostname = getHostname(item.url);

  if (!hostname) {
    return 0;
  }

  if (recentContext.recentHostnames.has(hostname)) {
    return RECENT_HOSTNAME_BOOST;
  }

  return 0;
}

export function sortSearchResult(searchResult: SearchResult[]) {
  const roundingFunc = (num: number) => Math.round(num * 100);

  // Group by score
  const mapKeys: number[] = [];
  const searchResultGroupByScore = searchResult.reduce(
    (acc, cur, _i) => {
      const score = roundingFunc(cur.score!);
      if (acc[score]) {
        acc[score].push(cur);
      } else {
        acc[score] = [cur];
        mapKeys.push(score);
      }
      return acc;
    },
    {} as Record<number, SearchResult[]>,
  );

  // Sort by last visit time of each score
  return mapKeys
    .sort((a, b) => a - b)
    .map((key) =>
      searchResultGroupByScore[key].sort((a, b) => {
        // Bookmarks and tabs don't have lastVisitTime
        // Display bookmarks and tabs in priority order
        const aTime = a.lastVisitTime || Infinity;
        const bTime = b.lastVisitTime || Infinity;

        if (aTime === bTime) {
          return 0;
        }
        return bTime > aTime ? 1 : -1;
      }),
    )
    .flat();
}

export function sortAndFormatSearchResult(
  searchResult: FuseResult<SearchItem>[],
  favoriteLookup: Set<string>,
  recentContext: RecentContextBoost = {
    activeHostname: null,
    recentHostnames: new Set<string>(),
  },
) {
  return sortSearchResult(
    searchResult.map((result) => ({
      ...result.item,
      isFavorite: favoriteLookup.has(`${result.item.url}::${result.item.title}`),
      matchedWord: getMatchedRegExp(
        result!.matches![0].value!,
        result!.matches![0].indices as [number, number][],
      ),
      score: Math.max(
        0,
        (result.score ?? 0) - getRecentContextBoostScore(result.item, recentContext),
      ),
    })),
  );
}
