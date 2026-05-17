import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { t } from "~/i18n";
import { FlatSection, Kbd, PageShell } from "~/popup-react/components/common";

function ShortcutRow({
  children,
  keys,
  label,
}: {
  children?: ReactNode;
  keys: ReactNode;
  label: string;
}) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-3 border-b border-border-divider/[0.1] py-2.5 last:border-b-0 dark:border-border-divider/[0.18]">
      <div className="flex flex-wrap gap-1.5">{keys}</div>
      <div className="min-w-0 space-y-1">
        <div className="text-body-sm leading-6 text-foreground">{label}</div>
        {children ? (
          <div className="text-meta leading-5 text-muted-foreground">{children}</div>
        ) : null}
      </div>
    </div>
  );
}

function ReferenceSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <FlatSection title={title}>
      <div className="panel-surface px-3.5 py-1">{children}</div>
    </FlatSection>
  );
}

export function InfoPage({
  onOpenIssue,
  openLinkInCurrentTab,
}: {
  onOpenIssue: () => void;
  openLinkInCurrentTab: boolean;
}) {
  return (
    <PageShell dataCy="page-info" title={t("infoTitle")}>
      <div className="space-y-4">
        <ReferenceSection title={t("searchSectionTitle")}>
          <ShortcutRow
            keys={
              <>
                <Badge variant="secondary">{t("searchTargetTabs")}</Badge>
                <Badge variant="secondary">{t("searchTargetBookmarks")}</Badge>
                <Badge variant="secondary">{t("searchTargetHistory")}</Badge>
              </>
            }
            label={t("labelSearchTargets")}
          />
          <ShortcutRow keys={<Kbd>&gt;</Kbd>} label={t("labelActionMode")}>
            {t("actionModeShortcutBody")}
          </ShortcutRow>
        </ReferenceSection>

        <ReferenceSection title={t("navigationSectionTitle")}>
          <ShortcutRow
            keys={
              <>
                <Kbd>↑ ↓</Kbd>
                <Kbd>Ctrl N/P</Kbd>
              </>
            }
            label={t("labelMoveSelection")}
          />
          <ShortcutRow keys={<Kbd>↵</Kbd>} label={t("labelOpenSelected")}>
            {t("shortcutOpenSelected")}
          </ShortcutRow>
          <ShortcutRow keys={<Kbd>Ctrl ↵</Kbd>} label={t("altOpen")}>
            {t(
              "labelAlternativeOpen",
              openLinkInCurrentTab ? t("labelCurrentTab") : t("labelNewTab"),
            )}
          </ShortcutRow>
        </ReferenceSection>

        <ReferenceSection title={t("actionsSectionTitle")}>
          <ShortcutRow keys={<Kbd>Ctrl F</Kbd>} label={t("labelPinSelected")}>
            {t("shortcutPinSelected")}
          </ShortcutRow>
          <ShortcutRow keys={<Kbd>Ctrl C</Kbd>} label={t("shortcutCopyUrl")} />
          <ShortcutRow keys={<Kbd>Ctrl D</Kbd>} label={t("labelDeleteSelected")}>
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              <span>{t("labelDeleteHistory")}</span>
              <span>{t("labelDeleteBookmark")}</span>
              <span>{t("labelDeleteTab")}</span>
            </span>
          </ShortcutRow>
        </ReferenceSection>

        <FlatSection className="space-y-3" title={t("feedbackTitle")}>
          <div className="flex items-center justify-between gap-4 rounded-panel border border-border-subtle/[0.1] bg-background/10 px-3.5 py-3 dark:border-border-subtle/[0.18]">
            <div className="text-meta leading-5 text-foreground/[0.6] dark:text-muted-foreground">
              {t("feedbackBody")}
            </div>
            <Button
              className="h-9 shrink-0 rounded-control border border-border-control/[0.18] bg-primary/[0.12] px-3 text-sm hover:bg-primary/[0.16] dark:border-border-control/[0.24]"
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
