import type { PlasmoMessaging } from "@plasmohq/messaging";
import browser from "webextension-polyfill";

const handler: PlasmoMessaging.MessageHandler = async (req) => {
  const url = req.body?.url;

  if (typeof url !== "string") {
    return;
  }

  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (tab?.id !== undefined) {
    await browser.tabs.update(tab.id, { url });
  }
};

export default handler;
