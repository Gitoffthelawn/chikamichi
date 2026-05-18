import { sendToBackground } from "@plasmohq/messaging";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import browser, { type Search } from "webextension-polyfill";
import {
  type AppSettings,
  type OpenStatsRecord,
  getOpenStats,
  recordOpenedUrl,
} from "~/core/storage";
import {
  HISTORY_INITIAL_FETCH_LIMIT,
  SEARCH_ICON_DATA_URL_DARK,
  SEARCH_ICON_DATA_URL_LIGHT,
  SEARCH_ITEM_TYPE,
  SEARCH_TARGET_REGEX,
  THEME,
} from "~/constants";
import { t } from "~/i18n";
import { toggleFavoriteItems } from "~/popup-react/favorites";
import { SearchFooter } from "~/popup-react/components/search-page/SearchFooter";
import { SearchInputBar } from "~/popup-react/components/search-page/SearchInputBar";
import { SearchResultsPanel } from "~/popup-react/components/search-page/SearchResultsPanel";
import {
  buildCommandItems,
  createCommandSearchIndexes,
  executeCommand,
  type CommandItem,
} from "~/popup-react/command-items";
import { useActionItems } from "~/popup-react/hooks/use-action-items";
import { useFeedbackBadge } from "~/popup-react/hooks/use-feedback-badge";
import { EMPTY_COLLECTIONS, getResolvedTheme, reportError } from "~/popup-react/utils";
import { getSearchItems } from "~/popup/utils/getSearchItems";

type SearchCollections = Awaited<ReturnType<typeof getSearchItems>>;
type SearchEngineState = {
  favIconUrl: string;
  name: string;
};
type BrowserSearchWithDisposition = typeof browser.search & {
  Disposition: Record<"CURRENT_TAB" | "NEW_TAB", Search.Disposition>;
};

const OPENING_MIN_VISIBLE_MS = 400;

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    items.length < 2 ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const nextItems = items.slice();
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function getFavoritePageCommandId(item: SearchResult) {
  const type = item.type === SEARCH_ITEM_TYPE.TAB ? SEARCH_ITEM_TYPE.HISTORY : item.type;
  const lastVisitTime = item.type === SEARCH_ITEM_TYPE.TAB ? "" : (item.lastVisitTime ?? "");
  return `page:${type}:${lastVisitTime}:${item.title}:${item.url}`;
}

function getFavoriteCommandId(item: CommandItem) {
  if (item.kind === "action") {
    return item.id;
  }

  if (item.kind === "page") {
    return item.id;
  }

  return null;
}

function getHostname(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.replace(/^www\./u, "");
  } catch {
    return null;
  }
}

function reportPerformanceMeasure(name: string, duration: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("chikamichi:performance", {
      detail: {
        duration,
        name,
      },
    }),
  );
}

async function measureAsync<T>(name: string, task: () => Promise<T>) {
  const startedAt = performance.now();

  try {
    return await task();
  } finally {
    reportPerformanceMeasure(name, performance.now() - startedAt);
  }
}

export function SearchPage({
  onUpdateSettings,
  settings,
}: {
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  settings: AppSettings;
}) {
  const [activeTab, setActiveTab] = useState<browser.Tabs.Tab | null>(null);
  const [collections, setCollections] = useState<SearchCollections>(EMPTY_COLLECTIONS);
  const [favoriteActionIds, setFavoriteActionIds] = useState(settings.favoriteActionIds);
  const [favoriteItems, setFavoriteItems] = useState(settings.favoriteItems);
  const [favoriteOrder, setFavoriteOrder] = useState(settings.favoriteOrder);
  const [openStats, setOpenStats] = useState<OpenStatsRecord[]>([]);
  const [opening, setOpening] = useState(false);
  const [searchWord, setSearchWord] = useState(settings.defaultSearchPrefix);
  const [selectedNumber, setSelectedNumber] = useState(0);
  const [selectedKey, setSelectedKey] = useState("");
  const [draggedFavoriteIndex, setDraggedFavoriteIndex] = useState<number | null>(null);
  const [dragOverFavoriteIndex, setDragOverFavoriteIndex] = useState<number | null>(null);
  const [searchEngine, setSearchEngine] = useState<SearchEngineState>({
    favIconUrl: SEARCH_ICON_DATA_URL_LIGHT,
    name: "browser",
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<Array<HTMLElement | null>>([]);
  const resultsWrapperRef = useRef<HTMLDivElement>(null);
  const preserveSelectionOnCollectionsChangeRef = useRef(false);
  const searchWordRef = useRef(searchWord);
  const selectedNumberRef = useRef(0);
  const suppressHoverSelectionRef = useRef(false);
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const { badgeText, badgeVisible, clearBadge, showBadge } = useFeedbackBadge();
  const getMockActiveTab = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return (
      (
        window as typeof window & {
          chikamichiMockActiveTab?: browser.Tabs.Tab | null;
        }
      ).chikamichiMockActiveTab ?? null
    );
  }, []);
  const actionMode = useMemo(() => SEARCH_TARGET_REGEX.ACTION.test(searchWord), [searchWord]);
  const favoriteLookup = useMemo(
    () => new Set(favoriteItems.map((item) => `${item.url}::${item.title}`)),
    [favoriteItems],
  );
  const openStatsLookup = useMemo(
    () =>
      new Map(
        openStats.map((item) => [
          item.url,
          {
            lastOpenedAt: item.lastOpenedAt,
            openCount: item.openCount,
          },
        ]),
      ),
    [openStats],
  );
  const recentContext = useMemo(() => {
    const activeHostname = getHostname(activeTab?.url);
    const recentHostnames = new Set<string>();

    const recentItems = [...collections.tabs, ...collections.histories]
      .sort((a, b) => (b.lastVisitTime ?? 0) - (a.lastVisitTime ?? 0))
      .slice(0, 8);

    recentItems.forEach((item) => {
      const hostname = getHostname(item.url);

      if (!hostname || hostname === activeHostname) {
        return;
      }

      recentHostnames.add(hostname);
    });

    return {
      activeHostname,
      recentHostnames,
    };
  }, [activeTab?.url, collections.histories, collections.tabs]);
  useEffect(() => {
    setFavoriteActionIds(settings.favoriteActionIds);
    setFavoriteItems(settings.favoriteItems);
    setFavoriteOrder(settings.favoriteOrder);
  }, [settings.favoriteActionIds, settings.favoriteItems, settings.favoriteOrder]);

  useEffect(() => {
    setSearchWord(settings.defaultSearchPrefix);
  }, [settings.defaultSearchPrefix]);

  useEffect(() => {
    searchWordRef.current = searchWord;
  }, [searchWord]);

  const loadActiveTab = useCallback(async () => {
    const mockActiveTab = getMockActiveTab();
    if (mockActiveTab) {
      setActiveTab(mockActiveTab);
      return mockActiveTab;
    }

    const [currentTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (currentTab) {
      setActiveTab(currentTab);
      return currentTab;
    }

    const [fallbackTab] = await browser.tabs.query({});
    setActiveTab(fallbackTab ?? null);
    return fallbackTab ?? null;
  }, [getMockActiveTab]);

  useEffect(() => {
    let cancelled = false;

    measureAsync("load-active-tab", loadActiveTab).catch(reportError);

    measureAsync("load-initial-search-items", () =>
      getSearchItems({
        historyLimit: HISTORY_INITIAL_FETCH_LIMIT,
        includeBookmarks: false,
      }),
    )
      .then((initialCollections) => {
        if (cancelled) {
          return;
        }

        setCollections(initialCollections);

        return measureAsync("load-full-search-items", getSearchItems).then((fullCollections) => {
          if (cancelled) {
            return;
          }

          if (searchWordRef.current) {
            preserveSelectionOnCollectionsChangeRef.current = true;
          }

          setCollections(fullCollections);
        });
      })
      .catch(reportError);

    measureAsync("load-open-stats", getOpenStats).then(setOpenStats).catch(reportError);

    inputRef.current?.focus();

    return () => {
      cancelled = true;
    };
  }, [loadActiveTab]);

  useEffect(() => {
    const fallbackSearchEngine = {
      favIconUrl:
        getResolvedTheme(settings.theme) === THEME.DARK
          ? SEARCH_ICON_DATA_URL_DARK
          : SEARCH_ICON_DATA_URL_LIGHT,
      name: "browser",
    };

    if (!browser.search.get) {
      setSearchEngine(fallbackSearchEngine);
      return;
    }

    browser.search
      .get()
      .then((engines) => {
        const defaultEngine = engines.find((engine) => engine.isDefault);
        setSearchEngine(
          defaultEngine
            ? {
                favIconUrl: defaultEngine.favIconUrl ?? fallbackSearchEngine.favIconUrl,
                name: defaultEngine.name,
              }
            : fallbackSearchEngine,
        );
      })
      .catch(reportError);
  }, [settings.theme]);

  useEffect(() => {
    if (preserveSelectionOnCollectionsChangeRef.current) {
      preserveSelectionOnCollectionsChangeRef.current = false;
      return;
    }

    selectedNumberRef.current = 0;
    setSelectedNumber(0);
    setSelectedKey("");
    resultsWrapperRef.current?.scrollTo(0, 0);
  }, [collections, searchWord]);

  const refreshActiveTab = () => loadActiveTab();

  const currentPageIsFavorite = useMemo(() => {
    if (!activeTab?.url) {
      return false;
    }

    const currentTitle = activeTab.title ?? activeTab.url;

    return favoriteItems.some(
      (favorite) => favorite.url === activeTab.url && favorite.title === currentTitle,
    );
  }, [activeTab, favoriteItems]);

  const toggleCurrentPageFavorite = useCallback(async () => {
    if (!activeTab?.url) {
      return;
    }

    const currentTitle = activeTab.title ?? activeTab.url;
    const currentPage: SearchResult = {
      faviconUrl: activeTab.favIconUrl ?? "",
      isFavorite: currentPageIsFavorite,
      matchedWord: "",
      score: undefined,
      searchTerm: `${currentTitle} ${activeTab.url}`,
      tabId: activeTab.id,
      title: currentTitle,
      type: SEARCH_ITEM_TYPE.TAB,
      url: activeTab.url,
    };
    const nextFavoriteItems = toggleFavoriteItems(favoriteItems, currentPage);

    setFavoriteItems(nextFavoriteItems);
    await onUpdateSettings({
      favoriteItems: nextFavoriteItems,
    });
    await showBadge(currentPageIsFavorite ? t("badgeRemoveFavorite") : t("badgeAddFavorite"));
  }, [activeTab, currentPageIsFavorite, favoriteItems, onUpdateSettings, showBadge]);

  const actionItems = useActionItems({
    activeTab,
    currentPageIsFavorite,
    onToggleCurrentPageFavorite: toggleCurrentPageFavorite,
    refreshActiveTab,
    showBadge,
  });

  const searchIndexes = useMemo(() => {
    const startedAt = performance.now();
    const indexes = createCommandSearchIndexes(collections, actionItems);
    reportPerformanceMeasure("build-search-indexes", performance.now() - startedAt);
    return indexes;
  }, [actionItems, collections]);

  const closePopup = useCallback(() => {
    window.close();
  }, []);

  const runOpeningCommand = useCallback(
    async (command: () => Promise<void>) => {
      setOpening(true);
      const startedAt = Date.now();
      let closed = false;

      const closeOnce = () => {
        if (closed) {
          return;
        }

        closed = true;
        closePopup();
      };

      const closeTimer = window.setTimeout(() => {
        closeOnce();
      }, OPENING_MIN_VISIBLE_MS);

      try {
        await command();
        window.clearTimeout(closeTimer);
        window.setTimeout(
          () => {
            closeOnce();
          },
          Math.max(OPENING_MIN_VISIBLE_MS - (Date.now() - startedAt), 0),
        );
      } catch (error) {
        window.clearTimeout(closeTimer);
        setOpening(false);
        reportError(error);
      }
    },
    [closePopup],
  );

  const commandItems = useMemo(
    () =>
      buildCommandItems({
        actionItems,
        collections,
        favoriteActionIds,
        favoriteItems,
        favoriteLookup,
        favoriteOrder,
        openStatsLookup,
        query: searchWord,
        recentContext,
        searchEngine,
        searchIndexes,
      }),
    [
      actionItems,
      collections,
      favoriteActionIds,
      favoriteItems,
      favoriteOrder,
      favoriteLookup,
      openStatsLookup,
      recentContext,
      searchEngine,
      searchWord,
      searchIndexes,
    ],
  );

  const favoriteReorderEnabled =
    searchWord === "" && !actionMode && favoriteActionIds.length + favoriteItems.length > 1;

  const currentResultKeys = useMemo(() => commandItems.map((item) => item.id), [commandItems]);

  useEffect(() => {
    if (currentResultKeys.length === 0) {
      if (selectedNumber !== 0) {
        selectedNumberRef.current = 0;
        setSelectedNumber(0);
      }
      return;
    }

    if (!selectedKey) {
      const [firstKey] = currentResultKeys;

      if (selectedNumber !== 0) {
        selectedNumberRef.current = 0;
        setSelectedNumber(0);
      }

      if (firstKey !== selectedKey) {
        setSelectedKey(firstKey);
      }

      return;
    }

    const nextIndex = currentResultKeys.findIndex((item) => item === selectedKey);

    if (nextIndex >= 0) {
      if (nextIndex !== selectedNumber) {
        selectedNumberRef.current = nextIndex;
        setSelectedNumber(nextIndex);
      }
      return;
    }

    const fallbackIndex = Math.min(selectedNumber, currentResultKeys.length - 1);
    const fallbackKey = currentResultKeys[fallbackIndex];

    if (fallbackIndex !== selectedNumber) {
      selectedNumberRef.current = fallbackIndex;
      setSelectedNumber(fallbackIndex);
    }

    if (fallbackKey !== selectedKey) {
      setSelectedKey(fallbackKey);
    }
  }, [currentResultKeys, selectedKey, selectedNumber]);

  useEffect(() => {
    if (!favoriteReorderEnabled) {
      setDraggedFavoriteIndex(null);
      setDragOverFavoriteIndex(null);
    }
  }, [favoriteReorderEnabled]);

  const fixScrollPosition = useCallback((index: number) => {
    const selectedItem = resultRefs.current[index];

    if (!selectedItem) {
      return;
    }

    selectedItem.scrollIntoView({
      block: "nearest",
    });
  }, []);

  const changeSelectedItem = useCallback(
    (index: number) => {
      selectedNumberRef.current = index;
      setSelectedNumber(index);
      const item = commandItems[index];
      if (item) {
        setSelectedKey(item.id);
      }
      clearBadge();
    },
    [clearBadge, commandItems],
  );

  const changeSelectedItemByKeyboard = useCallback(
    (index: number) => {
      suppressHoverSelectionRef.current = true;
      flushSync(() => {
        changeSelectedItem(index);
      });
    },
    [changeSelectedItem],
  );

  const handlePointerSelection = useCallback(
    (index: number, clientX: number, clientY: number) => {
      const lastPointerPosition = lastPointerPositionRef.current;
      const pointerMoved =
        !lastPointerPosition ||
        lastPointerPosition.x !== clientX ||
        lastPointerPosition.y !== clientY;

      lastPointerPositionRef.current = {
        x: clientX,
        y: clientY,
      };

      if (suppressHoverSelectionRef.current) {
        if (!pointerMoved) {
          return;
        }

        suppressHoverSelectionRef.current = false;
      }

      changeSelectedItem(index);
    },
    [changeSelectedItem],
  );

  const browserSearch = async (query: string, inNewTab = false) => {
    if (browser.search.search) {
      const [currentTab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      await browser.search.search({
        query,
        tabId: inNewTab ? undefined : currentTab?.id,
      });
      return;
    }

    const searchApi = browser.search as BrowserSearchWithDisposition;

    await searchApi.query({
      disposition: inNewTab ? searchApi.Disposition.NEW_TAB : searchApi.Disposition.CURRENT_TAB,
      text: query,
    });
  };

  const updateOpenStats = useCallback(async (url: string) => {
    try {
      await recordOpenedUrl(url);
      setOpenStats(await getOpenStats());
    } catch (error) {
      reportError(error);
    }
  }, []);

  const openResult = useCallback(
    async (item: SearchResult, inNewTab: boolean) => {
      if (item.tabId !== undefined) {
        await sendToBackground({
          body: {
            tabId: item.tabId,
          },
          name: "change-current-tab",
        });
        updateOpenStats(item.url).catch(reportError);
        return;
      }

      const messageName =
        settings.openLinkInCurrentTab === inNewTab ? "open-new-tab-page" : "update-current-page";

      await sendToBackground({
        body: {
          url: item.url,
        },
        name: messageName,
      });
      updateOpenStats(item.url).catch(reportError);
    },
    [settings.openLinkInCurrentTab, updateOpenStats],
  );

  const toggleFavorite = useCallback(
    async (item?: SearchResult) => {
      let targetItem = item;

      if (!targetItem) {
        const commandItem = commandItems[selectedNumber];
        if (!commandItem || commandItem.kind !== "page") {
          return;
        }
        targetItem = commandItem.searchResult;
      }

      if (!targetItem) {
        return;
      }

      const isFavorite = favoriteItems.some(
        (favorite) => favorite.url === targetItem.url && favorite.title === targetItem.title,
      );
      const nextFavoriteItems = toggleFavoriteItems(favoriteItems, targetItem);
      const favoriteCommandId = getFavoritePageCommandId(targetItem);
      const nextFavoriteOrder = isFavorite
        ? favoriteOrder.filter((id) => id !== favoriteCommandId)
        : [...favoriteOrder, favoriteCommandId];

      setFavoriteItems(nextFavoriteItems);
      setFavoriteOrder(nextFavoriteOrder);
      setSelectedKey(favoriteCommandId);
      await onUpdateSettings({
        favoriteItems: nextFavoriteItems,
        favoriteOrder: nextFavoriteOrder,
      });
      await showBadge(isFavorite ? t("badgeRemoveFavorite") : t("badgeAddFavorite"));
    },
    [commandItems, favoriteItems, favoriteOrder, onUpdateSettings, selectedNumber],
  );

  const toggleActionFavorite = useCallback(
    async (item?: (typeof actionItems)[number]) => {
      let targetItem = item;

      if (!targetItem) {
        const commandItem = commandItems[selectedNumber];
        if (!commandItem || commandItem.kind !== "action") {
          return;
        }
        targetItem = commandItem.action;
      }

      if (!targetItem) {
        return;
      }

      const isFavorite = favoriteActionIds.includes(targetItem.id);
      const nextFavoriteActionIds = isFavorite
        ? favoriteActionIds.filter((id) => id !== targetItem.id)
        : [...favoriteActionIds, targetItem.id];
      const favoriteCommandId = `action:${targetItem.id}`;
      const nextFavoriteOrder = isFavorite
        ? favoriteOrder.filter((id) => id !== favoriteCommandId)
        : [...favoriteOrder, favoriteCommandId];

      setFavoriteActionIds(nextFavoriteActionIds);
      setFavoriteOrder(nextFavoriteOrder);
      setSelectedKey(favoriteCommandId);
      await onUpdateSettings({
        favoriteActionIds: nextFavoriteActionIds,
        favoriteOrder: nextFavoriteOrder,
      });
      await showBadge(isFavorite ? t("badgeRemoveFavorite") : t("badgeAddFavorite"));
    },
    [
      actionItems,
      commandItems,
      favoriteActionIds,
      favoriteOrder,
      onUpdateSettings,
      selectedNumber,
      showBadge,
    ],
  );

  const moveFavorite = async (direction: "up" | "down") => {
    if (searchWord !== "" || actionMode) {
      return;
    }

    const commandItem = commandItems[selectedNumber];
    if (!commandItem || (commandItem.kind !== "action" && commandItem.kind !== "page")) {
      return;
    }

    const targetIndex = direction === "down" ? selectedNumber + 1 : selectedNumber - 1;
    const targetCommandItem = commandItems[targetIndex];
    const fromId = getFavoriteCommandId(commandItem);
    const toId = targetCommandItem ? getFavoriteCommandId(targetCommandItem) : null;

    if (!fromId || !toId) {
      return;
    }

    const currentFavoriteOrder =
      favoriteOrder.length > 0
        ? favoriteOrder
        : commandItems.map(getFavoriteCommandId).filter((id): id is string => id !== null);
    const nextFavoriteOrder = moveArrayItem(
      currentFavoriteOrder,
      currentFavoriteOrder.indexOf(fromId),
      currentFavoriteOrder.indexOf(toId),
    );

    if (nextFavoriteOrder === currentFavoriteOrder) {
      return;
    }

    setFavoriteOrder(nextFavoriteOrder);
    await onUpdateSettings({
      favoriteOrder: nextFavoriteOrder,
    });
    changeSelectedItem(targetIndex);
    fixScrollPosition(targetIndex);
  };

  const reorderFavorite = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (searchWord !== "" || actionMode) {
        return;
      }

      const fromItem = commandItems[fromIndex];
      const toItem = commandItems[toIndex];

      if (!fromItem || !toItem) {
        return;
      }

      const fromId = getFavoriteCommandId(fromItem);
      const toId = getFavoriteCommandId(toItem);

      if (!fromId || !toId) {
        return;
      }

      const currentFavoriteOrder =
        favoriteOrder.length > 0
          ? favoriteOrder
          : commandItems.map(getFavoriteCommandId).filter((id): id is string => id !== null);
      const nextFavoriteOrder = moveArrayItem(
        currentFavoriteOrder,
        currentFavoriteOrder.indexOf(fromId),
        currentFavoriteOrder.indexOf(toId),
      );

      if (nextFavoriteOrder === currentFavoriteOrder) {
        return;
      }

      setFavoriteOrder(nextFavoriteOrder);
      await onUpdateSettings({
        favoriteOrder: nextFavoriteOrder,
      });
      changeSelectedItem(toIndex);
      fixScrollPosition(toIndex);
    },
    [
      actionMode,
      changeSelectedItem,
      commandItems,
      favoriteOrder,
      fixScrollPosition,
      onUpdateSettings,
      searchWord,
    ],
  );

  const handleFavoriteDragStateChange = useCallback(
    (draggedIndex: number | null, dragOverIndex: number | null) => {
      setDraggedFavoriteIndex(draggedIndex);
      setDragOverFavoriteIndex(dragOverIndex);
    },
    [],
  );

  const openSearchResultItem = useCallback(
    async (item: SearchResult) => {
      if (opening) {
        return;
      }

      await runOpeningCommand(() => openResult(item, false));
    },
    [openResult, opening, runOpeningCommand],
  );

  const toggleFavoriteItem = useCallback(
    (item: SearchResult) => {
      toggleFavorite(item).catch(reportError);
    },
    [toggleFavorite],
  );

  const toggleActionFavoriteItem = useCallback(
    (item: (typeof actionItems)[number]) => {
      toggleActionFavorite(item).catch(reportError);
    },
    [toggleActionFavorite],
  );

  const reorderFavoriteItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      reorderFavorite(fromIndex, toIndex).catch(reportError);
    },
    [reorderFavorite],
  );

  const runCommandItem = useCallback(
    (item: (typeof commandItems)[number]) => {
      if (opening) {
        return;
      }

      const closesPopup = item.kind === "page" || item.kind === "browser-search";
      if (closesPopup) {
        runOpeningCommand(() =>
          executeCommand(item, {
            browserSearch,
            inNewTab: false,
            openResult,
          }),
        ).catch(reportError);
        return;
      }

      executeCommand(item, {
        browserSearch,
        inNewTab: false,
        openResult,
      }).catch(reportError);
    },
    [browserSearch, openResult, opening, runOpeningCommand],
  );

  const copyCurrentUrl = async () => {
    const item = commandItems[selectedNumber];
    if (!item || item.kind !== "page") {
      return;
    }

    await navigator.clipboard.writeText(item.searchResult.url);
    await showBadge(t("badgeCopied"));
  };

  const applyDeletedResult = (
    deletedResultKey: string,
    deletedIndex: number,
    updateCollections: (currentCollections: SearchCollections) => SearchCollections,
  ) => {
    const remainingKeys = currentResultKeys.filter((key) => key !== deletedResultKey);
    const nextIndex = Math.min(deletedIndex, remainingKeys.length - 1);
    const nextKey = remainingKeys[nextIndex] ?? "";

    flushSync(() => {
      preserveSelectionOnCollectionsChangeRef.current = true;
      setCollections(updateCollections);
      selectedNumberRef.current = Math.max(nextIndex, 0);
      setSelectedNumber(Math.max(nextIndex, 0));
      setSelectedKey(nextKey);
    });
  };

  const deleteSelectedResult = async () => {
    const selectedIndex = selectedNumberRef.current;
    const commandItem = commandItems[selectedIndex];
    if (!commandItem || commandItem.kind !== "page" || actionMode) {
      return;
    }

    const item = commandItem.searchResult;
    const deletedResultKey = commandItem.id;

    if (item.type === SEARCH_ITEM_TYPE.HISTORY) {
      await browser.history.deleteUrl({
        url: item.url,
      });
      applyDeletedResult(deletedResultKey, selectedIndex, (currentCollections) => ({
        ...currentCollections,
        histories: currentCollections.histories.filter((history) => history.url !== item.url),
      }));
      await showBadge(t("badgeDeletedHistory"));
      return;
    }

    if (item.type === SEARCH_ITEM_TYPE.BOOKMARK && item.bookmarkId) {
      await browser.bookmarks.remove(item.bookmarkId);
      applyDeletedResult(deletedResultKey, selectedIndex, (currentCollections) => ({
        ...currentCollections,
        bookmarks: currentCollections.bookmarks.filter((bookmark) =>
          bookmark.bookmarkId
            ? bookmark.bookmarkId !== item.bookmarkId
            : !(bookmark.url === item.url && bookmark.title === item.title),
        ),
      }));
      await showBadge(t("badgeRemovedBookmark"));
      return;
    }

    if (item.type === SEARCH_ITEM_TYPE.TAB && item.tabId !== undefined) {
      await browser.tabs.remove(item.tabId);
      applyDeletedResult(deletedResultKey, selectedIndex, (currentCollections) => ({
        ...currentCollections,
        tabs: currentCollections.tabs.filter((tab) => tab.tabId !== item.tabId),
      }));
      await showBadge(t("badgeClosedTab"));
    }
  };

  const handleEnterKey = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    if (opening) {
      return;
    }

    const item =
      commandItems[selectedNumber] ??
      commandItems.find((commandItem) => commandItem.id === selectedKey) ??
      commandItems[0];

    if (item) {
      const closesPopup = item.kind === "page" || item.kind === "browser-search";
      if (closesPopup) {
        await runOpeningCommand(() =>
          executeCommand(item, {
            browserSearch,
            inNewTab: event.ctrlKey || event.metaKey,
            openResult,
          }),
        );
        return;
      }

      try {
        await executeCommand(item, {
          browserSearch,
          inNewTab: event.ctrlKey || event.metaKey,
          openResult,
        });
      } catch (error) {
        reportError(error);
      }
    }
  };

  const handleMoveKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const resultCount = commandItems.length;

    if (resultCount === 0) {
      return false;
    }

    if (event.key === "ArrowDown" || (event.ctrlKey && event.key === "n")) {
      event.preventDefault();
      const nextIndex = Math.min(selectedNumber + 1, resultCount - 1);
      changeSelectedItemByKeyboard(nextIndex);
      fixScrollPosition(nextIndex);
      return true;
    }

    if (event.key === "ArrowUp" || (event.ctrlKey && event.key === "p" && !event.shiftKey)) {
      event.preventDefault();
      const nextIndex = Math.max(selectedNumber - 1, 0);
      changeSelectedItemByKeyboard(nextIndex);
      fixScrollPosition(nextIndex);
      return true;
    }

    return false;
  };

  const handleShortcutKey = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "n") {
      event.preventDefault();
      await moveFavorite("down");
      return true;
    }

    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "p") {
      event.preventDefault();
      await moveFavorite("up");
      return true;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "f") {
      event.preventDefault();
      const commandItem = commandItems[selectedNumber];
      if (commandItem?.kind === "action") {
        await toggleActionFavorite(commandItem.action);
      } else {
        await toggleFavorite();
      }
      return true;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "c") {
      event.preventDefault();
      await copyCurrentUrl();
      return true;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "d") {
      event.preventDefault();
      await deleteSelectedResult();
      return true;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closePopup();
      return true;
    }

    return false;
  };

  const onKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (opening) {
      event.preventDefault();
      return;
    }

    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      return;
    }

    if (event.key === "Enter") {
      await handleEnterKey(event);
      return;
    }

    if (handleMoveKey(event)) {
      return;
    }

    await handleShortcutKey(event);
  };

  return (
    <section className="h-full overflow-hidden" data-testid="page-search">
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
        <SearchInputBar
          actionMode={actionMode}
          inputRef={inputRef}
          opening={opening}
          searchWord={searchWord}
          setSearchWord={setSearchWord}
          onKeyDown={onKeyDown}
        />
        <SearchResultsPanel
          actionMode={actionMode}
          commandItems={commandItems}
          draggedFavoriteIndex={draggedFavoriteIndex}
          dragOverFavoriteIndex={dragOverFavoriteIndex}
          favoriteReorderEnabled={favoriteReorderEnabled}
          handleFavoriteDragStateChange={handleFavoriteDragStateChange}
          handlePointerSelection={handlePointerSelection}
          openSearchResultItem={openSearchResultItem}
          opening={opening}
          reorderFavoriteItem={reorderFavoriteItem}
          resultRefs={resultRefs}
          resultsWrapperRef={resultsWrapperRef}
          runCommandItem={runCommandItem}
          selectedNumber={selectedNumber}
          toggleActionFavoriteItem={toggleActionFavoriteItem}
          toggleFavoriteItem={toggleFavoriteItem}
        />
        <SearchFooter
          badgeText={badgeText}
          badgeVisible={badgeVisible}
          openLinkInCurrentTab={settings.openLinkInCurrentTab}
        />
      </div>
    </section>
  );
}
