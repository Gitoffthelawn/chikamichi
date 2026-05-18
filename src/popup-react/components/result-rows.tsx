import { memo, useEffect, useState } from "react";
import {
  Bookmark,
  Clock3,
  CornerDownLeft,
  Globe2,
  GripVertical,
  PanelTop,
  Pin,
  PinOff,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { t } from "~/i18n";
import { highlightText } from "~/popup-react/utils";
import type { ActionItem } from "~/popup-react/types";
import type { CommandItem } from "~/popup-react/command-items";

const sourceTypeIcons = {
  bookmark: Bookmark,
  history: Clock3,
  tab: PanelTop,
} satisfies Record<SearchResult["type"], LucideIcon>;

function FaviconImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className="flex size-[18px] items-center justify-center rounded-sm border border-border-product bg-control-surface text-foreground/46 dark:bg-control-surface/70 dark:text-muted-foreground"
      >
        <Globe2 className="size-3" />
      </span>
    );
  }

  return (
    <img
      alt=""
      className="size-[18px] rounded-sm"
      height="18"
      src={src}
      width="18"
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

function SourceTypeBadge({ index, type }: { index: number; type: SearchResult["type"] }) {
  const Icon = sourceTypeIcons[type];

  return (
    <Badge
      aria-label={type}
      className="size-5 justify-center p-0"
      data-cy={`search-result-type-${index}`}
      title={type}
      variant="secondary"
    >
      <Icon aria-hidden="true" className="size-3" />
    </Badge>
  );
}

function getDraggedIndex(event: React.DragEvent, draggedFavoriteIndex: number | null) {
  if (draggedFavoriteIndex !== null) {
    return draggedFavoriteIndex;
  }

  const draggedIndex = Number(event.dataTransfer.getData("text/plain"));
  return Number.isInteger(draggedIndex) ? draggedIndex : null;
}

// oxlint-disable-next-line prefer-arrow-callback
const SearchResultRow = memo(function SearchResultRow({
  dragOverFavoriteIndex,
  draggedFavoriteIndex,
  favoriteReorderEnabled,
  handlePointerSelection,
  index,
  item,
  onDragStateChange,
  onOpen,
  onReorder,
  rowRef,
  onToggleFavorite,
  selected,
}: {
  dragOverFavoriteIndex: number | null;
  draggedFavoriteIndex: number | null;
  favoriteReorderEnabled: boolean;
  handlePointerSelection: (index: number, clientX: number, clientY: number) => void;
  index: number;
  item: SearchResult;
  onDragStateChange: (draggedIndex: number | null, dragOverIndex: number | null) => void;
  onOpen: (item: SearchResult) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  rowRef?: (element: HTMLElement | null) => void;
  onToggleFavorite: (item: SearchResult) => void;
  selected: boolean;
}) {
  return (
    <div
      aria-selected={selected}
      className={cn(
        "group grid cursor-pointer items-center rounded-row px-2.5 py-2",
        favoriteReorderEnabled
          ? "grid-cols-[14px_18px_minmax(0,1fr)_auto] gap-1.5"
          : "grid-cols-[18px_minmax(0,1fr)_auto] gap-2",
        selected ? "interactive-row-selected" : "interactive-row",
        draggedFavoriteIndex === index ? "opacity-55" : "",
        dragOverFavoriteIndex === index ? "shadow-[inset_0_0_0_1px_rgba(90,145,255,0.26)]" : "",
      )}
      data-cy={`search-result-${index}`}
      data-selected={selected}
      draggable={false}
      ref={rowRef}
      role="button"
      tabIndex={0}
      onClick={() => {
        onOpen(item);
      }}
      onDragLeave={() => {
        if (dragOverFavoriteIndex === index) {
          onDragStateChange(draggedFavoriteIndex, null);
        }
      }}
      onDragOver={(event) => {
        if (!favoriteReorderEnabled) {
          return;
        }
        event.preventDefault();
        if (dragOverFavoriteIndex !== index) {
          onDragStateChange(draggedFavoriteIndex, index);
        }
      }}
      onDrop={(event) => {
        const draggedIndex = getDraggedIndex(event, draggedFavoriteIndex);
        if (!favoriteReorderEnabled || draggedIndex === null) {
          return;
        }
        event.preventDefault();
        onDragStateChange(null, null);
        onReorder(draggedIndex, index);
      }}
      onMouseMove={(event) => {
        handlePointerSelection(index, event.clientX, event.clientY);
      }}
    >
      {favoriteReorderEnabled ? (
        <button
          aria-label={t("favoriteDragHandle")}
          className={cn(
            "flex size-3.5 cursor-grab items-center justify-center rounded-md text-foreground/34 opacity-0 transition-opacity group-hover:opacity-100",
            selected ? "opacity-100 text-primary/70" : "",
          )}
          data-cy={`favorite-drag-handle-${index}`}
          draggable
          type="button"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onDragEnd={() => {
            onDragStateChange(null, null);
          }}
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(index));
            onDragStateChange(index, index);
          }}
        >
          <GripVertical className="size-3" />
        </button>
      ) : null}
      <FaviconImage src={item.faviconUrl} />
      <div className="min-w-0">
        <div className="text-body-sm truncate font-medium">
          {highlightText(item.title, item.matchedWord)}
        </div>
        <div className="text-[10px] leading-tight truncate text-foreground/58 dark:text-muted-foreground">
          {item.url}
        </div>
      </div>
      <div className="flex min-w-0 flex-col items-end gap-1 text-[10px] leading-none text-muted-foreground">
        <div className="flex items-center gap-1">
          <button
            aria-label={item.isFavorite ? t("badgeRemoveFavorite") : t("badgeAddFavorite")}
            className={cn(
              "flex size-5 items-center justify-center rounded-full border",
              item.isFavorite
                ? "border-transparent bg-secondary text-secondary-foreground"
                : "border-transparent bg-secondary text-secondary-foreground/72",
            )}
            data-cy={`search-result-favorite-${index}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(item);
            }}
          >
            {item.isFavorite ? (
              <Pin className="size-3 fill-current" />
            ) : (
              <PinOff className="size-3" />
            )}
          </button>
          <SourceTypeBadge index={index} type={item.type} />
        </div>
        {item.folderName ? <span className="max-w-20 truncate">{item.folderName}</span> : null}
      </div>
    </div>
  );
});

// oxlint-disable-next-line prefer-arrow-callback
const ActionResultRow = memo(function ActionResultRow({
  description,
  dragOverFavoriteIndex,
  draggedFavoriteIndex,
  favoriteReorderEnabled,
  icon: Icon,
  id,
  index,
  isFavorite,
  item,
  onDragStateChange,
  onPointerSelection,
  onReorder,
  onRunItem,
  onToggleFavorite,
  rowRef,
  selected,
  title,
}: {
  description: string;
  dragOverFavoriteIndex: number | null;
  draggedFavoriteIndex: number | null;
  favoriteReorderEnabled: boolean;
  icon: ActionItem["icon"];
  id: string;
  index: number;
  isFavorite: boolean;
  item: ActionItem;
  onDragStateChange: (draggedIndex: number | null, dragOverIndex: number | null) => void;
  onPointerSelection: (index: number, clientX: number, clientY: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRunItem: (item: ActionItem) => void;
  onToggleFavorite: (item: ActionItem) => void;
  rowRef?: (element: HTMLDivElement | null) => void;
  selected: boolean;
  title: string;
}) {
  const reorderEnabled = favoriteReorderEnabled && isFavorite;

  return (
    <div
      aria-selected={selected}
      className={cn(
        "group grid w-full cursor-pointer items-center rounded-row px-3 py-2 text-left",
        reorderEnabled
          ? "grid-cols-[14px_18px_minmax(0,1fr)_auto] gap-1.5"
          : "grid-cols-[18px_minmax(0,1fr)_auto] gap-2.5",
        selected ? "interactive-row-selected-subtle" : "interactive-row",
        draggedFavoriteIndex === index ? "opacity-55" : "",
        dragOverFavoriteIndex === index ? "shadow-[inset_0_0_0_1px_rgba(90,145,255,0.26)]" : "",
      )}
      data-cy={`action-result-${index}`}
      data-selected={selected}
      key={id}
      ref={rowRef}
      role="button"
      tabIndex={0}
      onClick={() => {
        onRunItem(item);
      }}
      onDragLeave={() => {
        if (dragOverFavoriteIndex === index) {
          onDragStateChange(draggedFavoriteIndex, null);
        }
      }}
      onDragOver={(event) => {
        if (!reorderEnabled) {
          return;
        }
        event.preventDefault();
        if (dragOverFavoriteIndex !== index) {
          onDragStateChange(draggedFavoriteIndex, index);
        }
      }}
      onDrop={(event) => {
        const draggedIndex = getDraggedIndex(event, draggedFavoriteIndex);
        if (!reorderEnabled || draggedIndex === null) {
          return;
        }
        event.preventDefault();
        onDragStateChange(null, null);
        onReorder(draggedIndex, index);
      }}
      onMouseMove={(event) => {
        onPointerSelection(index, event.clientX, event.clientY);
      }}
    >
      {reorderEnabled ? (
        <button
          aria-label={t("favoriteDragHandle")}
          className={cn(
            "flex size-3.5 cursor-grab items-center justify-center rounded-md text-foreground/34 opacity-0 transition-opacity group-hover:opacity-100",
            selected ? "opacity-100 text-primary/70" : "",
          )}
          data-cy={`favorite-drag-handle-${index}`}
          draggable
          type="button"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onDragEnd={() => {
            onDragStateChange(null, null);
          }}
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(index));
            onDragStateChange(index, index);
          }}
        >
          <GripVertical className="size-3" />
        </button>
      ) : null}
      <div className="flex size-[18px] items-center justify-center text-primary/88">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-body-sm truncate font-medium">{title}</div>
        <div className="text-[10px] leading-tight truncate text-foreground/58 dark:text-muted-foreground">
          {description}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          aria-label={isFavorite ? t("badgeRemoveFavorite") : t("badgeAddFavorite")}
          className={cn(
            "flex size-5 items-center justify-center rounded-full border border-transparent bg-secondary",
            isFavorite ? "text-secondary-foreground" : "text-secondary-foreground/72",
          )}
          data-cy={`action-result-favorite-${index}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(item);
          }}
        >
          {isFavorite ? <Pin className="size-3 fill-current" /> : <PinOff className="size-3" />}
        </button>
        <Badge className="size-5 justify-center p-0" variant="secondary">
          <CornerDownLeft aria-hidden="true" className="size-3" />
        </Badge>
      </div>
    </div>
  );
});

// oxlint-disable-next-line prefer-arrow-callback
export const CommandResultRow = memo(function CommandResultRow({
  commandItem,
  dragOverFavoriteIndex,
  draggedFavoriteIndex,
  favoriteReorderEnabled,
  handlePointerSelection,
  index,
  onDragStateChange,
  onOpen,
  onReorder,
  onRunCommand,
  onToggleActionFavorite,
  onToggleFavorite,
  rowRef,
  selected,
}: {
  commandItem: CommandItem;
  dragOverFavoriteIndex: number | null;
  draggedFavoriteIndex: number | null;
  favoriteReorderEnabled: boolean;
  handlePointerSelection: (index: number, clientX: number, clientY: number) => void;
  index: number;
  onDragStateChange: (draggedIndex: number | null, dragOverIndex: number | null) => void;
  onOpen: (item: SearchResult) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRunCommand: (item: CommandItem) => void;
  onToggleActionFavorite: (item: ActionItem) => void;
  onToggleFavorite: (item: SearchResult) => void;
  rowRef?: (element: HTMLElement | null) => void;
  selected: boolean;
}) {
  if (commandItem.kind === "page") {
    return (
      <SearchResultRow
        dragOverFavoriteIndex={dragOverFavoriteIndex}
        draggedFavoriteIndex={draggedFavoriteIndex}
        favoriteReorderEnabled={favoriteReorderEnabled}
        handlePointerSelection={handlePointerSelection}
        index={index}
        item={commandItem.searchResult}
        onDragStateChange={onDragStateChange}
        onOpen={onOpen}
        onReorder={onReorder}
        onToggleFavorite={onToggleFavorite}
        rowRef={rowRef}
        selected={selected}
      />
    );
  }

  if (commandItem.kind === "action") {
    return (
      <ActionResultRow
        description={commandItem.subtitle}
        dragOverFavoriteIndex={dragOverFavoriteIndex}
        draggedFavoriteIndex={draggedFavoriteIndex}
        favoriteReorderEnabled={favoriteReorderEnabled}
        icon={commandItem.icon}
        id={commandItem.id}
        index={index}
        isFavorite={commandItem.isFavorite}
        item={commandItem.action}
        onDragStateChange={onDragStateChange}
        onPointerSelection={handlePointerSelection}
        onReorder={onReorder}
        onRunItem={() => {
          onRunCommand(commandItem);
        }}
        onToggleFavorite={onToggleActionFavorite}
        rowRef={rowRef}
        selected={selected}
        title={commandItem.title}
      />
    );
  }

  return (
    <button
      aria-selected={selected}
      className={cn(
        "grid w-full cursor-pointer grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-row px-3 py-2 text-left",
        selected ? "interactive-row-selected" : "interactive-row",
      )}
      data-cy="browser-search-btn"
      data-selected={selected}
      ref={rowRef}
      type="button"
      onClick={() => {
        onRunCommand(commandItem);
      }}
      onMouseMove={(event) => {
        handlePointerSelection(index, event.clientX, event.clientY);
      }}
    >
      <FaviconImage src={commandItem.faviconUrl} />
      <div className="min-w-0">
        <div className="text-body-sm truncate font-medium text-foreground">{commandItem.title}</div>
        <div className="text-[10px] leading-tight truncate text-foreground/[0.56] dark:text-muted-foreground">
          {commandItem.subtitle}
        </div>
      </div>
      <Badge
        aria-label={commandItem.badge}
        className="size-5 justify-center p-0"
        variant="secondary"
      >
        <Globe2 aria-hidden="true" className="size-3" />
      </Badge>
    </button>
  );
});
