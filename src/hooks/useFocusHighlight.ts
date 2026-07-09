import { useEffect, useRef, useState } from 'react';

const HIGHLIGHT_DURATION_MS = 1500;

/**
 * Grabs real DOM focus + scrolls an element into view once, then flashes a highlight
 * flag briefly. Built for "the user just created/renamed this row, help them find it"
 * — but generic enough to reuse for any future "flash this newly-changed item" case.
 */
export function useFocusHighlight<T extends HTMLElement>(shouldFocus: boolean | undefined, onHandled?: () => void) {
  const ref = useRef<T>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  // Holds the fade-out timeout outside of React's effect-cleanup cycle: the caller typically
  // resets shouldFocus back to false right after this effect runs, and a cleanup tied to that
  // dependency would cancel the timeout before it ever fires.
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!shouldFocus) return;
    // Imperative DOM focus/scroll on demand, so the user can see and locate what they
    // just did. Not derivable from props/state, so an effect is the right tool here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHighlighted(true);
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    onHandled?.();
    clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setIsHighlighted(false), HIGHLIGHT_DURATION_MS);
  }, [shouldFocus, onHandled]);

  useEffect(() => () => clearTimeout(highlightTimerRef.current), []);

  return { ref, isHighlighted };
}
