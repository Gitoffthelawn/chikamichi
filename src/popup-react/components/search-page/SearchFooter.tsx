import { Check } from "lucide-react";
import { Kbd } from "~/popup-react/components/common";
import { t } from "~/i18n";
import { cn } from "~/lib/utils";

type SearchFooterProps = {
  badgeText: string;
  badgeVisible: boolean;
  openLinkInCurrentTab: boolean;
};

export function SearchFooter({ badgeText, badgeVisible, openLinkInCurrentTab }: SearchFooterProps) {
  return (
    <div className="relative h-10 shrink-0 px-0 pb-0">
      <div className="text-caption flex h-full min-w-0 items-center gap-2 overflow-hidden pr-2 text-foreground/56 dark:text-muted-foreground">
        <Kbd>↑ ↓</Kbd>
        <span className="shrink-0">{t("footerSelect")}</span>
        <Kbd>↵</Kbd>
        <span className="shrink-0">{t("footerOpen")}</span>
        <Kbd>Ctrl ↵</Kbd>
        <span className="min-w-0 truncate">
          {t(openLinkInCurrentTab ? "footerOpenNewTab" : "footerOpenCurrentTab")}
        </span>
        <Kbd>esc</Kbd>
        <span className="shrink-0">{t("footerClose")}</span>
      </div>
      <div
        className={cn(
          "absolute right-0 top-1/2 z-10 inline-flex max-w-[70%] -translate-y-1/2 items-center gap-1 truncate rounded-full border border-primary/20 bg-primary px-2 py-1 text-[10px] font-semibold leading-none text-primary-foreground shadow-[0_8px_18px_rgba(42,91,199,0.2),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-200 ease-out dark:border-primary/35 dark:shadow-[0_10px_24px_rgba(10,18,35,0.36),inset_0_1px_0_rgba(255,255,255,0.28)]",
          badgeVisible ? "opacity-100" : "pointer-events-none translate-y-0 opacity-0",
        )}
        data-cy="action-feedback"
      >
        <Check className="size-3 shrink-0" />
        <span className="min-w-0 truncate">{badgeText}</span>
      </div>
    </div>
  );
}
