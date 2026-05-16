import type { PlasmoMessaging } from "@plasmohq/messaging";
import browser from "webextension-polyfill";

const handler: PlasmoMessaging.MessageHandler = async (req) => {
  const tabId = req.body?.tabId;

  if (typeof tabId !== "number") {
    return;
  }

  const tab = await browser.tabs.get(tabId);
  await browser.tabs.update(tabId, { active: true });
  await browser.windows.update(tab.windowId!, { focused: true });
};

export default handler;
