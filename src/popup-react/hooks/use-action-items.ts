import {
  Camera,
  CameraIcon,
  Copy,
  Link2,
  Pin,
  PinOff,
  SquareStack,
  Type,
  Volume2,
  VolumeOff,
} from "lucide-react";
import { useMemo } from "react";
import browser from "webextension-polyfill";
import { t } from "~/i18n";
import type { ActionItem } from "~/popup-react/types";

type RankedActionItem = ActionItem & { priority: number };

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
  if (tab.windowId === undefined) {
    throw new Error("Tab window id is required");
  }

  const { windowId } = tab;

  return new Promise<string>((resolve) => {
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
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

  const tabId = tab.id;

  const metrics = await executeScript(tabId, () => ({
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

  await executeScript(tabId, () => {
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
      tabId,
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
    tabId,
    (nextScrollX?: number, nextScrollY?: number) => {
      window.scrollTo(nextScrollX ?? 0, nextScrollY ?? 0);
    },
    metrics.scrollX,
    metrics.scrollY,
  );

  if (stitchedCanvas === null) {
    return null;
  }

  return (stitchedCanvas as HTMLCanvasElement).toDataURL("image/png");
}

type UseActionItemsParams = {
  activeTab: browser.Tabs.Tab | null;
  refreshActiveTab: () => Promise<browser.Tabs.Tab | null>;
  showBadge: (text: string, duration?: number) => Promise<void>;
};

export function useActionItems({
  activeTab,
  refreshActiveTab,
  showBadge,
}: UseActionItemsParams): ActionItem[] {
  return useMemo<ActionItem[]>(() => {
    if (!activeTab) {
      return [];
    }

    const currentTab = activeTab;
    const currentUrl = currentTab.url ?? "";
    const currentTitle = currentTab.title ?? currentUrl;
    const screenshotBaseName = sanitizeFilename(currentTitle || "page");

    const rankedItems: RankedActionItem[] = [
      {
        description: t("actionDescriptionCopyMarkdownLink"),
        icon: Copy,
        id: "copy-markdown-link",
        keywords: "copy markdown link md",
        priority: 10,
        run: async () => {
          await navigator.clipboard.writeText(`[${currentTitle}](${currentUrl})`);
          await showBadge(t("badgeCopiedMarkdown"));
        },
        title: t("actionCopyMarkdownLink"),
      },
      {
        description: t("actionDescriptionCopyUrl"),
        icon: Link2,
        id: "copy-url",
        keywords: "copy url link address",
        priority: 20,
        run: async () => {
          await navigator.clipboard.writeText(currentUrl);
          await showBadge(t("badgeCopied"));
        },
        title: t("actionCopyUrl"),
      },
      {
        description: t("actionDescriptionCopyTitle"),
        icon: Type,
        id: "copy-title",
        keywords: "copy title text name",
        priority: 30,
        run: async () => {
          await navigator.clipboard.writeText(currentTitle);
          await showBadge(t("badgeCopiedTitle"));
        },
        title: t("actionCopyTitle"),
      },
      {
        description: currentTab.mutedInfo?.muted
          ? t("actionDescriptionUnmuteTab")
          : t("actionDescriptionMuteTab"),
        icon: currentTab.mutedInfo?.muted ? Volume2 : VolumeOff,
        id: currentTab.mutedInfo?.muted ? "unmute-tab" : "mute-tab",
        keywords: "audio mute unmute sound volume",
        priority: 40,
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
        priority: 50,
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
        priority: 60,
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
        description: t("actionDescriptionScreenshotVisibleArea"),
        icon: Camera,
        id: "screenshot-visible-area",
        keywords: "screenshot capture visible area image png",
        priority: 70,
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
        priority: 80,
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
        priority: 90,
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
        priority: 100,
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

    return rankedItems
      .sort((left, right) => left.priority - right.priority)
      .map(({ priority: _priority, ...item }) => item);
  }, [activeTab, refreshActiveTab, showBadge]);
}
