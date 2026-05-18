import { ChevronDown } from "lucide-react";
import { LANGUAGE, POPUP_HEIGHT, POPUP_WIDTH, SEARCH_PREFIX, THEME } from "~/constants";
import type { AppSettings } from "~/core/storage";
import { t } from "~/i18n";
import { PageShell, SettingRow, SettingToggleButton } from "~/popup-react/components/common";
import {
  getLanguageLabel,
  getResolvedTheme,
  getThemeLabel,
  reportError,
} from "~/popup-react/utils";

const POPUP_HEIGHT_OPTIONS = Object.values(POPUP_HEIGHT).sort((a, b) => Number(a) - Number(b));
const POPUP_WIDTH_OPTIONS = Object.values(POPUP_WIDTH).sort((a, b) => Number(a) - Number(b));

export function SettingPage({
  onUpdateSettings,
  settings,
}: {
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  settings: AppSettings;
}) {
  return (
    <PageShell dataCy="page-setting" title={t("settingTitle")}>
      <div className="space-y-0 rounded-panel bg-card/[0.1]">
        <div className="panel-surface space-y-0 px-3.5 py-3">
          <SettingRow title={t("prefixTitle")}>
            <div className="relative">
              <select
                className="flex h-7 w-full appearance-none rounded-control border border-border-control/[0.5] bg-control-surface/[0.92] px-2 pr-7 text-[11px] leading-none text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring dark:border-border-control/[0.28] dark:bg-control-surface/[0.8]"
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
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            </div>
          </SettingRow>
          <SettingRow title={t("themeTitle")}>
            <div className="segmented-control grid grid-cols-3 gap-2">
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
          <SettingRow title={t("languageTitle")}>
            <div className="segmented-control grid grid-cols-3 gap-2">
              {[LANGUAGE.AUTO, LANGUAGE.EN, LANGUAGE.JA].map((option) => (
                <SettingToggleButton
                  active={settings.language === option}
                  data-cy={`language-${option}`}
                  key={option}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      language: option,
                    }).catch(reportError);
                  }}
                >
                  {getLanguageLabel(option)}
                </SettingToggleButton>
              ))}
            </div>
          </SettingRow>
          <SettingRow title={t("openLinkActionTitle")}>
            <div className="segmented-control grid grid-cols-2 gap-2">
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
          <SettingRow title={t("popupSizeTitle")}>
            <div className="grid grid-cols-1 gap-2">
              <label className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                <span className="text-caption font-semibold text-muted-foreground">
                  {t("popupWidthLabel")}
                </span>
                <select
                  className="flex h-7 w-full appearance-none rounded-control border border-border-control/[0.5] bg-control-surface/[0.92] px-2 text-[11px] leading-none text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring dark:border-border-control/[0.28] dark:bg-control-surface/[0.8]"
                  data-cy="select-popup-width"
                  style={{
                    colorScheme: getResolvedTheme(settings.theme) === THEME.DARK ? "dark" : "light",
                  }}
                  value={settings.popupWidth}
                  onChange={(event) => {
                    onUpdateSettings({
                      popupWidth: event.target.value as ValueOf<typeof POPUP_WIDTH>,
                    }).catch(reportError);
                  }}
                >
                  {POPUP_WIDTH_OPTIONS.map((width) => (
                    <option key={width} value={width}>
                      {width}
                    </option>
                  ))}
                </select>
                <span className="text-caption font-semibold text-muted-foreground">px</span>
              </label>
              <label className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                <span className="text-caption font-semibold text-muted-foreground">
                  {t("popupHeightLabel")}
                </span>
                <select
                  className="flex h-7 w-full appearance-none rounded-control border border-border-control/[0.5] bg-control-surface/[0.92] px-2 text-[11px] leading-none text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring dark:border-border-control/[0.28] dark:bg-control-surface/[0.8]"
                  data-cy="select-popup-height"
                  style={{
                    colorScheme: getResolvedTheme(settings.theme) === THEME.DARK ? "dark" : "light",
                  }}
                  value={settings.popupHeight}
                  onChange={(event) => {
                    onUpdateSettings({
                      popupHeight: event.target.value as ValueOf<typeof POPUP_HEIGHT>,
                    }).catch(reportError);
                  }}
                >
                  {POPUP_HEIGHT_OPTIONS.map((height) => (
                    <option key={height} value={height}>
                      {height}
                    </option>
                  ))}
                </select>
                <span className="text-caption font-semibold text-muted-foreground">px</span>
              </label>
            </div>
          </SettingRow>
        </div>
      </div>
    </PageShell>
  );
}
