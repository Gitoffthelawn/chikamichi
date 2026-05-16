import { sendToBackground } from "@plasmohq/messaging";
import {
  Camera,
  CameraIcon,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  SquareStack,
  Type,
  Volume2,
  VolumeOff,
  X,
} from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import browser from "webextension-polyfill";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { type AppSettings, DEFAULT_SETTINGS } from "~/core/storage";
import {
  SEARCH_ICON_DATA_URL_DARK,
  SEARCH_ICON_DATA_URL_LIGHT,
  SEARCH_RESULT_LIMIT,
  SEARCH_TARGET_REGEX,
  THEME,
} from "~/constants";
import { t } from "~/i18n";
import { cn } from "~/lib/utils";
import {
  moveFavoriteItem,
  moveFavoriteItemToIndex,
  toggleFavoriteItems,
} from "~/popup-react/favorites";
import { ActionResultRow, SearchResultRow } from "~/popup-react/components/result-rows";
import { Kbd } from "~/popup-react/components/common";
import type { ActionItem } from "~/popup-react/types";
import {
  EMPTY_COLLECTIONS,
  createFuseIndex,
  filterActionItems,
  getActionKey,
  getExtractedSearchWord,
  getInitialResults,
  getResolvedTheme,
  getResultKey,
  reportError,
} from "~/popup-react/utils";
import { getSearchItems } from "~/popup/utils/getSearchItems";
import { sortAndFormatSearchResult } from "~/popup/utils/sortAndFormatSearchResult";

type SearchCollections = Awaited<ReturnType<typeof getSearchItems>>;

async function downloadDataUrl(dataUrl: string, filename: string) {
  if (!chrome.downloads?.download) {
    return;
  }

  await new Promise<void>((resolve) => {
    chrome.downloads.download(
      {
        filename,
        saveAs: false,
        url: dataUrl,
      },
      () => {
        resolve();
      },
    );
  });
}

function sanitizeFilename(value: string) {
  return Array.from(value)
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0;

      if (
        character === "<" ||
        character === ">" ||
        character === ":" ||
        character === '"' ||
        character === "/" ||
        character === "\\" ||
        character === "|" ||
        character === "?" ||
        character === "*" ||
        codePoint < 32
      ) {
        return "-";
      }

      return character;
    })
    .join("")
    .slice(0, 80);
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

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function dataUrlToBlob(dataUrl: string) {
  const [header, base64Value] = dataUrl.split(",");

  if (!header || !base64Value) {
    throw new Error("Invalid data URL");
  }

  const mimeType = header.match(/data:(.*?);base64/u)?.[1] ?? "image/png";
  const binary = window.atob(base64Value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new Blob([bytes], { type: mimeType });
}

async function copyImageToClipboard(dataUrl: string) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard image copy is not supported");
  }

  const blob = dataUrlToBlob(dataUrl);
  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
}

function captureVisibleArea(tab: browser.Tabs.Tab) {
  return new Promise<string>((resolve) => {
    chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, (dataUrl) => {
      resolve(dataUrl);
    });
  });
}

function updateTab(tabId: number, properties: chrome.tabs.UpdateProperties) {
  return new Promise<void>((resolve) => {
    chrome.tabs.update(tabId, properties, () => {
      resolve();
    });
  });
}

function duplicateTab(tabId: number) {
  return new Promise<void>((resolve) => {
    chrome.tabs.duplicate(tabId, () => {
      resolve();
    });
  });
}

function reloadTab(tabId: number) {
  return new Promise<void>((resolve) => {
    chrome.tabs.reload(tabId, {}, () => {
      resolve();
    });
  });
}

function removeTab(tabId: number) {
  return new Promise<void>((resolve) => {
    chrome.tabs.remove(tabId, () => {
      resolve();
    });
  });
}

async function executeScript<Args extends unknown[], Result>(
  tabId: number,
  func: (...args: Args) => Result,
  ...args: Args
) {
  const [result] = await chrome.scripting.executeScript({
    args,
    func,
    target: {
      tabId,
    },
  });

  return result.result;
}

async function captureFullPage(tab: browser.Tabs.Tab) {
  if (tab.id === undefined) {
    return null;
  }

  const metrics = await executeScript(tab.id, () => ({
    fullHeight: document.documentElement.scrollHeight,
    fullWidth: document.documentElement.scrollWidth,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
  }));

  if (!metrics || tab.windowId === undefined) {
    return null;
  }

  const steps: number[] = [];
  for (let y = 0; y < metrics.fullHeight; y += metrics.viewportHeight) {
    steps.push(y);
  }

  await executeScript(tab.id, () => {
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";
  });

  let stitchedCanvas: HTMLCanvasElement | null = null;
  let scale = 1;

  const captureStep = async (stepIndex: number): Promise<void> => {
    const y = steps[stepIndex];

    if (y === undefined) {
      return;
    }

    await executeScript(
      tab.id,
      (nextY?: number) => {
        window.scrollTo(0, nextY ?? 0);
      },
      y,
    );
    await new Promise((resolve) => {
      window.setTimeout(resolve, 120);
    });

    const capture = await captureVisibleArea(tab);
    const image = await loadImage(capture);

    if (!stitchedCanvas) {
      scale = image.naturalWidth / metrics.viewportWidth;
      stitchedCanvas = document.createElement("canvas");
      stitchedCanvas.width = Math.round(metrics.fullWidth * scale);
      stitchedCanvas.height = Math.round(metrics.fullHeight * scale);
    }

    const context = stitchedCanvas.getContext("2d");

    if (context) {
      const sourceHeight = Math.min(metrics.viewportHeight, metrics.fullHeight - y) * scale;

      context.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        sourceHeight,
        0,
        y * scale,
        image.naturalWidth,
        sourceHeight,
      );
    }

    await captureStep(stepIndex + 1);
  };

  await captureStep(0);

  await executeScript(
    tab.id,
    (nextScrollX?: number, nextScrollY?: number) => {
      window.scrollTo(nextScrollX ?? 0, nextScrollY ?? 0);
    },
    metrics.scrollX,
    metrics.scrollY,
  );

  return stitchedCanvas?.toDataURL("image/png") ?? null;
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
  const [favoriteItems, setFavoriteItems] = useState(settings.favoriteItems);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [searchWord, setSearchWord] = useState(settings.defaultSearchPrefix);
  const [selectedNumber, setSelectedNumber] = useState(0);
  const [selectedKey, setSelectedKey] = useState("");
  const [badgeText, setBadgeText] = useState("");
  const [draggedFavoriteIndex, setDraggedFavoriteIndex] = useState<number | null>(null);
  const [dragOverFavoriteIndex, setDragOverFavoriteIndex] = useState<number | null>(null);
  const [searchEngine, setSearchEngine] = useState({
    favIconUrl: SEARCH_ICON_DATA_URL_LIGHT,
    name: "browser",
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<Array<HTMLElement | null>>([]);
  const resultsWrapperRef = useRef<HTMLDivElement>(null);
  const badgeTimerRef = useRef<number | null>(null);
  const suppressHoverSelectionRef = useRef(false);
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
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
  const deferredSearchWord = useDeferredValue(searchWord);
  const inputActionMode = useMemo(() => SEARCH_TARGET_REGEX.ACTION.test(searchWord), [searchWord]);
  const inputActionQuery = useMemo(() => {
    if (!inputActionMode) {
      return "";
    }

    return searchWord.match(SEARCH_TARGET_REGEX.ACTION)?.[1] ?? "";
  }, [inputActionMode, searchWord]);
  const actionMode = useMemo(
    () => SEARCH_TARGET_REGEX.ACTION.test(deferredSearchWord),
    [deferredSearchWord],
  );
  const actionQuery = useMemo(() => {
    if (!actionMode) {
      return "";
    }

    return deferredSearchWord.match(SEARCH_TARGET_REGEX.ACTION)?.[1] ?? "";
  }, [actionMode, deferredSearchWord]);
  const extractedSearchWord = useMemo(
    () => getExtractedSearchWord(deferredSearchWord),
    [deferredSearchWord],
  );
  const favoriteLookup = useMemo(
    () => new Set(favoriteItems.map((item) => `${item.url}::${item.title}`)),
    [favoriteItems],
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
  const fuseIndexes = useMemo(() => {
    const allItems = [...collections.histories, ...collections.bookmarks, ...collections.tabs];

    return {
      all: createFuseIndex(allItems),
      bookmarks: createFuseIndex(collections.bookmarks),
      histories: createFuseIndex(collections.histories),
      tabs: createFuseIndex(collections.tabs),
    };
  }, [collections]);

  useEffect(() => {
    setFavoriteItems(settings.favoriteItems);
  }, [settings.favoriteItems]);

  useEffect(() => {
    setSearchWord(settings.defaultSearchPrefix);
  }, [settings.defaultSearchPrefix]);

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
    loadActiveTab().catch(reportError);

    getSearchItems()
      .then(setCollections)
      .catch(reportError)
      .finally(() => {
        setLoadingCollections(false);
      });

    inputRef.current?.focus();
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
        setSearchEngine(defaultEngine ?? fallbackSearchEngine);
      })
      .catch(reportError);
  }, [settings.theme]);

  useEffect(() => {
    setSelectedNumber(0);
    setSelectedKey("");
    resultsWrapperRef.current?.scrollTo(0, 0);
  }, [collections, deferredSearchWord]);

  const refreshActiveTab = () => loadActiveTab();

  const closePopup = () => {
    window.close();
  };

  const showBadge = async (text: string, duration = 1600) => {
    if (badgeTimerRef.current !== null) {
      window.clearTimeout(badgeTimerRef.current);
    }

    flushSync(() => {
      setBadgeText(text);
    });

    await new Promise<void>((resolve) => {
      badgeTimerRef.current = window.setTimeout(() => {
        resolve();
      }, duration);
    });

    setBadgeText("");
  };

  const searchResult = useMemo(() => {
    if (actionMode) {
      return [];
    }

    if (
      collections.bookmarks.length === 0 &&
      collections.histories.length === 0 &&
      collections.tabs.length === 0
    ) {
      return [];
    }

    if (!deferredSearchWord || !extractedSearchWord) {
      return getInitialResults(deferredSearchWord, collections, {
        ...DEFAULT_SETTINGS,
        favoriteItems,
      });
    }

    let targetFuse = fuseIndexes.all;
    if (SEARCH_TARGET_REGEX.HISTORY.test(deferredSearchWord)) {
      targetFuse = fuseIndexes.histories;
    } else if (SEARCH_TARGET_REGEX.BOOKMARK.test(deferredSearchWord)) {
      targetFuse = fuseIndexes.bookmarks;
    } else if (SEARCH_TARGET_REGEX.TAB.test(deferredSearchWord)) {
      targetFuse = fuseIndexes.tabs;
    }

    return sortAndFormatSearchResult(
      targetFuse.search<SearchItem>(extractedSearchWord, {
        limit: SEARCH_RESULT_LIMIT,
      }),
      favoriteLookup,
      recentContext,
    );
  }, [
    activeTab,
    collections,
    deferredSearchWord,
    extractedSearchWord,
    favoriteItems,
    favoriteLookup,
    fuseIndexes,
    recentContext,
  ]);

  const actionItems = useMemo<ActionItem[]>(() => {
    if (!activeTab) {
      return [];
    }

    const currentTab = activeTab;
    const currentUrl = currentTab.url ?? "";
    const currentTitle = currentTab.title ?? currentUrl;
    const screenshotBaseName = sanitizeFilename(currentTitle || "page");

    return [
      {
        description: t("actionDescriptionCopyTitle"),
        icon: Type,
        id: "copy-title",
        keywords: "copy title text name",
        run: async () => {
          await navigator.clipboard.writeText(currentTitle);
          await showBadge(t("badgeCopiedTitle"));
        },
        title: t("actionCopyTitle"),
      },
      {
        description: t("actionDescriptionCopyUrl"),
        icon: Link2,
        id: "copy-url",
        keywords: "copy url link address",
        run: async () => {
          await navigator.clipboard.writeText(currentUrl);
          await showBadge(t("badgeCopied"));
        },
        title: t("actionCopyUrl"),
      },
      {
        description: t("actionDescriptionCopyMarkdownLink"),
        icon: Copy,
        id: "copy-markdown-link",
        keywords: "copy markdown link md",
        run: async () => {
          await navigator.clipboard.writeText(`[${currentTitle}](${currentUrl})`);
          await showBadge(t("badgeCopiedMarkdown"));
        },
        title: t("actionCopyMarkdownLink"),
      },
      {
        description: currentTab.mutedInfo?.muted
          ? t("actionDescriptionUnmuteTab")
          : t("actionDescriptionMuteTab"),
        icon: currentTab.mutedInfo?.muted ? Volume2 : VolumeOff,
        id: currentTab.mutedInfo?.muted ? "unmute-tab" : "mute-tab",
        keywords: "audio mute unmute sound volume",
        run: async () => {
          if (currentTab.id === undefined) {
            return;
          }
          await updateTab(currentTab.id, {
            muted: !currentTab.mutedInfo?.muted,
          });
          await refreshActiveTab();
          await showBadge(currentTab.mutedInfo?.muted ? t("badgeUnmutedTab") : t("badgeMutedTab"));
        },
        title: currentTab.mutedInfo?.muted ? t("actionUnmuteTab") : t("actionMuteTab"),
      },
      {
        description: currentTab.pinned
          ? t("actionDescriptionUnpinTab")
          : t("actionDescriptionPinTab"),
        icon: currentTab.pinned ? PinOff : Pin,
        id: currentTab.pinned ? "unpin-tab" : "pin-tab",
        keywords: "pin unpin keep tab",
        run: async () => {
          if (currentTab.id === undefined) {
            return;
          }
          await updateTab(currentTab.id, {
            pinned: !currentTab.pinned,
          });
          await refreshActiveTab();
          await showBadge(currentTab.pinned ? t("badgeUnpinnedTab") : t("badgePinnedTab"));
        },
        title: currentTab.pinned ? t("actionUnpinTab") : t("actionPinTab"),
      },
      {
        description: t("actionDescriptionDuplicateTab"),
        icon: SquareStack,
        id: "duplicate-tab",
        keywords: "duplicate clone copy tab",
        run: async () => {
          if (currentTab.id === undefined) {
            return;
          }
          await duplicateTab(currentTab.id);
          await showBadge(t("actionDuplicateTab"), 180);
        },
        title: t("actionDuplicateTab"),
      },
      {
        description: t("actionDescriptionReloadTab"),
        icon: RefreshCw,
        id: "reload-tab",
        keywords: "refresh reload current page",
        run: async () => {
          if (currentTab.id === undefined) {
            return;
          }
          await reloadTab(currentTab.id);
          await showBadge(t("actionReloadTab"));
        },
        title: t("actionReloadTab"),
      },
      {
        description: t("actionDescriptionCloseTab"),
        icon: X,
        id: "close-tab",
        keywords: "close remove current tab",
        run: async () => {
          if (currentTab.id === undefined) {
            return;
          }
          await removeTab(currentTab.id);
          await showBadge(t("actionCloseTab"), 180);
          closePopup();
        },
        title: t("actionCloseTab"),
      },
      {
        description: t("actionDescriptionScreenshotVisibleArea"),
        icon: Camera,
        id: "screenshot-visible-area",
        keywords: "screenshot capture visible area image png",
        run: async () => {
          const tab = (await refreshActiveTab()) ?? currentTab;
          if (!tab) {
            return;
          }
          const dataUrl = await captureVisibleArea(tab);
          await downloadDataUrl(dataUrl, `chikamichi-${screenshotBaseName}-visible.png`);
          await showBadge(t("badgeSavedScreenshot"));
        },
        title: t("actionScreenshotVisibleArea"),
      },
      {
        description: t("actionDescriptionScreenshotVisibleAreaClipboard"),
        icon: Camera,
        id: "screenshot-visible-area-clipboard",
        keywords: "screenshot capture visible area image png clipboard copy",
        run: async () => {
          const tab = (await refreshActiveTab()) ?? currentTab;
          if (!tab) {
            return;
          }
          const dataUrl = await captureVisibleArea(tab);
          await copyImageToClipboard(dataUrl);
          await showBadge(t("badgeCopied"));
        },
        title: t("actionScreenshotVisibleAreaClipboard"),
      },
      {
        description: t("actionDescriptionScreenshotFullPage"),
        icon: CameraIcon,
        id: "screenshot-full-page",
        keywords: "screenshot capture full page image png",
        run: async () => {
          const tab = (await refreshActiveTab()) ?? currentTab;
          if (!tab) {
            return;
          }
          const dataUrl = await captureFullPage(tab);
          if (!dataUrl) {
            return;
          }
          await downloadDataUrl(dataUrl, `chikamichi-${screenshotBaseName}-full-page.png`);
          await showBadge(t("badgeSavedScreenshot"));
        },
        title: t("actionScreenshotFullPage"),
      },
      {
        description: t("actionDescriptionScreenshotFullPageClipboard"),
        icon: CameraIcon,
        id: "screenshot-full-page-clipboard",
        keywords: "screenshot capture full page image png clipboard copy",
        run: async () => {
          const tab = (await refreshActiveTab()) ?? currentTab;
          if (!tab) {
            return;
          }
          const dataUrl = await captureFullPage(tab);
          if (!dataUrl) {
            return;
          }
          await copyImageToClipboard(dataUrl);
          await showBadge(t("badgeCopied"));
        },
        title: t("actionScreenshotFullPageClipboard"),
      },
    ];
  }, [activeTab]);

  const actionResults = useMemo(() => {
    if (!actionMode) {
      return [];
    }

    return filterActionItems(actionItems, actionQuery);
  }, [actionItems, actionMode, actionQuery]);

  const immediateActionResults = useMemo(
    () => filterActionItems(actionItems, inputActionQuery),
    [actionItems, inputActionQuery],
  );

  const favoriteReorderEnabled = searchWord === "" && !actionMode && favoriteItems.length > 1;

  const currentResultKeys = useMemo(
    () =>
      actionMode
        ? actionResults.map((item) => getActionKey(item))
        : searchResult.map((item) => getResultKey(item)),
    [actionMode, actionResults, searchResult],
  );

  useEffect(() => {
    if (currentResultKeys.length === 0) {
      if (selectedNumber !== 0) {
        setSelectedNumber(0);
      }
      return;
    }

    if (!selectedKey) {
      const [firstKey] = currentResultKeys;

      if (selectedNumber !== 0) {
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
        setSelectedNumber(nextIndex);
      }
      return;
    }

    const fallbackIndex = Math.min(selectedNumber, currentResultKeys.length - 1);
    const fallbackKey = currentResultKeys[fallbackIndex];

    if (fallbackIndex !== selectedNumber) {
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
      setSelectedNumber(index);
      if (actionMode) {
        const actionItem = actionResults[index];
        if (actionItem) {
          setSelectedKey(getActionKey(actionItem));
        }
      } else {
        const item = searchResult[index];
        if (item) {
          setSelectedKey(getResultKey(item));
        }
      }
      setBadgeText("");
    },
    [actionMode, actionResults, searchResult],
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

    await browser.search.query({
      disposition: inNewTab
        ? browser.search.Disposition.NEW_TAB
        : browser.search.Disposition.CURRENT_TAB,
      text: query,
    });
  };

  const openResult = useCallback(
    async (item: SearchResult, inNewTab: boolean) => {
      if (item.tabId !== undefined) {
        await sendToBackground({
          body: {
            tabId: item.tabId,
          },
          name: "change-current-tab",
        });
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
    },
    [settings.openLinkInCurrentTab],
  );

  const toggleFavorite = useCallback(
    async (item = searchResult[selectedNumber]) => {
      if (!item) {
        return;
      }

      const isFavorite = favoriteItems.some(
        (favorite) => favorite.url === item.url && favorite.title === item.title,
      );
      const nextFavoriteItems = toggleFavoriteItems(favoriteItems, item);

      setFavoriteItems(nextFavoriteItems);
      setSelectedKey(getResultKey(item));
      await onUpdateSettings({
        favoriteItems: nextFavoriteItems,
      });
      await showBadge(isFavorite ? t("badgeRemoveFavorite") : t("badgeAddFavorite"));
    },
    [favoriteItems, onUpdateSettings, searchResult, selectedNumber],
  );

  const moveFavorite = async (direction: "up" | "down") => {
    if (searchWord !== "" || actionMode || favoriteItems.length < 2) {
      return;
    }

    const moved = moveFavoriteItem(favoriteItems, selectedNumber, direction);
    if (moved.selectedIndex === selectedNumber) {
      return;
    }

    setFavoriteItems(moved.items);
    await onUpdateSettings({
      favoriteItems: moved.items,
    });
    changeSelectedItem(moved.selectedIndex);
    fixScrollPosition(moved.selectedIndex);
  };

  const reorderFavorite = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (searchWord !== "" || actionMode || favoriteItems.length < 2) {
        return;
      }

      const moved = moveFavoriteItemToIndex(favoriteItems, fromIndex, toIndex);
      if (moved.selectedIndex === fromIndex) {
        return;
      }

      setFavoriteItems(moved.items);
      await onUpdateSettings({
        favoriteItems: moved.items,
      });
      changeSelectedItem(moved.selectedIndex);
      fixScrollPosition(moved.selectedIndex);
    },
    [
      actionMode,
      changeSelectedItem,
      favoriteItems,
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
      await openResult(item, false);
      closePopup();
    },
    [openResult],
  );

  const toggleFavoriteItem = useCallback(
    (item: SearchResult) => {
      toggleFavorite(item).catch(reportError);
    },
    [toggleFavorite],
  );

  const reorderFavoriteItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      reorderFavorite(fromIndex, toIndex).catch(reportError);
    },
    [reorderFavorite],
  );

  const runActionItem = useCallback((item: ActionItem) => {
    item.run().catch(reportError);
  }, []);

  const copyCurrentUrl = async () => {
    const item = searchResult[selectedNumber];
    if (!item) {
      return;
    }

    await navigator.clipboard.writeText(item.url);
    await showBadge(t("badgeCopied"));
  };

  const handleEnterKey = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    if (inputActionMode) {
      const actionItem =
        immediateActionResults[selectedNumber] ??
        immediateActionResults.find((item) => getActionKey(item) === selectedKey) ??
        immediateActionResults[0];
      if (actionItem) {
        await actionItem.run();
      }
      return;
    }

    if (searchResult.length > 0) {
      await openResult(searchResult[selectedNumber], event.ctrlKey || event.metaKey);
      closePopup();
      return;
    }

    if (extractedSearchWord) {
      await browserSearch(extractedSearchWord, event.ctrlKey || event.metaKey);
      closePopup();
    }
  };

  const handleMoveKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const resultCount = inputActionMode ? immediateActionResults.length : searchResult.length;

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
      await toggleFavorite();
      return true;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "c") {
      event.preventDefault();
      await copyCurrentUrl();
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

  const renderResults = () => {
    if (actionMode) {
      if (actionResults.length > 0) {
        return actionResults.map((item, index) => (
          <ActionResultRow
            description={item.description}
            icon={item.icon}
            id={item.id}
            index={index}
            item={item}
            key={item.id}
            onPointerSelection={handlePointerSelection}
            onRunItem={runActionItem}
            rowRef={(element) => {
              resultRefs.current[index] = element;
            }}
            selected={index === selectedNumber}
            title={item.title}
          />
        ));
      }

      return (
        <div
          className="flex min-h-[180px] items-center justify-center rounded-[16px] border border-dashed border-border/10 bg-background/16 px-5 text-center"
          data-cy="action-result-empty"
        >
          <div className="space-y-1">
            <h2 className="text-base font-semibold">{t("actionModeTitle")}</h2>
            <p className="text-[13px] text-muted-foreground">{t("actionModeEmpty")}</p>
          </div>
        </div>
      );
    }

    if (searchResult.length > 0) {
      return searchResult.map((item, index) => (
        <SearchResultRow
          dragOverFavoriteIndex={dragOverFavoriteIndex}
          draggedFavoriteIndex={draggedFavoriteIndex}
          favoriteReorderEnabled={favoriteReorderEnabled}
          handlePointerSelection={handlePointerSelection}
          index={index}
          item={item}
          key={`${item.url}-${item.title}-${index}`}
          onDragStateChange={handleFavoriteDragStateChange}
          onOpen={openSearchResultItem}
          onReorder={reorderFavoriteItem}
          onToggleFavorite={toggleFavoriteItem}
          rowRef={(element) => {
            resultRefs.current[index] = element;
          }}
          selected={index === selectedNumber}
        />
      ));
    }

    if (extractedSearchWord && !loadingCollections) {
      const browserSearchSelected = selectedNumber === 0;

      return (
        <button
          aria-selected={browserSearchSelected}
          className={cn(
            "grid w-full grid-cols-[18px_minmax(0,1fr)_auto_auto] items-center gap-2.5 rounded-[14px] px-3 py-2 text-left",
            browserSearchSelected
              ? "bg-primary/10 shadow-[inset_0_0_0_1px_rgba(90,145,255,0.2)] dark:bg-primary/12"
              : "bg-transparent hover:bg-white/78 dark:hover:bg-card/40",
          )}
          data-cy="browser-search-btn"
          type="button"
          onClick={() => {
            browserSearch(extractedSearchWord).catch(reportError);
          }}
        >
          <img
            alt=""
            className="size-[18px] rounded-sm"
            height="18"
            src={searchEngine.favIconUrl}
            width="18"
          />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium leading-[1.25] text-foreground">
              {t("browserSearch", extractedSearchWord)}
            </div>
            <div className="truncate text-[11px] leading-[1.25] text-foreground/56 dark:text-muted-foreground">
              {searchEngine.name || t("browserSearchEngine")}
            </div>
          </div>
          <Badge variant="secondary">{t("browserSearchEngine")}</Badge>
          <div className="inline-flex size-7 items-center justify-center rounded-lg border border-transparent bg-slate-100/88 text-foreground/52 dark:bg-background/52 dark:text-muted-foreground">
            <ExternalLink className="size-3.5" />
          </div>
        </button>
      );
    }

    return (
      <div
        className="flex min-h-[180px] items-center justify-center rounded-[16px] border border-dashed border-border/10 bg-background/16 px-5 text-center"
        data-cy="search-result-empty"
      >
        <div className="space-y-2">
          <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Search className="size-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">{t("searchEmptyTitle")}</h2>
            <p className="text-[13px] text-foreground/56 dark:text-muted-foreground">
              {t("searchEmptyBody")}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="h-full overflow-hidden" data-cy="page-search">
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
        <div className="flex h-12 shrink-0 items-center gap-3 rounded-[16px] border border-border/42 bg-white/78 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-border/12 dark:bg-background/68 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <Search className="size-5 shrink-0 text-primary" />
          <Input
            autoComplete="off"
            className="h-full border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0"
            data-cy="search-input"
            placeholder={actionMode ? t("actionModePlaceholder") : t("placeholderSearch")}
            ref={inputRef}
            type="search"
            value={searchWord}
            onChange={(event) => {
              setSearchWord(event.target.value);
            }}
            onKeyDown={(event) => {
              onKeyDown(event).catch(reportError);
            }}
          />
        </div>
        <div
          className="relative h-[367px] shrink-0 overflow-y-auto overflow-x-hidden rounded-[18px] border border-border/24 bg-slate-100/72 p-1.5 dark:border-border/14 dark:bg-card/12"
          data-cy="search-result-wrapper"
          ref={resultsWrapperRef}
        >
          <div className="space-y-1.5 pb-1">{renderResults()}</div>
        </div>
        <div className="flex h-10 shrink-0 items-center gap-2 px-0 pb-0 text-[11px] text-foreground/56 dark:text-muted-foreground">
          <Kbd>↑ ↓</Kbd>
          <span>{t("footerSelect")}</span>
          <Kbd>↵</Kbd>
          <span>{t("footerOpen")}</span>
          <Kbd>⌘ K</Kbd>
          <span>{t("footerFocusSearch")}</span>
          <Kbd>esc</Kbd>
          <span>{t("footerClose")}</span>
          <div className="ml-auto flex min-w-0 justify-end">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 ease-out",
                badgeText
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-1 opacity-0",
              )}
              data-cy="action-feedback"
            >
              <Check className="size-3.5" />
              <span>{badgeText}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
