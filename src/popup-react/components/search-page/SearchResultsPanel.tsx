import { ExternalLink, Search } from "lucide-react";
import type { MutableRefObject } from "react";
import { Badge } from "~/components/ui/badge";
import { t } from "~/i18n";
import { cn } from "~/lib/utils";
import { ActionResultRow, SearchResultRow } from "~/popup-react/components/result-rows";
import type { ActionItem } from "~/popup-react/types";
import { reportError } from "~/popup-react/utils";

type SearchResultsPanelProps = {
  actionMode: boolean;
  actionResults: ActionItem[];
  draggedFavoriteIndex: number | null;
  dragOverFavoriteIndex: number | null;
  extractedSearchWord: string;
  favoriteReorderEnabled: boolean;
  handleFavoriteDragStateChange: (
    draggedIndex: number | null,
    dragOverIndex: number | null,
  ) => void;
  handlePointerSelection: (index: number, clientX: number, clientY: number) => void;
  loadingCollections: boolean;
  openSearchResultItem: (item: SearchResult) => void;
  reorderFavoriteItem: (fromIndex: number, toIndex: number) => void;
  resultRefs: MutableRefObject<Array<HTMLElement | null>>;
  runActionItem: (item: ActionItem) => void;
  searchEngine: {
    favIconUrl: string;
    name: string;
  };
  searchResult: SearchResult[];
  selectedNumber: number;
  toggleFavoriteItem: (item: SearchResult) => void;
  browserSearch: (query: string, inNewTab?: boolean) => Promise<void>;
};

export function SearchResultsPanel({
  actionMode,
  actionResults,
  draggedFavoriteIndex,
  dragOverFavoriteIndex,
  extractedSearchWord,
  favoriteReorderEnabled,
  handleFavoriteDragStateChange,
  handlePointerSelection,
  loadingCollections,
  openSearchResultItem,
  reorderFavoriteItem,
  resultRefs,
  runActionItem,
  searchEngine,
  searchResult,
  selectedNumber,
  toggleFavoriteItem,
  browserSearch,
}: SearchResultsPanelProps) {
  const renderResults = () => {
    if (actionMode) {
      if (actionResults.length > 0) {
        return actionResults.map((item, index) => (
          <ActionResultRow
            description={item.description}
            icon={item.icon}
            id={item.id}
            index={index}
            item={item}
            key={item.id}
            onPointerSelection={handlePointerSelection}
            onRunItem={runActionItem}
            rowRef={(element) => {
              resultRefs.current[index] = element;
            }}
            selected={index === selectedNumber}
            title={item.title}
          />
        ));
      }

      return (
        <div
          className="flex min-h-[180px] items-center justify-center rounded-[16px] border border-dashed border-border/[0.1] bg-background/[0.16] px-5 text-center"
          data-cy="action-result-empty"
        >
          <div className="space-y-1">
            <h2 className="text-base font-semibold">{t("actionModeTitle")}</h2>
            <p className="text-[13px] text-muted-foreground">{t("actionModeEmpty")}</p>
          </div>
        </div>
      );
    }

    if (searchResult.length > 0) {
      return searchResult.map((item, index) => (
        <SearchResultRow
          dragOverFavoriteIndex={dragOverFavoriteIndex}
          draggedFavoriteIndex={draggedFavoriteIndex}
          favoriteReorderEnabled={favoriteReorderEnabled}
          handlePointerSelection={handlePointerSelection}
          index={index}
          item={item}
          key={`${item.url}-${item.title}-${index}`}
          onDragStateChange={handleFavoriteDragStateChange}
          onOpen={openSearchResultItem}
          onReorder={reorderFavoriteItem}
          onToggleFavorite={toggleFavoriteItem}
          rowRef={(element) => {
            resultRefs.current[index] = element;
          }}
          selected={index === selectedNumber}
        />
      ));
    }

    if (extractedSearchWord && !loadingCollections) {
      const browserSearchSelected = selectedNumber === 0;

      return (
        <button
          aria-selected={browserSearchSelected}
          className={cn(
            "grid w-full grid-cols-[18px_minmax(0,1fr)_auto_auto] items-center gap-2.5 rounded-[14px] px-3 py-2 text-left",
            browserSearchSelected ? "interactive-row-selected" : "interactive-row",
          )}
          data-cy="browser-search-btn"
          type="button"
          onClick={() => {
            browserSearch(extractedSearchWord).catch(reportError);
          }}
        >
          <img
            alt=""
            className="size-[18px] rounded-sm"
            height="18"
            src={searchEngine.favIconUrl}
            width="18"
          />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium leading-[1.25] text-foreground">
              {t("browserSearch", extractedSearchWord)}
            </div>
            <div className="truncate text-[11px] leading-[1.25] text-foreground/[0.56] dark:text-muted-foreground">
              {searchEngine.name || t("browserSearchEngine")}
            </div>
          </div>
          <Badge variant="secondary">{t("browserSearchEngine")}</Badge>
          <div className="inline-flex size-7 items-center justify-center rounded-lg border border-transparent bg-slate-100/[0.88] text-foreground/[0.52] dark:bg-background/[0.52] dark:text-muted-foreground">
            <ExternalLink className="size-3.5" />
          </div>
        </button>
      );
    }

    return (
      <div
        className="flex min-h-[180px] items-center justify-center rounded-[16px] border border-dashed border-border/[0.1] bg-background/[0.16] px-5 text-center"
        data-cy="search-result-empty"
      >
        <div className="space-y-2">
          <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-primary/[0.1] text-primary">
            <Search className="size-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">{t("searchEmptyTitle")}</h2>
            <p className="text-[13px] text-foreground/[0.56] dark:text-muted-foreground">
              {t("searchEmptyBody")}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative h-[367px] shrink-0 overflow-y-auto overflow-x-hidden rounded-[18px] border border-border/[0.24] bg-slate-100/[0.72] p-1.5 dark:border-border/[0.14] dark:bg-card/[0.12]"
      data-cy="search-result-wrapper"
    >
      <div className="space-y-1.5 pb-1">{renderResults()}</div>
    </div>
  );
}
