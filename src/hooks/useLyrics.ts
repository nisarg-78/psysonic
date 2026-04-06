import { useEffect, useState } from 'react';
import { fetchLyrics, parseLrc, LrcLine } from '../api/lrclib';
import { getLyricsBySongId, SubsonicStructuredLyrics } from '../api/subsonic';
import { useAuthStore } from '../store/authStore';
import type { Track } from '../store/playerStore';

export type LyricsSource = 'server' | 'lrclib';

export interface CachedLyrics {
  syncedLines: LrcLine[] | null;
  plainLyrics: string | null;
  source: LyricsSource | null;
  notFound: boolean;
}

// Session-level cache — survives tab switches and component unmount/remount.
export const lyricsCache = new Map<string, CachedLyrics>();

/** Convert structured Subsonic lyrics (ms timestamps) into LrcLine[] or plain text. */
export function parseStructuredLyrics(
  lyrics: SubsonicStructuredLyrics,
): Pick<CachedLyrics, 'syncedLines' | 'plainLyrics'> {
  if (lyrics.issynced && lyrics.line.length > 0) {
    const lines: LrcLine[] = lyrics.line
      .filter(l => l.start !== undefined)
      .map(l => ({ time: l.start! / 1000, text: l.value.trim() }))
      .sort((a, b) => a.time - b.time);
    if (lines.length > 0) return { syncedLines: lines, plainLyrics: null };
  }
  const plain = lyrics.line.map(l => l.value).join('\n').trim();
  return { syncedLines: null, plainLyrics: plain || null };
}

export interface UseLyricsResult {
  syncedLines: LrcLine[] | null;
  plainLyrics: string | null;
  source: LyricsSource | null;
  loading: boolean;
  notFound: boolean;
}

export function useLyrics(currentTrack: Track | null): UseLyricsResult {
  const cached = currentTrack ? lyricsCache.get(currentTrack.id) : undefined;
  const lyricsServerFirst = useAuthStore(s => s.lyricsServerFirst);

  const [loading, setLoading]         = useState(!cached && !!currentTrack);
  const [syncedLines, setSyncedLines] = useState<LrcLine[] | null>(cached?.syncedLines ?? null);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(cached?.plainLyrics ?? null);
  const [source, setSource]           = useState<LyricsSource | null>(cached?.source ?? null);
  const [notFound, setNotFound]       = useState(cached?.notFound ?? false);

  useEffect(() => {
    if (!currentTrack) return;

    const hit = lyricsCache.get(currentTrack.id);
    if (hit) {
      setSyncedLines(hit.syncedLines);
      setPlainLyrics(hit.plainLyrics);
      setSource(hit.source);
      setNotFound(hit.notFound);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setSyncedLines(null);
    setPlainLyrics(null);
    setSource(null);
    setNotFound(false);
    setLoading(true);

    const store = (entry: CachedLyrics) => {
      if (cancelled) return;
      lyricsCache.set(currentTrack.id, entry);
      setSyncedLines(entry.syncedLines);
      setPlainLyrics(entry.plainLyrics);
      setSource(entry.source);
      setNotFound(entry.notFound);
      setLoading(false);
    };

    const fetchServer = async (): Promise<boolean> => {
      const structured = await getLyricsBySongId(currentTrack.id);
      if (!structured) return false;
      const parsed = parseStructuredLyrics(structured);
      if (!parsed.syncedLines && !parsed.plainLyrics) return false;
      store({ ...parsed, source: 'server', notFound: false });
      return true;
    };

    const fetchLrclibFn = async (): Promise<boolean> => {
      try {
        const result = await fetchLyrics(
          currentTrack.artist ?? '',
          currentTrack.title,
          currentTrack.album ?? '',
          currentTrack.duration ?? 0,
        );
        if (!result || (!result.syncedLyrics && !result.plainLyrics)) return false;
        const lines = result.syncedLyrics ? parseLrc(result.syncedLyrics) : null;
        const synced = lines && lines.length > 0 ? lines : null;
        store({ syncedLines: synced, plainLyrics: result.plainLyrics, source: 'lrclib', notFound: false });
        return true;
      } catch {
        return false;
      }
    };

    (async () => {
      const [first, second] = lyricsServerFirst
        ? [fetchServer, fetchLrclibFn]
        : [fetchLrclibFn, fetchServer];

      if (cancelled) return;
      if (await first()) return;
      if (cancelled) return;
      if (await second()) return;
      if (!cancelled) store({ syncedLines: null, plainLyrics: null, source: null, notFound: true });
    })();

    return () => { cancelled = true; };
  }, [currentTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { syncedLines, plainLyrics, source, loading, notFound };
}
