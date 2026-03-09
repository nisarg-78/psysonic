import React, { useEffect, useState, useCallback, useRef } from 'react';
import AlbumCard from '../components/AlbumCard';
import { getAlbumList, SubsonicAlbum } from '../api/subsonic';

export default function NewReleases() {
  const [albums, setAlbums] = useState<SubsonicAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  const observerTarget = useRef<HTMLDivElement>(null);

  const load = useCallback(async (offset: number, append = false) => {
    setLoading(true);
    try {
      const data = await getAlbumList('newest', PAGE_SIZE, offset);
      if (append) setAlbums(prev => [...prev, ...data]);
      else setAlbums(data);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setPage(0); load(0); }, [load]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    load(next * PAGE_SIZE, true);
  }, [loading, hasMore, page, load]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="content-body animate-fade-in">
      <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Neueste</h1>
      
      {loading && albums.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="album-grid-wrap">
            {albums.map(a => <AlbumCard key={a.id} album={a} />)}
          </div>
          
          <div ref={observerTarget} style={{ height: '20px', margin: '2rem 0', display: 'flex', justifyContent: 'center' }}>
            {loading && hasMore && <div className="spinner" style={{ width: 20, height: 20 }} />}
          </div>
        </>
      )}
    </div>
  );
}
