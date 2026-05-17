import { Copy, Pin, Search } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { SEARCH_ITEM_TYPE } from "~/constants";
import type { ActionItem, SearchCollections } from "~/popup-react/types";
import {
  buildCommandItems,
  detectQueryIntent,
  executeCommand,
  parseCommandQuery,
} from "~/popup-react/command-items";

const githubHistory: SearchItem = {
  faviconUrl: "https://github.com/favicon.ico",
  folderName: "",
  lastVisitTime: 20,
  searchTerm: "GitHub https://github.com",
  title: "GitHub",
  type: SEARCH_ITEM_TYPE.HISTORY,
  url: "https://github.com",
};

const notionBookmark: SearchItem = {
  bookmarkId: "bookmark-notion",
  faviconUrl: "https://notion.so/favicon.ico",
  folderName: "Work",
  searchTerm: "Notion https://notion.so Work",
  title: "Notion",
  type: SEARCH_ITEM_TYPE.BOOKMARK,
  url: "https://notion.so",
};

const pinboardHistory: SearchItem = {
  faviconUrl: "https://pinboard.in/favicon.ico",
  folderName: "",
  lastVisitTime: 10,
  searchTerm: "Pinboard https://pinboard.in",
  title: "Pinboard",
  type: SEARCH_ITEM_TYPE.HISTORY,
  url: "https://pinboard.in",
};

const collections: SearchCollections = {
  bookmarks: [notionBookmark],
  histories: [githubHistory, pinboardHistory],
  tabs: [
    {
      faviconUrl: "https://github.com/favicon.ico",
      folderName: "",
      lastVisitTime: 30,
      searchTerm: "GitHub Pull Requests https://github.com/pulls",
      tabId: 123,
      title: "GitHub Pull Requests",
      type: SEARCH_ITEM_TYPE.TAB,
      url: "https://github.com/pulls",
    },
  ],
};

const actionItems: ActionItem[] = [
  {
    description: "Copy the current page URL",
    icon: Copy,
    id: "copy-url",
    keywords: "copy url link address",
    run: vi.fn(() => Promise.resolve()),
    title: "Copy URL",
  },
  {
    description: "Copy the current page as Markdown",
    icon: Copy,
    id: "copy-markdown-link",
    keywords: "copy markdown md link",
    run: vi.fn(() => Promise.resolve()),
    title: "Copy Markdown Link",
  },
  {
    description: "Pin the current tab",
    icon: Pin,
    id: "pin-tab",
    keywords: "pin unpin tab",
    run: vi.fn(() => Promise.resolve()),
    title: "Pin Tab",
  },
];

function build(query: string) {
  return buildCommandItems({
    actionItems,
    collections,
    favoriteLookup: new Set(),
    openStatsLookup: new Map(),
    query,
    recentContext: {
      activeHostname: null,
      recentHostnames: new Set<string>(),
    },
    searchEngine: {
      favIconUrl: "search.svg",
      name: "Browser",
    },
  });
}

describe("parseCommandQuery", () => {
  it("keeps action prefix as intent while removing it from the searchable query", () => {
    expect(parseCommandQuery("> copy")).toEqual({
      actionForced: true,
      rawQuery: "> copy",
      searchQuery: "copy",
      target: "all",
    });
  });

  it("keeps existing page prefixes", () => {
    expect(parseCommandQuery("/t github")).toMatchObject({
      actionForced: false,
      searchQuery: "github",
      target: "tabs",
    });
  });
});

describe("detectQueryIntent", () => {
  it("detects action intent from standalone action tokens", () => {
    expect(detectQueryIntent(parseCommandQuery("copy"))).toBe("action");
    expect(detectQueryIntent(parseCommandQuery("md"))).toBe("action");
  });

  it("does not treat action-looking substrings as action intent", () => {
    expect(detectQueryIntent(parseCommandQuery("copycat"))).toBe("mixed");
    expect(detectQueryIntent(parseCommandQuery("pinboard"))).toBe("mixed");
  });
});

describe("buildCommandItems", () => {
  it("ranks page items above actions for navigation-like queries", () => {
    const items = build("github");
    expect(items[0]).toMatchObject({ kind: "page" });
  });

  it("ranks action items above pages for action-like queries", () => {
    const items = build("copy");
    expect(items[0]).toMatchObject({ kind: "action", title: "Copy URL" });
  });

  it("matches action aliases such as md", () => {
    const items = build("md");
    expect(items[0]).toMatchObject({ kind: "action", title: "Copy Markdown Link" });
  });

  it("does not boost action items for action-looking page titles", () => {
    const items = build("pinboard");
    expect(items[0]).toMatchObject({ kind: "page", title: "Pinboard" });
  });

  it("forces action ranking with the action prefix", () => {
    const items = build("> pin");
    expect(items[0]).toMatchObject({ kind: "action", title: "Pin Tab" });
  });

  it("keeps existing tab prefix filtering", () => {
    const items = build("/t github");
    expect(items.every((item) => item.kind !== "page" || item.source === "tab")).toBe(true);
    expect(items[0]).toMatchObject({ kind: "page", source: "tab" });
  });

  it("adds browser search above weak page matches and below strong page matches", () => {
    expect(build("unknown-query")[0]).toMatchObject({ kind: "browser-search" });

    const githubItems = build("github");
    const browserSearchIndex = githubItems.findIndex((item) => item.kind === "browser-search");
    const firstPageIndex = githubItems.findIndex((item) => item.kind === "page");
    expect(firstPageIndex).toBeGreaterThanOrEqual(0);
    expect(browserSearchIndex).toBeGreaterThan(firstPageIndex);
  });
});

describe("executeCommand", () => {
  it("routes command execution by kind", async () => {
    const openResult = vi.fn(() => Promise.resolve());
    const browserSearch = vi.fn(() => Promise.resolve());
    const action = {
      description: "Search",
      icon: Search,
      id: "search",
      keywords: "search",
      run: vi.fn(() => Promise.resolve()),
      title: "Search",
    };

    await executeCommand(
      {
        action,
        badge: "Action",
        icon: Search,
        id: "action:search",
        kind: "action",
        ranking: {
          baseScore: 0,
          finalScore: 0,
          reasons: [],
        },
        subtitle: "Search",
        title: "Search",
      },
      { browserSearch, inNewTab: false, openResult },
    );

    expect(action.run).toHaveBeenCalledTimes(1);
  });
});
