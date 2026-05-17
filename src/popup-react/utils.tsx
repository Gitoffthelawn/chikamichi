import { type ReactNode } from "react";
import { Info, Search, Settings } from "lucide-react";
import { PAGES, THEME } from "~/constants";
import { t } from "~/i18n";
import type { SearchCollections } from "~/popup-react/types";

export const EMPTY_COLLECTIONS: SearchCollections = {
  bookmarks: [],
  histories: [],
  tabs: [],
};

export function reportError(error: unknown) {
  window.dispatchEvent(
    new CustomEvent("chikamichi:error", {
      detail: String(error),
    }),
  );
}

export function getResultKey(item: Pick<SearchResult, "title" | "url" | "type">) {
  return `${item.type}:${item.title}:${item.url}`;
}

export function getResolvedTheme(theme: ValueOf<typeof THEME>) {
  if (theme === THEME.AUTO) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? THEME.DARK : THEME.LIGHT;
  }

  return theme;
}

export function highlightText(text: string, matchedWord: RegExp | string): ReactNode {
  if (typeof matchedWord === "string" || text.length === 0) {
    return text;
  }

  const flags = matchedWord.flags.includes("g") ? matchedWord.flags : `${matchedWord.flags}g`;
  const matcher = new RegExp(matchedWord.source, flags);
  const matches = Array.from(text.matchAll(matcher));

  if (matches.length === 0) {
    return text;
  }

  const fragments: ReactNode[] = [];
  let currentIndex = 0;

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const value = match[0] ?? "";
    const end = start + value.length;

    if (start > currentIndex) {
      fragments.push(text.slice(currentIndex, start));
    }

    fragments.push(
      <mark
        className="bg-transparent font-semibold text-primary [text-decoration:none]"
        key={`${value}-${index}-${start}`}
      >
        {value}
      </mark>,
    );

    currentIndex = end;
  });

  if (currentIndex < text.length) {
    fragments.push(text.slice(currentIndex));
  }

  return fragments;
}

export function getPageMeta(page: ValueOf<typeof PAGES>) {
  switch (page) {
    case PAGES.INFO:
      return { icon: Info, label: t("pageInfoTitle"), summary: t("pageInfoSummary") };
    case PAGES.SETTING:
      return { icon: Settings, label: t("pageSettingsTitle"), summary: t("pageSettingsSummary") };
    default:
      return { icon: Search, label: t("pageSearchTitle"), summary: t("pageSearchSummary") };
  }
}

export function getThemeLabel(theme: ValueOf<typeof THEME>) {
  if (theme === THEME.AUTO) {
    return t("themeAuto");
  }

  if (theme === THEME.LIGHT) {
    return t("themeLight");
  }

  return t("themeDark");
}
