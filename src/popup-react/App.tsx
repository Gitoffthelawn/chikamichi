import { sendToBackground } from "@plasmohq/messaging";
import { useEffect, useState } from "react";
import { PAGES, THEME } from "~/constants";
import {
  type AppSettings,
  DEFAULT_SETTINGS,
  getSettings,
  subscribeSettings,
  updateSettings,
} from "~/core/storage";
import logoLightUrl from "~/images/logo.svg";
import { PageMenuButton } from "~/popup-react/components/common";
import { InfoPage } from "~/popup-react/pages/InfoPage";
import { SearchPage } from "~/popup-react/pages/SearchPage";
import { SettingPage } from "~/popup-react/pages/SettingPage";
import { getResolvedTheme, reportError } from "~/popup-react/utils";

function App() {
  const [currentPage, setCurrentPage] = useState<ValueOf<typeof PAGES>>(
    PAGES.SEARCH,
  );
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const saveSettings = async (partial: Partial<AppSettings>) => {
    setSettings((current) => ({
      ...current,
      ...partial,
    }));
    await updateSettings(partial);
  };

  useEffect(() => {
    getSettings().then(setSettings).catch(reportError);
    return subscribeSettings(setSettings);
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      document.body.classList.toggle(
        "dark",
        getResolvedTheme(settings.theme) === THEME.DARK,
      );
    };

    applyTheme();

    if (settings.theme !== THEME.AUTO) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", applyTheme);

    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }, [settings.theme]);

  return (
    <main className="h-[500px] w-[760px] overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(86,126,255,0.14),transparent_40%),linear-gradient(180deg,rgba(252,253,255,0.98),rgba(239,244,251,0.98))] p-1 shadow-[0_24px_60px_rgba(85,102,140,0.18)] dark:bg-[radial-gradient(circle_at_top,rgba(74,138,255,0.14),transparent_38%),linear-gradient(180deg,rgba(17,24,39,0.96),rgba(16,23,38,0.98))] dark:shadow-[0_24px_80px_rgba(3,8,20,0.52)]">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_62px] gap-0">
        <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] bg-white/58 p-3.5 dark:bg-background/10">
          {currentPage === PAGES.SEARCH ? (
            <SearchPage onUpdateSettings={saveSettings} settings={settings} />
          ) : null}
          {currentPage === PAGES.INFO ? (
            <InfoPage
              onOpenIssue={() => {
                sendToBackground({
                  body: {
                    url: "https://github.com/kawamataryo/chikamichi/issues/new",
                  },
                  name: "open-new-tab-page",
                }).catch(reportError);
              }}
              openLinkInCurrentTab={settings.openLinkInCurrentTab}
            />
          ) : null}
          {currentPage === PAGES.SETTING ? (
            <SettingPage onUpdateSettings={saveSettings} settings={settings} />
          ) : null}
        </div>
        <aside className="flex h-full min-h-0 flex-col items-center bg-white/48 p-2.5 dark:bg-background/10">
          <nav aria-label="Navigation" className="space-y-2.5">
            <PageMenuButton
              currentPage={currentPage}
              page={PAGES.SEARCH}
              setCurrentPage={setCurrentPage}
            />
            <PageMenuButton
              currentPage={currentPage}
              page={PAGES.SETTING}
              setCurrentPage={setCurrentPage}
            />
            <PageMenuButton
              currentPage={currentPage}
              page={PAGES.INFO}
              setCurrentPage={setCurrentPage}
            />
          </nav>
          <div className="mt-auto flex w-full justify-center pt-3">
            <img alt="Chikamichi" className="size-8" src={logoLightUrl} />
          </div>
        </aside>
      </div>
    </main>
  );
}

export default App;
