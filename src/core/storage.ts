import { Storage } from "@plasmohq/storage";
import { THEME } from "~/constants";

export interface FavoriteItemRecord {
  faviconUrl: string;
  folderName?: string;
  title: string;
  type: SearchItem["type"];
  url: string;
}

export interface AppSettings {
  defaultSearchPrefix: string;
  favoriteItems: FavoriteItemRecord[];
  openLinkInCurrentTab: boolean;
  theme: ValueOf<typeof THEME>;
}

const STORAGE_KEYS = {
  defaultSearchPrefix: "chikamichi-default-search-prefix",
  favoriteItems: "chikamichi-favorite-items",
  openLinkInCurrentTab: "chikamichi-open-link-in-current-tab",
  theme: "chikamichi-theme",
} as const;

const storage = new Storage({
  area: "local",
});

export const DEFAULT_SETTINGS: AppSettings = {
  defaultSearchPrefix: "",
  favoriteItems: [],
  openLinkInCurrentTab: true,
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

export async function getSettings(): Promise<AppSettings> {
  const [defaultSearchPrefix, favoriteItems, openLinkInCurrentTab, theme] = await Promise.all([
    storage.get<string>(STORAGE_KEYS.defaultSearchPrefix),
    storage.get<FavoriteItemRecord[] | string>(STORAGE_KEYS.favoriteItems),
    storage.get<boolean>(STORAGE_KEYS.openLinkInCurrentTab),
    storage.get<ValueOf<typeof THEME>>(STORAGE_KEYS.theme),
  ]);

  return {
    defaultSearchPrefix:
      typeof defaultSearchPrefix === "string"
        ? defaultSearchPrefix
        : DEFAULT_SETTINGS.defaultSearchPrefix,
    favoriteItems: parseFavoriteItems(favoriteItems),
    openLinkInCurrentTab:
      typeof openLinkInCurrentTab === "boolean"
        ? openLinkInCurrentTab
        : DEFAULT_SETTINGS.openLinkInCurrentTab,
    theme: theme === THEME.DARK || theme === THEME.LIGHT ? theme : DEFAULT_SETTINGS.theme,
  };
}

export async function updateSettings(partial: Partial<AppSettings>) {
  const tasks: Array<Promise<void>> = [];

  if (partial.defaultSearchPrefix !== undefined) {
    tasks.push(storage.set(STORAGE_KEYS.defaultSearchPrefix, partial.defaultSearchPrefix));
  }
  if (partial.favoriteItems !== undefined) {
    tasks.push(storage.set(STORAGE_KEYS.favoriteItems, partial.favoriteItems));
  }
  if (partial.openLinkInCurrentTab !== undefined) {
    tasks.push(storage.set(STORAGE_KEYS.openLinkInCurrentTab, partial.openLinkInCurrentTab));
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
