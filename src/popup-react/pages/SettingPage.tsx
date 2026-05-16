import { ChevronDown } from "lucide-react";
import { SEARCH_PREFIX, THEME } from "~/constants";
import type { AppSettings } from "~/core/storage";
import { t } from "~/i18n";
import { PageShell, SettingRow, SettingToggleButton } from "~/popup-react/components/common";
import { getResolvedTheme, getThemeLabel, reportError } from "~/popup-react/utils";

export function SettingPage({
  onUpdateSettings,
  settings,
}: {
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  settings: AppSettings;
}) {
  return (
    <PageShell
      dataCy="page-setting"
      description={t("settingDescription")}
      title={t("settingTitle")}
    >
      <div className="space-y-0 rounded-[16px] bg-card/[0.1]">
        <div className="px-0.5 py-0.5 text-[12px] font-medium tracking-wide text-muted-foreground">
          {t("generalSectionTitle")}
        </div>
        <div className="space-y-0 rounded-[16px] border border-border/[0.4] bg-white/[0.74] px-3.5 py-3 dark:border-border/[0.1] dark:bg-background/[0.1]">
          <SettingRow description={t("prefixDescription")} title={t("prefixTitle")}>
            <div className="relative">
              <select
                className="flex h-9 w-full appearance-none rounded-xl border border-border/[0.5] bg-white/[0.92] px-3 pr-10 text-[13px] text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring dark:border-border/[0.18] dark:bg-background/[0.8]"
                data-cy="select-prefix"
                style={{
                  colorScheme: getResolvedTheme(settings.theme) === THEME.DARK ? "dark" : "light",
                }}
                value={settings.defaultSearchPrefix}
                onChange={(event) => {
                  onUpdateSettings({
                    defaultSearchPrefix: event.target.value,
                  }).catch(reportError);
                }}
              >
                <option value="">{t("prefixNone")}</option>
                <option value={SEARCH_PREFIX.BOOKMARK}>{t("prefixBookmark")}</option>
                <option value={SEARCH_PREFIX.TAB}>{t("prefixTab")}</option>
                <option value={SEARCH_PREFIX.HISTORY}>{t("prefixHistory")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </SettingRow>
          <SettingRow description={t("themeDescription")} title={t("themeTitle")}>
            <div className="grid grid-cols-3 gap-2 rounded-[12px] bg-slate-100/82 p-0.5 dark:bg-background/[0.18]">
              {[THEME.AUTO, THEME.LIGHT, THEME.DARK].map((option) => (
                <SettingToggleButton
                  active={settings.theme === option}
                  key={option}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      theme: option,
                    }).catch(reportError);
                  }}
                >
                  {getThemeLabel(option)}
                </SettingToggleButton>
              ))}
            </div>
          </SettingRow>
          <SettingRow description={t("openLinkActionDescription")} title={t("openLinkActionTitle")}>
            <div className="grid grid-cols-2 gap-2 rounded-[12px] bg-slate-100/82 p-0.5 dark:bg-background/[0.18]">
              <SettingToggleButton
                active={settings.openLinkInCurrentTab}
                data-cy="open-link-in-current-tab"
                type="button"
                onClick={() => {
                  onUpdateSettings({
                    openLinkInCurrentTab: true,
                  }).catch(reportError);
                }}
              >
                {t("openLinkCurrentTab")}
              </SettingToggleButton>
              <SettingToggleButton
                active={!settings.openLinkInCurrentTab}
                data-cy="open-link-in-new-tab"
                type="button"
                onClick={() => {
                  onUpdateSettings({
                    openLinkInCurrentTab: false,
                  }).catch(reportError);
                }}
              >
                {t("openLinkNewTab")}
              </SettingToggleButton>
            </div>
          </SettingRow>
        </div>
      </div>
    </PageShell>
  );
}
