import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

const FEEDBACK_FADE_DURATION_MS = 200;

export function useFeedbackBadge() {
  const [badgeText, setBadgeText] = useState("");
  const [badgeVisible, setBadgeVisible] = useState(false);
  const badgeTimerRef = useRef<number | null>(null);
  const badgeClearTimerRef = useRef<number | null>(null);

  const showBadge = useCallback(async (text: string, duration = 1600) => {
    if (badgeTimerRef.current !== null) {
      window.clearTimeout(badgeTimerRef.current);
    }
    if (badgeClearTimerRef.current !== null) {
      window.clearTimeout(badgeClearTimerRef.current);
    }

    flushSync(() => {
      setBadgeText(text);
      setBadgeVisible(true);
    });

    await new Promise<void>((resolve) => {
      badgeTimerRef.current = window.setTimeout(() => {
        resolve();
      }, duration);
    });

    setBadgeVisible(false);
    badgeClearTimerRef.current = window.setTimeout(() => {
      setBadgeText("");
      badgeClearTimerRef.current = null;
    }, FEEDBACK_FADE_DURATION_MS);
  }, []);

  const clearBadge = useCallback(() => {
    if (badgeTimerRef.current !== null) {
      window.clearTimeout(badgeTimerRef.current);
      badgeTimerRef.current = null;
    }
    if (badgeClearTimerRef.current !== null) {
      window.clearTimeout(badgeClearTimerRef.current);
      badgeClearTimerRef.current = null;
    }

    setBadgeVisible(false);
    setBadgeText("");
  }, []);

  useEffect(
    () => () => {
      if (badgeTimerRef.current !== null) {
        window.clearTimeout(badgeTimerRef.current);
      }
      if (badgeClearTimerRef.current !== null) {
        window.clearTimeout(badgeClearTimerRef.current);
      }
    },
    [],
  );

  return {
    badgeText,
    badgeVisible,
    clearBadge,
    showBadge,
  };
}
