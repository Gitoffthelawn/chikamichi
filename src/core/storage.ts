import { Storage } from "@plasmohq/storage";
import { LANGUAGE, OPEN_STATS_CONFIG, POPUP_HEIGHT, POPUP_WIDTH, THEME } from "~/constants";

export interface FavoriteItemRecord {
  faviconUrl: string;
  folderName?: string;
  title: string;
  type: SearchItem["type"];
  url: string;
}

export interface AppSettings {
  defaultSearchPrefix: string;
  favoriteActionIds: string[];
  favoriteItems: FavoriteItemRecord[];
  favoriteOrder: string[];
  language: ValueOf<typeof LANGUAGE>;
  openLinkInCurrentTab: boolean;
  popupHeight: ValueOf<typeof POPUP_HEIGHT>;
  popupWidth: ValueOf<typeof POPUP_WIDTH>;
  theme: ValueOf<typeof THEME>;
}

export interface OpenStatsRecord {
  lastOpenedAt: number;
  openCount: number;
  url: string;
}

const STORAGE_KEYS = {
  defaultSearchPrefix: "chikamichi-default-search-prefix",
  favoriteActionIds: "chikamichi-favorite-action-ids",
  favoriteItems: "chikamichi-favorite-items",
  favoriteOrder: "chikamichi-favorite-order",
  language: "chikamichi-language",
  openLinkInCurrentTab: "chikamichi-open-link-in-current-tab",
  popupHeight: "chikamichi-popup-height",
  popupWidth: "chikamichi-popup-width",
  theme: "chikamichi-theme",
} as const;

const storage = new Storage({
  area: "local",
});

export const DEFAULT_SETTINGS: AppSettings = {
  defaultSearchPrefix: "",
  favoriteActionIds: [],
  favoriteItems: [],
  favoriteOrder: [],
  language: LANGUAGE.AUTO,
  openLinkInCurrentTab: true,
  popupHeight: POPUP_HEIGHT.M,
  popupWidth: POPUP_WIDTH.M,
  theme: THEME.AUTO,
};

function parseFavoriteItems(value: unknown): FavoriteItemRecord[] {
  if (Array.isArray(value)) {
    return value as FavoriteItemRecord[];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as FavoriteItemRecord[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseFavoriteActionIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      return parseStringArray(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function parseOpenStats(value: unknown): OpenStatsRecord[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is OpenStatsRecord =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as OpenStatsRecord).url === "string" &&
        typeof (item as OpenStatsRecord).openCount === "number" &&
        typeof (item as OpenStatsRecord).lastOpenedAt === "number",
    );
  }
  if (typeof value === "string") {
    try {
      return parseOpenStats(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function parsePopupHeight(value: unknown): ValueOf<typeof POPUP_HEIGHT> {
  return typeof value === "string" &&
    Object.values(POPUP_HEIGHT).includes(value as ValueOf<typeof POPUP_HEIGHT>)
    ? (value as ValueOf<typeof POPUP_HEIGHT>)
    : DEFAULT_SETTINGS.popupHeight;
}

function parsePopupWidth(value: unknown): ValueOf<typeof POPUP_WIDTH> {
  return typeof value === "string" &&
    Object.values(POPUP_WIDTH).includes(value as ValueOf<typeof POPUP_WIDTH>)
    ? (value as ValueOf<typeof POPUP_WIDTH>)
    : DEFAULT_SETTINGS.popupWidth;
}

export async function getOpenStats(): Promise<OpenStatsRecord[]> {
  return parseOpenStats(
    await storage.get<OpenStatsRecord[] | string>(OPEN_STATS_CONFIG.storageKey),
  );
}

export async function recordOpenedUrl(url: string, now = Date.now()) {
  if (!url) {
    return;
  }

  const stats = await getOpenStats();
  const current = stats.find((item) => item.url === url);
  const nextStats = [
    {
      lastOpenedAt: now,
      openCount: (current?.openCount ?? 0) + 1,
      url,
    },
    ...stats.filter((item) => item.url !== url),
  ]
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, OPEN_STATS_CONFIG.limit);

  await storage.set(OPEN_STATS_CONFIG.storageKey, nextStats);
}

export async function getSettings(): Promise<AppSettings> {
  const [
    defaultSearchPrefix,
    favoriteActionIds,
    favoriteItems,
    favoriteOrder,
    language,
    openLinkInCurrentTab,
    popupHeight,
    popupWidth,
    theme,
  ] = await Promise.all([
    storage.get<string>(STORAGE_KEYS.defaultSearchPrefix),
    storage.get<string[] | string>(STORAGE_KEYS.favoriteActionIds),
    storage.get<FavoriteItemRecord[] | string>(STORAGE_KEYS.favoriteItems),
    storage.get<string[] | string>(STORAGE_KEYS.favoriteOrder),
    storage.get<ValueOf<typeof LANGUAGE>>(STORAGE_KEYS.language),
    storage.get<boolean>(STORAGE_KEYS.openLinkInCurrentTab),
    storage.get<ValueOf<typeof POPUP_HEIGHT>>(STORAGE_KEYS.popupHeight),
    storage.get<ValueOf<typeof POPUP_WIDTH>>(STORAGE_KEYS.popupWidth),
    storage.get<ValueOf<typeof THEME>>(STORAGE_KEYS.theme),
  ]);

  return {
    defaultSearchPrefix:
      typeof defaultSearchPrefix === "string"
        ? defaultSearchPrefix
        : DEFAULT_SETTINGS.defaultSearchPrefix,
    favoriteActionIds: parseFavoriteActionIds(favoriteActionIds),
    favoriteItems: parseFavoriteItems(favoriteItems),
    favoriteOrder: parseStringArray(favoriteOrder),
    language:
      language === LANGUAGE.EN || language === LANGUAGE.JA ? language : DEFAULT_SETTINGS.language,
    openLinkInCurrentTab:
      typeof openLinkInCurrentTab === "boolean"
        ? openLinkInCurrentTab
        : DEFAULT_SETTINGS.openLinkInCurrentTab,
    popupHeight: parsePopupHeight(popupHeight),
    popupWidth: parsePopupWidth(popupWidth),
    theme: theme === THEME.DARK || theme === THEME.LIGHT ? theme : DEFAULT_SETTINGS.theme,
  };
}

export async function updateSettings(partial: Partial<AppSettings>) {
  const tasks: Array<Promise<unknown>> = [];

  if (partial.defaultSearchPrefix !== undefined) {
    tasks.push(storage.set(STORAGE_KEYS.defaultSearchPrefix, partial.defaultSearchPrefix));
  }
  if (partial.favoriteActionIds !== undefined) {
    tasks.push(storage.set(STORAGE_KEYS.favoriteActionIds, partial.favoriteActionIds));
  }
  if (partial.favoriteItems !== undefined) {
    tasks.push(storage.set(STORAGE_KEYS.favoriteItems, partial.favoriteItems));
  }
  if (partial.favoriteOrder !== undefined) {
    tasks.push(storage.set(STORAGE_KEYS.favoriteOrder, partial.favoriteOrder));
  }
  if (partial.language !== undefined) {
    tasks.push(storage.set(STORAGE_KEYS.language, partial.language));
  }
  if (partial.openLinkInCurrentTab !== undefined) {
    tasks.push(storage.set(STORAGE_KEYS.openLinkInCurrentTab, partial.openLinkInCurrentTab));
  }
  if (partial.popupHeight !== undefined) {
    tasks.push(storage.set(STORAGE_KEYS.popupHeight, partial.popupHeight));
  }
  if (partial.popupWidth !== undefined) {
    tasks.push(storage.set(STORAGE_KEYS.popupWidth, partial.popupWidth));
  }
  if (partial.theme !== undefined) {
    tasks.push(storage.set(STORAGE_KEYS.theme, partial.theme));
  }

  await Promise.all(tasks);
}

export function subscribeSettings(onChange: (settings: AppSettings) => void) {
  const watchMap = Object.fromEntries(
    Object.values(STORAGE_KEYS).map((key) => [
      key,
      async () => {
        onChange(await getSettings());
      },
    ]),
  );

  storage.watch(watchMap);

  return () => {
    storage.unwatch(watchMap);
  };
}
