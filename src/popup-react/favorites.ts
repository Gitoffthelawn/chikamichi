import { SEARCH_ITEM_TYPE } from "~/constants";
import type { FavoriteItemRecord } from "~/core/storage";

export function toggleFavoriteItems(
  favoriteItems: FavoriteItemRecord[],
  item: SearchResult,
): FavoriteItemRecord[] {
  const exists = favoriteItems.some(
    (favorite) => favorite.url === item.url && favorite.title === item.title,
  );

  if (exists) {
    return favoriteItems.filter(
      (favorite) => !(favorite.url === item.url && favorite.title === item.title),
    );
  }

  return [
    ...favoriteItems,
    {
      faviconUrl: item.faviconUrl,
      folderName: item.folderName,
      title: item.title,
      type: item.type === SEARCH_ITEM_TYPE.TAB ? SEARCH_ITEM_TYPE.HISTORY : item.type,
      url: item.url,
    },
  ];
}

export function moveFavoriteItem(
  favoriteItems: FavoriteItemRecord[],
  selectedIndex: number,
  direction: "up" | "down",
) {
  const targetIndex = direction === "down" ? selectedIndex + 1 : selectedIndex - 1;

  if (favoriteItems.length < 2 || targetIndex < 0 || targetIndex >= favoriteItems.length) {
    return {
      items: favoriteItems,
      selectedIndex,
    };
  }

  const items = favoriteItems.slice();
  const currentItem = items[selectedIndex];
  items[selectedIndex] = items[targetIndex];
  items[targetIndex] = currentItem;

  return {
    items,
    selectedIndex: targetIndex,
  };
}

export function moveFavoriteItemToIndex(
  favoriteItems: FavoriteItemRecord[],
  fromIndex: number,
  toIndex: number,
) {
  if (
    favoriteItems.length < 2 ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= favoriteItems.length ||
    toIndex >= favoriteItems.length ||
    fromIndex === toIndex
  ) {
    return {
      items: favoriteItems,
      selectedIndex: fromIndex,
    };
  }

  const items = favoriteItems.slice();
  const [movedItem] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, movedItem);

  return {
    items,
    selectedIndex: toIndex,
  };
}
