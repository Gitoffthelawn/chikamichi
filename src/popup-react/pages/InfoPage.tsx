import { ArrowUpRight } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { t } from "~/i18n";
import { FlatSection, Kbd, PageShell } from "~/popup-react/components/common";

export function InfoPage({
  onOpenIssue,
  openLinkInCurrentTab,
}: {
  onOpenIssue: () => void;
  openLinkInCurrentTab: boolean;
}) {
  return (
    <PageShell dataCy="page-info" description={t("infoDescription")} title={t("infoTitle")}>
      <div className="space-y-4">
        <FlatSection title={t("quickReferenceTitle")}>
          <div className="space-y-0 rounded-[16px] border border-border/40 bg-white/72 px-3.5 py-2.5 dark:border-border/10 dark:bg-background/10">
            <div className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-3 border-b border-border/10 py-2.5 first:pt-0">
              <div className="text-[12px] text-muted-foreground">{t("labelSearchTargets")}</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{t("searchTargetTabs")}</Badge>
                <Badge variant="secondary">{t("searchTargetBookmarks")}</Badge>
                <Badge variant="secondary">{t("searchTargetHistory")}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-3 border-b border-border/10 py-2.5">
              <div className="text-[12px] text-muted-foreground">{t("labelMoveSelection")}</div>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-foreground">
                <Kbd>↑ ↓</Kbd>
                <span>{t("shortcutsMoveSelection")}</span>
              </div>
            </div>
            <div className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-3 border-b border-border/10 py-2.5">
              <div className="text-[12px] text-muted-foreground">{t("labelOpenPopup")}</div>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-foreground">
                <Kbd>⌘ K</Kbd>
                <span>{t("shortcutOpenPopup")}</span>
              </div>
            </div>
            <div className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-3 border-b border-border/10 py-2.5">
              <div className="text-[12px] text-muted-foreground">{t("altOpen")}</div>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-foreground">
                <Kbd>⌘ ↵</Kbd>
                <span>
                  {t(
                    "labelAlternativeOpen",
                    openLinkInCurrentTab ? t("labelCurrentTab") : t("labelNewTab"),
                  )}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-3 border-b border-border/10 py-2.5">
              <div className="text-[12px] text-muted-foreground">
                {t("actionModeShortcutTitle")}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-foreground">
                <Kbd>&gt;</Kbd>
                <span>{t("actionModeShortcutBody")}</span>
              </div>
            </div>
            <div className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-3 pt-2.5">
              <div className="text-[12px] text-muted-foreground">{t("labelUtilities")}</div>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-foreground">
                <Kbd>⌘ D</Kbd>
                <span>{t("shortcutUtilities")}</span>
              </div>
            </div>
          </div>
        </FlatSection>
        <FlatSection
          className="space-y-3"
          description={t("feedbackDescription")}
          title={t("feedbackTitle")}
        >
          <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border/10 bg-background/10 px-3.5 py-3">
            <div className="text-[12px] leading-5 text-foreground/60 dark:text-muted-foreground">
              {t("feedbackBody")}
            </div>
            <Button
              className="h-9 shrink-0 rounded-xl border border-border/18 bg-primary/12 px-3 text-sm hover:bg-primary/16"
              type="button"
              variant="ghost"
              onClick={onOpenIssue}
            >
              <ArrowUpRight className="size-4" />
              {t("buttonOpenIssue")}
            </Button>
          </div>
        </FlatSection>
      </div>
    </PageShell>
  );
}
