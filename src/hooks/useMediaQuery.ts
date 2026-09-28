import { useState, useEffect } from 'react';

/**
 * useMediaQuery hook for responsive behavior (e.g. mobile bottom-sheet vs desktop dialog).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);

    // Initial check
    setMatches(media.matches);

    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      // Legacy fallback
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [query]);

  return matches;
}

export default useMediaQuery;
