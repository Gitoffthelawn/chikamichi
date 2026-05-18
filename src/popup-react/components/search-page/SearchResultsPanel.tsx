import { LoaderCircle, Search } from "lucide-react";
import type { MutableRefObject } from "react";
import { t } from "~/i18n";
import { CommandResultRow } from "~/popup-react/components/result-rows";
import type { CommandItem } from "~/popup-react/command-items";
import type { ActionItem } from "~/popup-react/types";

type SearchResultsPanelProps = {
  actionMode: boolean;
  commandItems: CommandItem[];
  draggedFavoriteIndex: number | null;
  dragOverFavoriteIndex: number | null;
  favoriteReorderEnabled: boolean;
  handleFavoriteDragStateChange: (
    draggedIndex: number | null,
    dragOverIndex: number | null,
  ) => void;
  handlePointerSelection: (index: number, clientX: number, clientY: number) => void;
  openSearchResultItem: (item: SearchResult) => void;
  opening: boolean;
  reorderFavoriteItem: (fromIndex: number, toIndex: number) => void;
  resultRefs: MutableRefObject<Array<HTMLElement | null>>;
  resultsWrapperRef: MutableRefObject<HTMLDivElement | null>;
  runCommandItem: (item: CommandItem) => void;
  selectedNumber: number;
  toggleActionFavoriteItem: (item: ActionItem) => void;
  toggleFavoriteItem: (item: SearchResult) => void;
};

export function SearchResultsPanel({
  actionMode,
  commandItems,
  draggedFavoriteIndex,
  dragOverFavoriteIndex,
  favoriteReorderEnabled,
  handleFavoriteDragStateChange,
  handlePointerSelection,
  openSearchResultItem,
  opening,
  reorderFavoriteItem,
  resultRefs,
  resultsWrapperRef,
  runCommandItem,
  selectedNumber,
  toggleActionFavoriteItem,
  toggleFavoriteItem,
}: SearchResultsPanelProps) {
  const renderResults = () => {
    if (commandItems.length > 0) {
      return commandItems.map((item, index) => (
        <CommandResultRow
          commandItem={item}
          dragOverFavoriteIndex={dragOverFavoriteIndex}
          draggedFavoriteIndex={draggedFavoriteIndex}
          favoriteReorderEnabled={favoriteReorderEnabled}
          handlePointerSelection={handlePointerSelection}
          index={index}
          key={item.id}
          onDragStateChange={handleFavoriteDragStateChange}
          onOpen={openSearchResultItem}
          onReorder={reorderFavoriteItem}
          onRunCommand={runCommandItem}
          onToggleActionFavorite={toggleActionFavoriteItem}
          onToggleFavorite={toggleFavoriteItem}
          rowRef={(element) => {
            resultRefs.current[index] = element;
          }}
          selected={index === selectedNumber}
        />
      ));
    }

    if (actionMode) {
      return (
        <div
          className="flex h-full min-h-[140px] items-center justify-center rounded-panel border border-dashed border-search-border/[0.1] bg-background/[0.16] px-5 text-center dark:border-search-border/[0.2]"
          data-cy="action-result-empty"
        >
          <div className="space-y-1">
            <h2 className="text-body font-semibold">{t("actionModeTitle")}</h2>
            <p className="text-body-sm text-muted-foreground">{t("actionModeEmpty")}</p>
          </div>
        </div>
      );
    }

    return (
      <div
        className="flex h-full min-h-[140px] items-center justify-center rounded-panel border border-dashed border-search-border/[0.1] bg-background/[0.16] px-5 text-center dark:border-search-border/[0.2]"
        data-cy="search-result-empty"
      >
        <div className="space-y-2">
          <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-primary/[0.1] text-primary">
            <Search className="size-4" />
          </div>
          <div className="space-y-1">
            <h2 className="text-body font-semibold">{t("searchEmptyTitle")}</h2>
            <p className="text-body-sm text-foreground/[0.56] dark:text-muted-foreground">
              {t("searchEmptyBody")}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="search-surface relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-1.5"
      data-cy="search-result-wrapper"
      ref={resultsWrapperRef}
    >
      <div className={opening ? "pointer-events-none" : undefined}>{renderResults()}</div>
      {opening ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px]"
          data-cy="opening-overlay"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/95 px-3 py-2 text-body-sm font-semibold text-foreground shadow-[0_10px_24px_rgba(17,24,39,0.16)] dark:border-primary/35 dark:bg-background/90 dark:shadow-[0_10px_24px_rgba(10,18,35,0.36)]">
            <LoaderCircle className="size-4 animate-spin text-primary" />
            <span>{t("openingPage")}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
