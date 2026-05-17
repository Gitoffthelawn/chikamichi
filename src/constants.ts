import type { IFuseOptions } from "fuse.js";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

// Days of browser history loaded into search.
export const HISTORY_FETCH_DAYS = 180;
// Maximum browser history entries loaded at once.
export const HISTORY_FETCH_LIMIT = 10000;
// Maximum rendered search results.
export const SEARCH_RESULT_LIMIT = 100;

export const OPEN_STATS_CONFIG = {
  // Maximum learned URL records kept for ranking.
  limit: 500,
  // Storage key for learned URL open stats.
  storageKey: "chikamichi-open-stats",
} as const;

export const SEARCH_RANKING_CONFIG = {
  openStatsBoost: {
    // Maximum boost from repeated opens.
    frequencyMax: 0.036,
    // Weight applied to repeated-open count.
    frequencyMultiplier: 0.012,
    // Maximum total learned-ranking boost.
    maxTotal: 0.06,
    // Maximum boost from recent opens.
    recencyMax: 0.024,
    // Time window where recent opens affect ranking.
    recencyWindowMs: ONE_DAY_MS * 30,
  },
  // Boost for hosts seen in the current session.
  recentHostnameBoost: 0.025,
  // Rounds Fuse scores before last-visit sorting.
  scoreRoundingFactor: 100,
} as const;

export const COMMAND_RANKING_CONFIG = {
  // Score assigned when a page result already matches the query well.
  browserSearchStrongMatchScore: 0.65,
  // Score assigned when the browser search fallback should be easy to reach.
  browserSearchWeakMatchScore: 0.18,
  // Intent adjustments keep navigation and action results useful in one list.
  intentBoost: {
    actionForAction: -0.16,
    actionForNavigation: 0.12,
    pageForAction: 0.1,
    pageForNavigation: -0.06,
  },
  // Strong page matches keep browser search below navigation results.
  strongPageMatchThreshold: 0.25,
} as const;

export const ACTION_INTENT_TOKENS = [
  "capture",
  "copy",
  "duplicate",
  "favorite",
  "markdown",
  "md",
  "mute",
  "pin",
  "screenshot",
  "shot",
] as const;

export const SEARCH_TARGET_REGEX = {
  ACTION: /^>\s?(.*)/u,
  BOOKMARK: /^\/b\s(.*)/u,
  EITHER: /^\/[hbt]\s(.*)/u,
  HISTORY: /^\/h\s(.*)/u,
  TAB: /^\/t\s(.*)/u,
} as const;

export const SEARCH_ITEM_TYPE = {
  BOOKMARK: "bookmark",
  HISTORY: "history",
  TAB: "tab",
} as const;

export const FUSE_OPTIONS: IFuseOptions<SearchItem> = {
  distance: 300,
  includeMatches: true,
  includeScore: true,
  keys: [
    {
      name: "title",
      weight: 0.4,
    },
    {
      name: "folderName",
      weight: 0.3,
    },
    {
      name: "url",
      weight: 0.2,
    },
    {
      name: "searchTerm",
      weight: 0.1,
    },
  ],
  minMatchCharLength: 2,
  shouldSort: true,
  threshold: 0.4,
  useExtendedSearch: true,
};

export const PAGES = {
  INFO: "info",
  SEARCH: "search",
  SETTING: "setting",
} as const;

export const SEARCH_PREFIX = {
  BOOKMARK: "/b ",
  HISTORY: "/h ",
  TAB: "/t ",
};

export const LANGUAGE = {
  AUTO: "auto",
  EN: "en",
  JA: "ja",
} as const;

export const THEME = {
  AUTO: "auto",
  DARK: "dark",
  LIGHT: "light",
} as const;

export const SEARCH_ICON_DATA_URL_LIGHT =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" role="img" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>';

export const SEARCH_ICON_DATA_URL_DARK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" role="img" fill="none" stroke="lightgrey" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>';
