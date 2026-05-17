import { LANGUAGE } from "~/constants";
import enMessages from "../_locales/en/messages.json";
import jaMessages from "../_locales/ja/messages.json";

const FALLBACK_MESSAGES = {
  actionCopyMarkdownLink: "Copy Markdown Link",
  actionCopyTitle: "Copy Title",
  actionCopyUrl: "Copy URL",
  actionDescriptionCopyMarkdownLink: "Copy the current page as a Markdown link.",
  actionDescriptionCopyTitle: "Copy the current page title.",
  actionDescriptionCopyUrl: "Copy the current page URL.",
  actionDescriptionDuplicateTab: "Open a duplicate of the current tab.",
  actionDescriptionMuteTab: "Mute audio for the current tab.",
  actionDescriptionPinCurrentPage: "Pin the current page to Chikamichi.",
  actionDescriptionPinTab: "Pin the current tab.",
  actionDescriptionScreenshotFullPage: "Save a full-page screenshot to Downloads.",
  actionDescriptionScreenshotFullPageClipboard: "Copy a full-page screenshot to the clipboard.",
  actionDescriptionScreenshotVisibleArea: "Save the visible area to Downloads.",
  actionDescriptionScreenshotVisibleAreaClipboard: "Copy the visible area to the clipboard.",
  actionDescriptionUnmuteTab: "Unmute audio for the current tab.",
  actionDescriptionUnpinCurrentPage: "Remove the current page from Chikamichi pinned items.",
  actionDescriptionUnpinTab: "Unpin the current tab.",
  actionDuplicateTab: "Duplicate Tab",
  actionModeEmpty: "No actions found.",
  actionModeLabel: "Actions",
  actionModePlaceholder: "Type an action for this page...",
  actionModeShortcutBody:
    "Type `>` to run commands like copy title, markdown link, mute, pin, and screenshots.",
  actionModeShortcutTitle: "Action mode",
  actionModeTitle: "Current page actions",
  actionMuteTab: "Mute Tab",
  actionPinCurrentPage: "Pin Current Page",
  actionPinTab: "Pin Tab",
  actionScreenshotFullPage: "Capture Full Page",
  actionScreenshotFullPageClipboard: "Copy Full Page to Clipboard",
  actionScreenshotVisibleArea: "Capture Visible Area",
  actionScreenshotVisibleAreaClipboard: "Copy Visible Area to Clipboard",
  actionUnmuteTab: "Unmute Tab",
  actionUnpinCurrentPage: "Unpin Current Page",
  actionUnpinTab: "Unpin Tab",
  actionsSectionDescription: "Operate on the selected result without leaving the keyboard.",
  actionsSectionTitle: "Actions",
  altOpen: "Alternative open",
  badgeAddFavorite: "Pinned",
  badgeClosedTab: "Closed tab",
  badgeCopied: "Copied to clipboard",
  badgeCopiedMarkdown: "Copied Markdown link",
  badgeCopiedTitle: "Copied title",
  badgeDeletedHistory: "Deleted history",
  badgeMutedTab: "Muted tab",
  badgePinnedTab: "Pinned tab",
  badgeRemoveFavorite: "Unpinned",
  badgeRemovedBookmark: "Removed bookmark",
  badgeSavedScreenshot: "Saved screenshot",
  badgeUnmutedTab: "Unmuted tab",
  badgeUnpinnedTab: "Unpinned tab",
  browserSearch: 'Search "$1"',
  browserSearchEngine: "Browser",
  buttonOpenIssue: "Open Issue",
  favoriteDragHandle: "Drag to reorder pinned item",
  feedbackBody: "Bug reports and improvements can be sent to GitHub issues.",
  feedbackDescription: "You can collect usability problems and improvement ideas into an issue.",
  feedbackTitle: "Feedback",
  footerClose: "Close",
  footerOpen: "Open",
  footerOpenCurrentTab: "Current tab",
  footerOpenNewTab: "New tab",
  footerSelect: "Move",
  generalSectionTitle: "General",
  infoDescription: "Command-style reference for search, navigation, and actions.",
  infoTitle: "Help",
  labelActionMode: "Action mode",
  labelAlternativeOpen: "Ctrl+Enter: $1",
  labelCurrentTab: "open in current tab",
  labelDeleteBookmark: "bookmark: remove bookmark",
  labelDeleteHistory: "history: delete history",
  labelDeleteSelected: "Delete selected",
  labelDeleteTab: "tab: close tab",
  labelMoveSelection: "Move selection",
  labelNewTab: "open in new tab",
  labelOpenPopup: "Open popup",
  labelOpenSelected: "Open selected",
  labelPinSelected: "Pin selected",
  labelSearchTargets: "Search targets",
  labelUtilities: "Utilities",
  languageAuto: "auto",
  languageDescription: "Choose the popup display language.",
  languageEnglish: "English",
  languageJapanese: "Japanese",
  languageTitle: "Display Language",
  manifestDescription:
    "Command palette for the browser. Enables fuzzy search for histories, tabs and bookmarks.",
  manifestName: "Chikamichi - Quickly find a page -",
  navigationSectionDescription: "Move through results and choose how to open them.",
  navigationSectionTitle: "Navigation",
  openLinkActionDescription: "Switch how Enter and Ctrl+Enter open links.",
  openLinkActionTitle: "Open Link Action",
  openLinkCurrentTab: "Open link in current tab",
  openLinkNewTab: "Open link in new tab",
  openingPage: "Opening...",
  pageInfoSummary: "Command reference",
  pageInfoTitle: "Help",
  pageSearchSummary: "Find and act",
  pageSearchTitle: "Search",
  pageSettingsSummary: "Behavior",
  pageSettingsTitle: "Settings",
  panelLabelCandidates: "Results",
  panelLabelRecentSearches: "Recent",
  placeholderSearch: "Search for...",
  prefixBookmark: "/b : search bookmarks",
  prefixDescription: "Choose the default target when typing starts.",
  prefixHistory: "/h : search history",
  prefixNone: "none",
  prefixTab: "/t : search tabs",
  prefixTitle: "Default Search Prefix",
  quickReferenceTitle: "Quick Reference",
  searchEmptyBody: "Bookmarks, histories, and tabs will appear here.",
  searchEmptyTitle: "Start Searching",
  searchSectionDescription: "Narrow results by source, or switch into current page actions.",
  searchSectionTitle: "Search",
  searchTargetBookmarks: "/b Bookmarks",
  searchTargetHistory: "/h History",
  searchTargetTabs: "/t Tabs",
  settingDescription: "Adjust startup target, theme, and open behavior.",
  settingTitle: "Settings",
  shortcutCopyUrl: "Copy URL",
  shortcutOpenPopup: "`Alt+K`",
  shortcutOpenSelected: "Open in the configured target",
  shortcutPinSelected: "Pin or unpin in Chikamichi",
  shortcutUtilities: "`Ctrl+F` pin, `Ctrl+C` copy URL, `Ctrl+D` delete or close",
  shortcutsMoveSelection: "Arrow keys or `Ctrl+N` / `Ctrl+P`",
  themeAuto: "auto",
  themeDark: "dark",
  themeDescription: "Choose the popup color mode.",
  themeLight: "light",
  themeTitle: "Theme",
} as const;

export type MessageKey = keyof typeof FALLBACK_MESSAGES;

type LocaleMessages = Record<string, { message?: string }>;

const LOCALE_MESSAGES: Record<typeof LANGUAGE.EN | typeof LANGUAGE.JA, LocaleMessages> = {
  [LANGUAGE.EN]: enMessages,
  [LANGUAGE.JA]: jaMessages,
};

let currentLanguage: ValueOf<typeof LANGUAGE> = LANGUAGE.AUTO;

export function setLanguage(language: ValueOf<typeof LANGUAGE>) {
  currentLanguage = language;
}

function applySubstitutions(message: string, substitutions?: string | string[]) {
  if (substitutions === undefined) {
    return message;
  }

  const values = Array.isArray(substitutions) ? substitutions : [substitutions];

  return values.reduce((result, value, index) => result.replace(`$${index + 1}`, value), message);
}

export const t = (key: MessageKey, substitutions?: string | string[]) => {
  if (currentLanguage !== LANGUAGE.AUTO) {
    const localeMessage = LOCALE_MESSAGES[currentLanguage]?.[key]?.message;

    if (localeMessage) {
      return applySubstitutions(localeMessage, substitutions);
    }
  }

  const message = chrome.i18n?.getMessage(key, substitutions as string | string[] | undefined);

  if (message) {
    return message;
  }

  const fallback = FALLBACK_MESSAGES[key];

  return applySubstitutions(fallback, substitutions);
};
