import { expect, it } from "vitest";
import { SEARCH_ITEM_TYPE } from "~/constants";
import {
  moveFavoriteItem,
  moveFavoriteItemToIndex,
  toggleFavoriteItems,
} from "~/popup-react/favorites";

const baseResult: SearchResult = {
  faviconUrl: "https://example.com/favicon.png",
  isFavorite: false,
  matchedWord: "",
  score: 0,
  searchTerm: "history item",
  title: "history-item-0",
  type: SEARCH_ITEM_TYPE.HISTORY,
  url: "https://history-item.com/0",
};

it("adds and removes favorites", () => {
  const added = toggleFavoriteItems([], baseResult);
  expect(added).toEqual([
    {
      faviconUrl: baseResult.faviconUrl,
      folderName: undefined,
      title: baseResult.title,
      type: SEARCH_ITEM_TYPE.HISTORY,
      url: baseResult.url,
    },
  ]);

  const removed = toggleFavoriteItems(added, baseResult);
  expect(removed).toEqual([]);
});

it("normalizes tab favorites to history", () => {
  const added = toggleFavoriteItems([], {
    ...baseResult,
    type: SEARCH_ITEM_TYPE.TAB,
  });

  expect(added[0].type).toBe(SEARCH_ITEM_TYPE.HISTORY);
});

it("moves favorites up and down", () => {
  const favoriteItems = [
    {
      faviconUrl: "a",
      title: "a",
      type: SEARCH_ITEM_TYPE.HISTORY,
      url: "https://a.test",
    },
    {
      faviconUrl: "b",
      title: "b",
      type: SEARCH_ITEM_TYPE.HISTORY,
      url: "https://b.test",
    },
  ];

  const movedDown = moveFavoriteItem(favoriteItems, 0, "down");
  expect(movedDown.selectedIndex).toBe(1);
  expect(movedDown.items.map((item) => item.title)).toEqual(["b", "a"]);

  const movedUp = moveFavoriteItem(movedDown.items, movedDown.selectedIndex, "up");
  expect(movedUp.selectedIndex).toBe(0);
  expect(movedUp.items.map((item) => item.title)).toEqual(["a", "b"]);
});

it("moves favorites by drag and drop index", () => {
  const favoriteItems = [
    {
      faviconUrl: "a",
      title: "a",
      type: SEARCH_ITEM_TYPE.HISTORY,
      url: "https://a.test",
    },
    {
      faviconUrl: "b",
      title: "b",
      type: SEARCH_ITEM_TYPE.HISTORY,
      url: "https://b.test",
    },
    {
      faviconUrl: "c",
      title: "c",
      type: SEARCH_ITEM_TYPE.HISTORY,
      url: "https://c.test",
    },
  ];

  const moved = moveFavoriteItemToIndex(favoriteItems, 0, 2);
  expect(moved.selectedIndex).toBe(2);
  expect(moved.items.map((item) => item.title)).toEqual(["b", "c", "a"]);
});
