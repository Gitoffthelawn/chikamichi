const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export const OPEN_STATS_CONFIG = {
  // Bound the learned-ranking history so storage stays small while preserving recent habits.
  limit: 500,
  storageKey: "chikamichi-open-stats",
} as const;

export const SEARCH_RANKING_CONFIG = {
  openStatsBoost: {
    // Frequency grows logarithmically so repeated opens help without overwhelming match quality.
    frequencyMax: 0.036,
    frequencyMultiplier: 0.012,
    // Keep the learned ranking as a tie-breaker so Fuse relevance still dominates.
    maxTotal: 0.06,
    // Recency fades out over roughly a month to avoid permanently pinning stale choices.
    recencyMax: 0.024,
    recencyWindowMs: ONE_DAY_MS * 30,
  },
  // Recent same-session hostnames should only nudge close matches, not override text relevance.
  recentHostnameBoost: 0.025,
  // Fuse scores are rounded before last-visit sorting; 100 keeps existing two-decimal grouping.
  scoreRoundingFactor: 100,
} as const;
