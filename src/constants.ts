import type { IFuseOptions } from "fuse.js";

export const HISTORY_FETCH_DAYS = 180;
export const HISTORY_FETCH_LIMIT = 5000;
export const SEARCH_RESULT_LIMIT = 100;

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

export const THEME = {
  AUTO: "auto",
  DARK: "dark",
  LIGHT: "light",
} as const;

export const SEARCH_ICON_DATA_URL_LIGHT =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" role="img" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>';

export const SEARCH_ICON_DATA_URL_DARK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" role="img" fill="none" stroke="lightgrey" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>';

export const BADGE_TEXT = {
  ADD_FAVORITE: "Add to favorite",
  COPY: "Copied to clipboard",
  REMOVE_FAVORITE: "Removed from favorite ",
} as const;
