import { useLayoutEffect, useRef, useState } from 'react';

/** Tracks whether an element's text is currently clipped by `truncate` (scrollWidth > clientWidth). */
export function useIsTruncated<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // No dependency array: re-checks after every render (e.g. the name itself changed),
  // not just on mount/resize.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setIsTruncated(el.scrollWidth > el.clientWidth);
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setIsTruncated(el.scrollWidth > el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isTruncated };
}
