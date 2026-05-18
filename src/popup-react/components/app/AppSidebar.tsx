import logoLightUrl from "~/images/logo.svg";
import { PAGES } from "~/constants";
import { PageMenuButton } from "~/popup-react/components/common";

type AppSidebarProps = {
  currentPage: ValueOf<typeof PAGES>;
  setCurrentPage: (page: ValueOf<typeof PAGES>) => void;
};

const NAVIGATION_PAGES = [PAGES.SEARCH, PAGES.SETTING, PAGES.INFO] as const;

export function AppSidebar({ currentPage, setCurrentPage }: AppSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col items-center bg-panel-surface/[0.48] px-1.5 py-2 dark:bg-panel-surface/[0.1]">
      <nav aria-label="Navigation" className="space-y-1.5">
        {NAVIGATION_PAGES.map((page) => (
          <PageMenuButton
            currentPage={currentPage}
            key={page}
            page={page}
            setCurrentPage={setCurrentPage}
          />
        ))}
      </nav>
      <div className="mt-auto flex w-full justify-center pt-3">
        <img alt="Chikamichi" className="size-[22px]" src={logoLightUrl} />
      </div>
    </aside>
  );
}
