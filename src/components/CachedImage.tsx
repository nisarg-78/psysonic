import React, { useEffect, useState } from 'react';
import { getCachedUrl } from '../utils/imageCache';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  cacheKey: string;
}

/**
 * @param fallbackToFetch  If true (default), returns the raw fetchUrl while the
 *   blob is still resolving — useful for <img> tags so the browser starts
 *   loading immediately.  Pass false for CSS background-image consumers that
 *   should only see a stable blob URL (prevents a double crossfade).
 */
export function useCachedUrl(fetchUrl: string, cacheKey: string, fallbackToFetch = true): string {
  const [resolved, setResolved] = useState('');
  useEffect(() => {
    if (!fetchUrl) { setResolved(''); return; }
    let cancelled = false;
    setResolved('');
    getCachedUrl(fetchUrl, cacheKey).then(url => { if (!cancelled) setResolved(url); });
    return () => { cancelled = true; };
  }, [fetchUrl, cacheKey]);
  return fallbackToFetch ? (resolved || fetchUrl) : resolved;
}

export default function CachedImage({ src, cacheKey, style, onLoad, ...props }: CachedImageProps) {
  const resolvedSrc = useCachedUrl(src, cacheKey);
  const [loaded, setLoaded] = useState(false);

  // Reset only when the logical image changes (cacheKey), not on fetchUrl→blobUrl
  // URL upgrades within the same image — avoids the end-of-load flash.
  useEffect(() => {
    setLoaded(false);
  }, [cacheKey]);

  return (
    <img
      src={resolvedSrc}
      style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity 0.15s ease' }}
      onLoad={e => { setLoaded(true); onLoad?.(e); }}
      {...props}
    />
  );
}
