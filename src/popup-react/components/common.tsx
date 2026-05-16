import { type ReactNode } from "react";
import { type Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import { PAGES } from "~/constants";
import { cn } from "~/lib/utils";
import { getPageMeta } from "~/popup-react/utils";

export function SectionHeading({ description, title }: { description: string; title: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-[18px] font-semibold leading-none tracking-tight text-foreground/96">
        {title}
      </h2>
      <p className="text-[12px] leading-5 text-foreground/58 dark:text-muted-foreground/88">
        {description}
      </p>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border/45 bg-white/88 px-2 text-[11px] font-medium text-foreground/56 dark:border-border/18 dark:bg-background/60 dark:text-muted-foreground">
      {children}
    </span>
  );
}

export function SideMenuButton({
  icon: Icon,
  active,
  dataCy,
  onClick,
}: {
  active?: boolean;
  dataCy?: string;
  icon: typeof Search;
  onClick: () => void;
}) {
  return (
    <Button
      className={cn(
        "size-10 rounded-[16px] border border-border/18 bg-background/44 p-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] transition-colors",
        "border-border/45 bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:border-border/18 dark:bg-background/44 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]",
        active
          ? "bg-primary/12 text-foreground dark:bg-primary/10"
          : "text-foreground hover:bg-slate-200/72 dark:hover:bg-muted/56",
      )}
      data-cy={dataCy}
      type="button"
      variant="ghost"
      onClick={onClick}
    >
      <span
        className={cn(
          "flex size-full items-center justify-center rounded-[12px]",
          active
            ? "bg-primary/10 text-primary dark:bg-primary/8"
            : "bg-transparent text-foreground/72 dark:text-foreground/88",
        )}
      >
        <Icon className="size-4" />
      </span>
    </Button>
  );
}

export function PageMenuButton({
  currentPage,
  page,
  setCurrentPage,
}: {
  currentPage: ValueOf<typeof PAGES>;
  page: ValueOf<typeof PAGES>;
  setCurrentPage: (page: ValueOf<typeof PAGES>) => void;
}) {
  const { icon: Icon } = getPageMeta(page);

  return (
    <SideMenuButton
      active={currentPage === page}
      dataCy={`${page}-tab-btn`}
      icon={Icon}
      onClick={() => {
        setCurrentPage(page);
      }}
    />
  );
}

export function PageShell({
  children,
  dataCy,
  description,
  title,
}: {
  children: ReactNode;
  dataCy: string;
  description: string;
  title: string;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-3.5 overflow-hidden" data-cy={dataCy}>
      <SectionHeading description={description} title={title} />
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}

export function FlatSection({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  title: string;
}) {
  return (
    <section className={cn("space-y-3 rounded-[16px] bg-card/10 p-0", className)}>
      <div className="px-0.5 py-0.5">
        <div className="space-y-1">
          <h3 className="text-[13px] font-semibold tracking-tight text-foreground/95">{title}</h3>
          {description ? (
            <p className="text-[12px] leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

export function SettingToggleButton({
  active,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  active: boolean;
}) {
  return (
    <Button
      className={cn(
        "h-9 justify-start rounded-xl border px-3 text-[13px] transition-colors",
        active
          ? "border-primary/25 bg-primary/10 text-foreground"
          : "border-border/45 bg-white/86 text-foreground dark:border-border/16 dark:bg-background/72",
      )}
      variant="ghost"
      {...props}
    >
      {children}
    </Button>
  );
}

export function SettingRow({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="grid grid-cols-[156px_minmax(0,1fr)] items-start gap-4 border-b border-border/12 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div className="space-y-1">
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground/95">{title}</h3>
        {description ? (
          <p className="text-[12px] leading-5 text-foreground/60 dark:text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
