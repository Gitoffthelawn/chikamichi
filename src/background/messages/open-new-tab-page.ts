import type { PlasmoMessaging } from "@plasmohq/messaging";
import browser from "webextension-polyfill";

const handler: PlasmoMessaging.MessageHandler = async (req) => {
  const url = req.body?.url;

  if (typeof url !== "string") {
    return;
  }

  await browser.tabs.create({ url });
};

export default handler;
