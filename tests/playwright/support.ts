import type { Page } from "@playwright/test";
import type { Bookmarks, History, Tabs } from "webextension-polyfill";

type MockCallKey =
  | "chromeSearchQuery"
  | "close"
  | "copy"
  | "copyImage"
  | "downloadsDownload"
  | "runtimeSendMessage"
  | "scriptingExecuteScript"
  | "tabsCaptureVisibleTab"
  | "tabsDuplicate"
  | "tabsReload"
  | "tabsRemove"
  | "tabsUpdate";

export async function setupExtensionEnvironment(
  page: Page,
  {
    bookmarks,
    histories,
    tabs,
  }: {
    bookmarks: Bookmarks.BookmarkTreeNode[];
    histories: History.HistoryItem[];
    tabs: Partial<Tabs.Tab>[];
  },
) {
  await page.addInitScript(
    ({ bookmarks: initialBookmarks, histories: initialHistories, tabs: initialTabs }) => {
      const storageState = {};
      const storageListeners = [];
      const faviconUrl = (url) => {
        const hostname = new URL(url).hostname.replace(/^www\./u, "");
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
      };
      const generateSearchTerm = (...args) => args.filter((arg) => arg).join(" ");
      const mockCalls = {
        chromeSearchQuery: [],
        close: [],
        copy: [],
        copyImage: [],
        downloadsDownload: [],
        runtimeSendMessage: [],
        scriptingExecuteScript: [],
        tabsCaptureVisibleTab: [],
        tabsDuplicate: [],
        tabsReload: [],
        tabsRemove: [],
        tabsUpdate: [],
      };

      const emitStorageChanged = (changes, areaName) => {
        storageListeners.forEach((listener) => {
          listener(changes, areaName);
        });
      };

      const bookmarkItems = [];
      const collectBookmarkItems = (nodes, folderNames = []) => {
        nodes.forEach((node) => {
          if (node.type !== "bookmark" && node.children) {
            const folderName = node.parentId === "0" ? "" : node.title;
            collectBookmarkItems(node.children, [...folderNames, folderName]);
            return;
          }

          if (!node.url) {
            return;
          }

          const folderName =
            node.parentId === "1" ? "" : folderNames.filter((name) => name).join("/");
          bookmarkItems.push({
            faviconUrl: faviconUrl(node.url),
            folderName,
            searchTerm: generateSearchTerm(node.title, node.url, folderName),
            title: node.title || node.url,
            type: "bookmark",
            url: node.url,
          });
        });
      };

      collectBookmarkItems(initialBookmarks);

      window["__chikamichiMockSearchItems"] = {
        bookmarks: bookmarkItems,
        histories: initialHistories.map((history) => ({
          faviconUrl: faviconUrl(history.url),
          folderName: "",
          lastVisitTime: history.lastVisitTime,
          searchTerm: generateSearchTerm(history.title, history.url),
          title: history.title,
          type: "history",
          url: history.url,
        })),
        tabs: initialTabs.map((tab) => ({
          faviconUrl: faviconUrl(tab.url),
          folderName: "",
          lastVisitTime: tab.lastAccessed,
          searchTerm: generateSearchTerm(tab.title, tab.url),
          tabId: tab.id,
          title: tab.title,
          type: "tab",
          url: tab.url,
        })),
      };

      window["__chikamichiMockCalls"] = mockCalls;
      window["chikamichiMockActiveTab"] = initialTabs[0] ?? null;

      const runtime = {
        getManifest: () => ({
          action: {
            default_popup: "popup.html",
          },
        }),
        getURL: () => "popup.html",
        id: "12345",
        onMessage: {
          addListener: () => undefined,
        },
        sendMessage: (...args) => {
          mockCalls.runtimeSendMessage.push(args);
          return Promise.resolve(undefined);
        },
      };

      const captureDataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==";

      const chromeApi = {
        bookmarks: {
          getTree: (callback) => {
            callback(bookmarks);
          },
        },
        downloads: {
          download: (options, callback) => {
            mockCalls.downloadsDownload.push([options]);
            callback?.();
          },
        },
        history: {
          search: (_queryInfo, callback) => {
            callback(initialHistories);
          },
        },
        runtime,
        scripting: {
          executeScript: ({ args, func }) => {
            mockCalls.scriptingExecuteScript.push([{ args }]);
            return Promise.resolve([{ result: func(...(args ?? [])) }]);
          },
        },
        search: {
          Disposition: {
            CURRENT_TAB: 1,
            NEW_TAB: 2,
          },
          query: (query) => {
            mockCalls.chromeSearchQuery.push([query]);
          },
        },
        storage: {
          local: {
            get: (keys, callback) => {
              let keyList: string[] = [];
              if (Array.isArray(keys)) {
                keyList = keys;
              } else if (typeof keys === "string") {
                keyList = [keys];
              } else {
                keyList = Object.keys(keys);
              }
              const result = Object.fromEntries(
                keyList.map((key) => [
                  key,
                  storageState[key] ??
                    (typeof keys === "object" && !Array.isArray(keys) ? keys[key] : undefined),
                ]),
              );

              if (callback) {
                callback(result);
                return;
              }

              return Promise.resolve(result);
            },
            remove: (keys, callback) => {
              const keyList = Array.isArray(keys) ? keys : [keys];
              const changes = Object.fromEntries(
                keyList.map((key) => [
                  key,
                  {
                    newValue: undefined,
                    oldValue: storageState[key],
                  },
                ]),
              );
              keyList.forEach((key) => {
                delete storageState[key];
              });
              emitStorageChanged(changes, "local");
              callback?.();
              return Promise.resolve();
            },
            set: (items, callback) => {
              const changes = Object.fromEntries(
                Object.entries(items).map(([key, value]) => [
                  key,
                  {
                    newValue: value,
                    oldValue: storageState[key],
                  },
                ]),
              );
              Object.assign(storageState, items);
              emitStorageChanged(changes, "local");
              callback?.();
              return Promise.resolve();
            },
          },
          onChanged: {
            addListener: (listener) => {
              storageListeners.push(listener);
            },
            removeListener: (listener) => {
              const index = storageListeners.indexOf(listener);
              if (index >= 0) {
                storageListeners.splice(index, 1);
              }
            },
          },
        },
        tabs: {
          captureVisibleTab: (_windowId, _options, callback) => {
            mockCalls.tabsCaptureVisibleTab.push([]);
            callback(captureDataUrl);
          },
          duplicate: (tabId, callback) => {
            mockCalls.tabsDuplicate.push([tabId]);
            callback?.();
          },
          query: (queryInfo, callback) => {
            window.setTimeout(() => {
              if (queryInfo?.active) {
                callback(initialTabs.slice(0, 1));
                return;
              }

              callback(initialTabs);
            }, 0);
          },
          reload: (tabId, reloadProperties, callback) => {
            mockCalls.tabsReload.push([tabId, reloadProperties]);
            callback?.();
          },
          remove: (tabIds, callback) => {
            mockCalls.tabsRemove.push([tabIds]);
            callback?.();
          },
          update: (tabId, updateProperties, callback) => {
            mockCalls.tabsUpdate.push([tabId, updateProperties]);
            callback?.();
          },
        },
      };

      Object.defineProperty(window, "chrome", {
        configurable: true,
        value: chromeApi,
        writable: true,
      });

      Object.defineProperty(window, "browser", {
        configurable: true,
        value: {
          bookmarks: {
            getTree: () => Promise.resolve(initialBookmarks),
          },
          history: {
            search: () => Promise.resolve(initialHistories),
          },
          search: {
            Disposition: chromeApi.search.Disposition,
            get: () => Promise.resolve([]),
            query: (query) => {
              mockCalls.chromeSearchQuery.push([query]);
              return Promise.resolve(undefined);
            },
            search: ({ query, tabId }) => {
              mockCalls.chromeSearchQuery.push([
                {
                  query,
                  tabId,
                },
              ]);
              return Promise.resolve(undefined);
            },
          },
          storage: {
            local: chromeApi.storage.local,
            onChanged: chromeApi.storage.onChanged,
          },
          tabs: {
            query: (queryInfo) =>
              Promise.resolve(queryInfo?.active ? initialTabs.slice(0, 1) : initialTabs),
          },
        },
        writable: true,
      });

      class MockClipboardItem {
        items: Record<string, Blob>;

        constructor(items: Record<string, Blob>) {
          this.items = items;
        }
      }

      Object.defineProperty(window, "ClipboardItem", {
        configurable: true,
        value: MockClipboardItem,
        writable: true,
      });

      Object.defineProperty(window.navigator, "clipboard", {
        configurable: true,
        value: {
          write: (items) => {
            mockCalls.copyImage.push([items]);
            return Promise.resolve(undefined);
          },
          writeText: (text) => {
            mockCalls.copy.push([text]);
            return Promise.resolve(undefined);
          },
        },
      });

      window.close = () => {
        mockCalls.close.push([]);
      };
    },
    { bookmarks, histories, tabs },
  );
}

export function getMockCalls<T = unknown>(page: Page, key: MockCallKey): Promise<T[]> {
  return page.evaluate((callKey) => (window as any)["__chikamichiMockCalls"][callKey], key);
}

export async function getLastMockCall<T = unknown>(
  page: Page,
  key: MockCallKey,
): Promise<T | undefined> {
  const calls = await getMockCalls<T[]>(page, key);
  return calls.at(-1);
}

export async function getLastRuntimeMessage(page: Page): Promise<unknown> {
  const lastCall = await getLastMockCall<any[]>(page, "runtimeSendMessage");
  return lastCall?.[1];
}
