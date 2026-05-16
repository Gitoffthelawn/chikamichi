import { randCatchPhrase, randNumber, randUrl, randUuid } from "@ngneat/falso";
import type { Bookmarks, History, Tabs } from "webextension-polyfill";

export const generateHistory = (
  args: { lastVisitTime?: number; title?: string; url?: string } = {},
): History.HistoryItem => ({
  id: randUuid(),
  lastVisitTime: args.lastVisitTime ?? Date.now(),
  title: args.title ?? randCatchPhrase(),
  url: args.url ?? randUrl(),
});

export const generateBookmark = (
  args: {
    children?: Bookmarks.BookmarkTreeNode[];
    title?: string;
    type?: Bookmarks.BookmarkTreeNodeType;
    url?: string;
  } = {},
): Bookmarks.BookmarkTreeNode => ({
  children: args.children ?? [],
  dateAdded: randNumber(),
  dateGroupModified: randNumber(),
  id: randUuid(),
  index: randNumber(),
  parentId: randUuid(),
  title: args.title ?? randCatchPhrase(),
  type: args.type ?? ("bookmark" as const),
  url: args.url ?? randUrl(),
});

export const generateTab = (
  args: {
    id?: number;
    lastAccessed?: number;
    muted?: boolean;
    pinned?: boolean;
    title?: string;
    url?: string;
    windowId?: number;
  } = {},
): Partial<Tabs.Tab> => ({
  id: args.id ?? randNumber(),
  lastAccessed: args.lastAccessed ?? Date.now(),
  mutedInfo: {
    muted: args.muted ?? false,
  },
  pinned: args.pinned ?? false,
  title: args.title ?? randCatchPhrase(),
  url: args.url ?? randUrl(),
  windowId: args.windowId ?? 1,
});
