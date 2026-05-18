import Fuse, { type IFuseOptions } from "fuse.js";
import type { LucideIcon } from "lucide-react";
import {
  ACTION_INTENT_TOKENS,
  COMMAND_RANKING_CONFIG,
  FUSE_OPTIONS,
  SEARCH_ITEM_TYPE,
  SEARCH_RESULT_LIMIT,
  SEARCH_TARGET_REGEX,
} from "~/constants";
import type { FavoriteItemRecord } from "~/core/storage";
import type { ActionItem, SearchCollections } from "~/popup-react/types";
import {
  type OpenStatsLookup,
  sortAndFormatSearchResult,
} from "~/popup/utils/sortAndFormatSearchResult";

type CommandReason =
  | "action-verb-match"
  | "browser-search"
  | "current-tab-action"
  | "favorite"
  | "frequently-opened"
  | "prefix-match"
  | "recent-host"
  | "title-match"
  | "url-match";

type CommandRanking = {
  baseScore: number;
  finalScore: number;
  reasons: CommandReason[];
};

type CommandPageSource =
  | typeof SEARCH_ITEM_TYPE.BOOKMARK
  | typeof SEARCH_ITEM_TYPE.HISTORY
  | typeof SEARCH_ITEM_TYPE.TAB;

type CommandPageItem = {
  badge: "Bookmark" | "History" | "Tab";
  faviconUrl: string;
  id: string;
  kind: "page";
  ranking: CommandRanking;
  searchResult: SearchResult;
  source: CommandPageSource;
  subtitle: string;
  title: string;
};

type CommandActionItem = {
  action: ActionItem;
  badge: "Action";
  icon: LucideIcon;
  id: string;
  isFavorite: boolean;
  kind: "action";
  ranking: CommandRanking;
  subtitle: string;
  title: string;
};

type CommandBrowserSearchItem = {
  badge: "Search";
  faviconUrl: string;
  id: string;
  kind: "browser-search";
  query: string;
  ranking: CommandRanking;
  subtitle: string;
  title: string;
};

export type CommandItem = CommandActionItem | CommandBrowserSearchItem | CommandPageItem;

export type ParsedCommandQuery = {
  actionForced: boolean;
  rawQuery: string;
  searchQuery: string;
  target: "all" | "bookmarks" | "histories" | "tabs";
};

export type QueryIntent = "action" | "mixed" | "navigation";

type RecentContextBoost = {
  activeHostname: string | null;
  recentHostnames: Set<string>;
};

type SearchEngineState = {
  favIconUrl: string;
  name: string;
};

type BuildCommandItemsInput = {
  favoriteActionIds?: string[];
  favoriteOrder?: string[];
  actionItems: ActionItem[];
  collections: SearchCollections;
  favoriteItems?: FavoriteItemRecord[];
  favoriteLookup: Set<string>;
  openStatsLookup?: OpenStatsLookup;
  query: string;
  recentContext?: RecentContextBoost;
  searchIndexes?: CommandSearchIndexes;
  searchEngine: SearchEngineState;
};

type CommandExecutionContext = {
  browserSearch: (query: string, inNewTab?: boolean) => Promise<void>;
  inNewTab: boolean;
  openResult: (item: SearchResult, inNewTab: boolean) => Promise<void>;
};

type ActionSearchDocument = ActionItem & {
  searchTerm: string;
};

export type CommandSearchIndexes = {
  actions: Fuse<ActionSearchDocument>;
  bookmarks: Fuse<SearchItem>;
  histories: Fuse<SearchItem>;
  tabs: Fuse<SearchItem>;
  all: Fuse<SearchItem>;
};

const ACTION_SEARCH_OPTIONS = {
  distance: FUSE_OPTIONS.distance,
  includeScore: true,
  keys: [
    {
      name: "title",
      weight: 0.45,
    },
    {
      name: "keywords",
      weight: 0.4,
    },
    {
      name: "description",
      weight: 0.15,
    },
    {
      name: "searchTerm",
      weight: 0.1,
    },
  ],
  minMatchCharLength: 1,
  shouldSort: true,
  threshold: 0.35,
  useExtendedSearch: true,
} satisfies IFuseOptions<ActionSearchDocument>;

function toActionSearchDocument(item: ActionItem): ActionSearchDocument {
  return {
    ...item,
    searchTerm: `${item.title} ${item.description} ${item.keywords}`,
  };
}

function commandScore(score?: number) {
  return score ?? 0;
}

function createSearchFuseIndex(items: SearchItem[]) {
  return new Fuse(items, FUSE_OPTIONS);
}

function toSearchResult(item: SearchItem): SearchResult {
  return {
    ...item,
    isFavorite: false,
    matchedWord: "",
    score: 0,
  };
}

function toFavoriteResult(item: FavoriteItemRecord): SearchResult {
  return {
    ...item,
    isFavorite: true,
    matchedWord: "",
    score: 0,
    searchTerm: `${item.title} ${item.url} ${item.folderName ?? ""}`.trim(),
  };
}

function getPageBadge(type: CommandPageSource) {
  if (type === SEARCH_ITEM_TYPE.BOOKMARK) {
    return "Bookmark";
  }

  if (type === SEARCH_ITEM_TYPE.TAB) {
    return "Tab";
  }

  return "History";
}

function getResultKey(
  item: Pick<SearchResult, "bookmarkId" | "lastVisitTime" | "tabId" | "title" | "type" | "url">,
) {
  if (item.type === SEARCH_ITEM_TYPE.TAB && item.tabId !== undefined) {
    return `${item.type}:${item.tabId}:${item.title}:${item.url}`;
  }

  if (item.type === SEARCH_ITEM_TYPE.BOOKMARK && item.bookmarkId) {
    return `${item.type}:${item.bookmarkId}:${item.title}:${item.url}`;
  }

  return `${item.type}:${item.lastVisitTime ?? ""}:${item.title}:${item.url}`;
}

function getActionKey(item: ActionItem) {
  return `action:${item.id}`;
}

function getOpenStatsReason(
  item: SearchResult,
  openStatsLookup?: OpenStatsLookup,
): CommandReason[] {
  const stats = openStatsLookup?.get(item.url);

  if (!stats) {
    return [];
  }

  return stats.openCount > 1 ? ["frequently-opened"] : [];
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
}

function getSearchTarget(query: string): ParsedCommandQuery["target"] {
  if (/^\/b(?:\s|$)/u.test(query)) {
    return "bookmarks";
  }

  if (/^\/h(?:\s|$)/u.test(query)) {
    return "histories";
  }

  if (/^\/t(?:\s|$)/u.test(query)) {
    return "tabs";
  }

  return "all";
}

function getTargetItems(collections: SearchCollections, target: ParsedCommandQuery["target"]) {
  if (target === "bookmarks") {
    return collections.bookmarks;
  }

  if (target === "histories") {
    return collections.histories;
  }

  if (target === "tabs") {
    return collections.tabs;
  }

  return [...collections.histories, ...collections.bookmarks, ...collections.tabs];
}

export function createCommandSearchIndexes(
  collections: SearchCollections,
  actionItems: ActionItem[],
): CommandSearchIndexes {
  return {
    actions: new Fuse(actionItems.map(toActionSearchDocument), ACTION_SEARCH_OPTIONS),
    all: createSearchFuseIndex(getTargetItems(collections, "all")),
    bookmarks: createSearchFuseIndex(collections.bookmarks),
    histories: createSearchFuseIndex(collections.histories),
    tabs: createSearchFuseIndex(collections.tabs),
  };
}

function getTargetIndex(indexes: CommandSearchIndexes, target: ParsedCommandQuery["target"]) {
  if (target === "bookmarks") {
    return indexes.bookmarks;
  }

  if (target === "histories") {
    return indexes.histories;
  }

  if (target === "tabs") {
    return indexes.tabs;
  }

  return indexes.all;
}

function isActionVerbQuery(searchQuery: string) {
  const tokens = tokenize(searchQuery);
  return tokens.some((token) => (ACTION_INTENT_TOKENS as readonly string[]).includes(token));
}

function toPageCommandItem(item: SearchResult, openStatsLookup?: OpenStatsLookup): CommandPageItem {
  const reasons: CommandReason[] = [
    item.title ? "title-match" : "url-match",
    ...getOpenStatsReason(item, openStatsLookup),
  ];

  if (item.isFavorite) {
    reasons.push("favorite");
  }

  return {
    badge: getPageBadge(item.type),
    faviconUrl: item.faviconUrl,
    id: `page:${getResultKey(item)}`,
    kind: "page",
    ranking: {
      baseScore: commandScore(item.score),
      finalScore: commandScore(item.score),
      reasons,
    },
    searchResult: item,
    source: item.type,
    subtitle: item.folderName ? `${item.folderName} · ${item.url}` : item.url,
    title: item.title,
  };
}

function getInitialPageCommandItems(
  input: BuildCommandItemsInput,
  parsedQuery: ParsedCommandQuery,
) {
  const favoriteItems = (input.favoriteItems ?? []).map(toFavoriteResult);
  let results: SearchResult[] = favoriteItems;

  if (parsedQuery.target === "histories") {
    results = input.collections.histories.slice(0, 50).map(toSearchResult);
  }

  if (parsedQuery.target === "bookmarks") {
    const bookmarkFavorites = favoriteItems.filter(
      (item) => item.type === SEARCH_ITEM_TYPE.BOOKMARK,
    );
    const bookmarkResults = input.collections.bookmarks
      .slice(0, 50)
      .map(toSearchResult)
      .filter(
        (item) =>
          !bookmarkFavorites.some(
            (favorite) => favorite.url === item.url && favorite.title === item.title,
          ),
      );

    results = [...bookmarkFavorites, ...bookmarkResults];
  }

  if (parsedQuery.target === "tabs") {
    results = input.collections.tabs.slice(0, 50).map(toSearchResult);
  }

  return results.map((item) => toPageCommandItem(item, input.openStatsLookup));
}

function getPageCommandItems(input: BuildCommandItemsInput, parsedQuery: ParsedCommandQuery) {
  if (!parsedQuery.searchQuery) {
    return getInitialPageCommandItems(input, parsedQuery);
  }

  const indexes =
    input.searchIndexes ?? createCommandSearchIndexes(input.collections, input.actionItems);
  const fuseIndex = getTargetIndex(indexes, parsedQuery.target);
  const searchResults = sortAndFormatSearchResult(
    fuseIndex.search(parsedQuery.searchQuery, {
      limit: SEARCH_RESULT_LIMIT,
    }),
    {
      favoriteLookup: input.favoriteLookup,
      openStatsLookup: input.openStatsLookup,
      recentContext: input.recentContext,
    },
  );

  return searchResults.map((item) => toPageCommandItem(item, input.openStatsLookup));
}

function toActionCommandItem(
  item: ActionItem,
  score: number,
  favoriteActionIds: string[] = [],
): CommandActionItem {
  const isFavorite = favoriteActionIds.includes(item.id);

  return {
    action: item,
    badge: "Action",
    icon: item.icon,
    id: getActionKey(item),
    isFavorite,
    kind: "action",
    ranking: {
      baseScore: score,
      finalScore: score,
      reasons: isFavorite ? ["current-tab-action", "favorite"] : ["current-tab-action"],
    },
    subtitle: item.description,
    title: item.title,
  };
}

function getActionCommandItems(input: BuildCommandItemsInput, parsedQuery: ParsedCommandQuery) {
  const indexes =
    input.searchIndexes ?? createCommandSearchIndexes(input.collections, input.actionItems);
  const documents = input.actionItems.map(toActionSearchDocument);

  if (!parsedQuery.searchQuery) {
    const favoriteActions = (input.favoriteActionIds ?? [])
      .map((id, index) => {
        const item = input.actionItems.find((actionItem) => actionItem.id === id);

        return item ? toActionCommandItem(item, index / 100, input.favoriteActionIds) : null;
      })
      .filter((item): item is CommandActionItem => item !== null);

    if (parsedQuery.actionForced) {
      const favoriteActionIds = new Set(favoriteActions.map((item) => item.action.id));
      const remainingActions = documents
        .filter((item) => !favoriteActionIds.has(item.id))
        .map((item, index) =>
          toActionCommandItem(
            item,
            (favoriteActions.length + index) / 100,
            input.favoriteActionIds,
          ),
        );

      return [...favoriteActions, ...remainingActions];
    }

    return favoriteActions;
  }

  const fuseIndex = indexes.actions;
  const queryTokens = tokenize(parsedQuery.searchQuery);

  return fuseIndex
    .search(parsedQuery.searchQuery, {
      limit: SEARCH_RESULT_LIMIT,
    })
    .map((result) => {
      const actionTokens = tokenize(result.item.searchTerm);
      const titleTokens = tokenize(result.item.title);
      const keywordTokens = tokenize(result.item.keywords);
      const exactTokenMatch = queryTokens.some((token) => actionTokens.includes(token));
      const titleMatchCount = queryTokens.filter((token) => titleTokens.includes(token)).length;
      const keywordMatchCount = queryTokens.filter((token) => keywordTokens.includes(token)).length;
      const exactScore = 0.01 - titleMatchCount * 0.001 - keywordMatchCount * 0.0005;
      const score = exactTokenMatch
        ? Math.min(commandScore(result.score), exactScore)
        : result.score;

      return toActionCommandItem(result.item, commandScore(score), input.favoriteActionIds);
    })
    .sort((left, right) => {
      if (left.ranking.baseScore !== right.ranking.baseScore) {
        return left.ranking.baseScore - right.ranking.baseScore;
      }

      return (
        input.actionItems.findIndex((item) => item.id === left.action.id) -
        input.actionItems.findIndex((item) => item.id === right.action.id)
      );
    });
}

function getBrowserSearchCommandItem(
  input: BuildCommandItemsInput,
  parsedQuery: ParsedCommandQuery,
  pageItems: CommandPageItem[],
) {
  if (!parsedQuery.searchQuery || parsedQuery.actionForced || parsedQuery.target !== "all") {
    return null;
  }

  const bestPageScore = pageItems[0]?.ranking.baseScore ?? Number.POSITIVE_INFINITY;
  const baseScore =
    bestPageScore < COMMAND_RANKING_CONFIG.strongPageMatchThreshold
      ? COMMAND_RANKING_CONFIG.browserSearchStrongMatchScore
      : COMMAND_RANKING_CONFIG.browserSearchWeakMatchScore;

  const item: CommandBrowserSearchItem = {
    badge: "Search",
    faviconUrl: input.searchEngine.favIconUrl,
    id: `browser-search:${parsedQuery.searchQuery}`,
    kind: "browser-search",
    query: parsedQuery.searchQuery,
    ranking: {
      baseScore,
      finalScore: baseScore,
      reasons: ["browser-search"],
    },
    subtitle: input.searchEngine.name || "Search",
    title: `Search "${parsedQuery.searchQuery}"`,
  };

  return item;
}

function applyIntentRanking(item: CommandItem, intent: QueryIntent) {
  let finalScore = item.ranking.baseScore;

  if (intent === "navigation" && item.kind === "page") {
    finalScore += COMMAND_RANKING_CONFIG.intentBoost.pageForNavigation;
  }

  if (intent === "navigation" && item.kind === "action") {
    finalScore += COMMAND_RANKING_CONFIG.intentBoost.actionForNavigation;
  }

  if (intent === "action" && item.kind === "action") {
    finalScore += COMMAND_RANKING_CONFIG.intentBoost.actionForAction;
  }

  if (intent === "action" && item.kind === "page") {
    finalScore += COMMAND_RANKING_CONFIG.intentBoost.pageForAction;
  }

  return {
    ...item,
    ranking: {
      ...item.ranking,
      finalScore,
      reasons:
        intent === "action" && item.kind === "action"
          ? [...item.ranking.reasons, "action-verb-match" as const]
          : item.ranking.reasons,
    },
  } satisfies CommandItem;
}

export function parseCommandQuery(query: string): ParsedCommandQuery {
  const rawQuery = query;
  const actionMatch = query.match(SEARCH_TARGET_REGEX.ACTION);
  const target = getSearchTarget(query);

  if (actionMatch) {
    return {
      actionForced: true,
      rawQuery,
      searchQuery: (actionMatch[1] ?? "").trim(),
      target: "all",
    };
  }

  return {
    actionForced: false,
    rawQuery,
    searchQuery:
      query.match(SEARCH_TARGET_REGEX.EITHER)?.[1]?.trim() ??
      (target === "all" ? query.trim() : ""),
    target,
  };
}

export function detectQueryIntent(parsedQuery: ParsedCommandQuery): QueryIntent {
  if (parsedQuery.actionForced) {
    return "action";
  }

  if (!parsedQuery.searchQuery) {
    return "navigation";
  }

  if (parsedQuery.target !== "all") {
    return "navigation";
  }

  if (isActionVerbQuery(parsedQuery.searchQuery)) {
    return "action";
  }

  if (
    /^[\w-]+\.[a-z]{2,}/u.test(parsedQuery.searchQuery) ||
    parsedQuery.searchQuery.includes("/")
  ) {
    return "navigation";
  }

  return "mixed";
}

export function buildCommandItems(input: BuildCommandItemsInput) {
  const inputWithIndexes =
    input.searchIndexes === undefined
      ? {
          ...input,
          searchIndexes: createCommandSearchIndexes(input.collections, input.actionItems),
        }
      : input;
  const parsedQuery = parseCommandQuery(input.query);
  const intent = detectQueryIntent(parsedQuery);
  const pageItems = getPageCommandItems(inputWithIndexes, parsedQuery);
  const actionItems = getActionCommandItems(inputWithIndexes, parsedQuery);
  const browserSearchItem = getBrowserSearchCommandItem(inputWithIndexes, parsedQuery, pageItems);

  const items: Array<CommandItem | null> = [...pageItems, ...actionItems, browserSearchItem];

  const sortedItems = items
    .filter((item): item is CommandItem => item !== null)
    .map((item) => applyIntentRanking(item, intent))
    .sort((left, right) => left.ranking.finalScore - right.ranking.finalScore);

  if (!parsedQuery.searchQuery && !parsedQuery.actionForced && parsedQuery.target === "all") {
    const favoriteOrder = inputWithIndexes.favoriteOrder ?? [];
    const favoriteOrderIndex = new Map(favoriteOrder.map((id, index) => [id, index]));

    sortedItems.sort((left, right) => {
      const leftIndex = favoriteOrderIndex.get(left.id) ?? Number.POSITIVE_INFINITY;
      const rightIndex = favoriteOrderIndex.get(right.id) ?? Number.POSITIVE_INFINITY;

      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      return left.ranking.finalScore - right.ranking.finalScore;
    });
  }

  return sortedItems.slice(0, SEARCH_RESULT_LIMIT);
}

export async function executeCommand(item: CommandItem, context: CommandExecutionContext) {
  if (item.kind === "page") {
    await context.openResult(item.searchResult, context.inNewTab);
    return;
  }

  if (item.kind === "action") {
    await item.action.run();
    return;
  }

  await context.browserSearch(item.query, context.inNewTab);
}
