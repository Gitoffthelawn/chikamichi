import { Check } from "lucide-react";
import { Kbd } from "~/popup-react/components/common";
import { t } from "~/i18n";
import { cn } from "~/lib/utils";

type SearchFooterProps = {
  badgeText: string;
  badgeVisible: boolean;
};

export function SearchFooter({ badgeText, badgeVisible }: SearchFooterProps) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 px-0 pb-0 text-[11px] text-foreground/56 dark:text-muted-foreground">
      <Kbd>↑ ↓</Kbd>
      <span>{t("footerSelect")}</span>
      <Kbd>↵</Kbd>
      <span>{t("footerOpen")}</span>
      <Kbd>⌘ K</Kbd>
      <span>{t("footerFocusSearch")}</span>
      <Kbd>esc</Kbd>
      <span>{t("footerClose")}</span>
      <div className="ml-auto flex min-w-0 justify-end">
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 ease-out",
            badgeVisible
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-1 opacity-0",
          )}
          data-cy="action-feedback"
        >
          <Check className="size-3.5" />
          <span>{badgeText}</span>
        </div>
      </div>
    </div>
  );
}
