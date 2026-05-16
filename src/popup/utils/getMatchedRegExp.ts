function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function getMatchedRegExp(text: string, indices: [number, number][]) {
  return new RegExp(
    Array.from(
      new Set(indices.map(([start, end]) => escapeRegExp(text.substring(start, end + 1)))),
    ).join("|"),
    "u",
  );
}
