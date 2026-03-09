import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getArtist, getArtistInfo, getTopSongs, getSimilarSongs2, SubsonicArtist, SubsonicAlbum, SubsonicSong, SubsonicArtistInfo, buildCoverArtUrl, star, unstar } from '../api/subsonic';
import AlbumCard from '../components/AlbumCard';
import { ArrowLeft, Users, ExternalLink, Star, Play, Shuffle, Radio } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';
import { usePlayerStore } from '../store/playerStore';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Inline Last.fm SVG icon
function LastfmIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.344 16.143l-.917-2.494s-1.485 1.662-3.716 1.662c-1.97 0-3.373-1.714-3.373-4.46 0-3.514 1.773-4.777 3.52-4.777 2.508 0 3.306 1.625 3.997 3.714l.918 2.88c.918 2.8 2.642 5.047 7.615 5.047 3.563 0 5.98-1.094 5.98-3.972 0-2.326-1.327-3.53-3.797-4.11l-1.836-.41c-1.27-.29-1.645-.82-1.645-1.693 0-.987.778-1.56 2.047-1.56 1.384 0 2.132.52 2.245 1.756l2.878-.347C24.883 5.116 23.3 4 20.5 4c-3.26 0-4.945 1.537-4.945 3.824 0 1.843.91 3.008 3.2 3.562l1.947.46c1.404.327 1.97.874 1.97 1.894 0 1.13-.988 1.593-2.948 1.593-2.858 0-4.052-1.497-4.742-3.634l-.943-2.887C13.22 6.162 11.73 4 7.897 4 3.847 4 1 6.61 1 11.022c0 4.235 2.617 6.638 6.19 6.638 2.566 0 4.154-1.517 4.154-1.517z"/>
    </svg>
  );
}

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<SubsonicArtist | null>(null);
  const [albums, setAlbums] = useState<SubsonicAlbum[]>([]);
  const [topSongs, setTopSongs] = useState<SubsonicSong[]>([]);
  const [info, setInfo] = useState<SubsonicArtistInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [radioLoading, setRadioLoading] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  
  const playTrack = usePlayerStore(state => state.playTrack);
  const enqueue = usePlayerStore(state => state.enqueue);
  const clearQueue = usePlayerStore(state => state.clearQueue);
  const openContextMenu = usePlayerStore(state => state.openContextMenu);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getArtist(id).then(artistData => {
      setArtist(artistData.artist);
      setAlbums(artistData.albums);
      setIsStarred(!!artistData.artist.starred);
      
      return Promise.all([
        getArtistInfo(id).catch(() => null),
        getTopSongs(artistData.artist.name).catch(() => [])
      ]);
    }).then(([artistInfo, songsData]) => {
      if (artistInfo !== undefined) setInfo(artistInfo as SubsonicArtistInfo | null);
      if (songsData !== undefined) setTopSongs(songsData as SubsonicSong[]);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  const openLink = (url: string) => open(url);

  const toggleStar = async () => {
    if (!artist) return;
    const currentlyStarred = isStarred;
    setIsStarred(!currentlyStarred); // Optimistic UI update
    try {
      if (currentlyStarred) {
        await unstar(artist.id, 'artist');
      } else {
        await star(artist.id, 'artist');
      }
    } catch (e) {
      console.error('Failed to toggle star', e);
      setIsStarred(currentlyStarred); // Revert on failure
    }
  };

  const handlePlayAll = () => {
    if (topSongs.length > 0) {
      clearQueue();
      playTrack(topSongs[0], topSongs);
    }
  };

  const handleShuffle = () => {
    if (topSongs.length > 0) {
      const shuffled = [...topSongs].sort(() => Math.random() - 0.5);
      clearQueue();
      playTrack(shuffled[0], shuffled);
    }
  };

  const handleStartRadio = async () => {
    if (!artist) return;
    setRadioLoading(true);
    try {
      const similar = await getSimilarSongs2(artist.id, 50);
      if (similar.length > 0) {
        clearQueue();
        playTrack(similar[0], similar);
      } else {
        alert("Keine ähnlichen Titel für diesen Künstler gefunden.");
      }
    } catch (e) {
      console.error("Radio start failed", e);
    } finally {
      setRadioLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="content-body" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="content-body">
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Künstler nicht gefunden.
        </div>
      </div>
    );
  }

  const coverId = artist.coverArt || artist.id;
  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(artist.name)}`;

  return (
    <div className="content-body animate-fade-in">
      <button
        className="btn btn-ghost"
        onClick={() => navigate(-1)}
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <ArrowLeft size={16} /> <span>Zurück</span>
      </button>

      {/* Header: avatar + name + meta + links */}
      <div className="artist-detail-header">
        <div className="artist-detail-avatar">
          {coverId ? (
            <img
              src={buildCoverArtUrl(coverId, 300)}
              alt={artist.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <Users size={64} color="var(--text-muted)" />
          )}
        </div>

        <div className="artist-detail-meta">
          <h1 className="page-title" style={{ fontSize: '3rem', marginBottom: '0.25rem' }}>
            {artist.name}
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '1rem' }}>
            {artist.albumCount} {artist.albumCount === 1 ? 'Album' : 'Alben'}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* External links */}
            {(info?.lastFmUrl || artist.name) && (
              <div className="artist-detail-links">
                {info?.lastFmUrl && (
                  <button className="artist-ext-link" onClick={() => openLink(info.lastFmUrl!)}>
                    <LastfmIcon size={14} />
                    Last.fm
                  </button>
                )}
                <button className="artist-ext-link" onClick={() => openLink(wikiUrl)}>
                  <ExternalLink size={14} />
                  Wikipedia
                </button>
              </div>
            )}
            
            {/* Star toggle */}
            <button 
              className="artist-ext-link" 
              onClick={toggleStar}
              data-tooltip={isStarred ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
              style={{ color: isStarred ? 'var(--accent)' : 'inherit', border: isStarred ? '1px solid var(--accent)' : undefined }}
            >
              <Star size={14} fill={isStarred ? "currentColor" : "none"} /> 
              {isStarred ? 'Favorit' : 'Als Favorit'}
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {topSongs.length > 0 && (
              <>
                <button className="btn btn-primary" onClick={handlePlayAll}>
                  <Play size={16} /> Alle abspielen
                </button>
                <button className="btn btn-surface" onClick={handleShuffle}>
                  <Shuffle size={16} /> Zufallswiedergabe
                </button>
              </>
            )}
            <button className="btn btn-surface" onClick={handleStartRadio} disabled={radioLoading}>
              {radioLoading ? <div className="spinner" style={{ width: 16, height: 16, borderTopColor: 'currentColor' }} /> : <Radio size={16} />}
              {radioLoading ? 'Lädt...' : 'Radio'}
            </button>
          </div>
        </div>
      </div>

      {/* Biography — only shown when available */}
      {info?.biography && (
        <div className="artist-bio-section">
          <div
            className="artist-bio-text"
            dangerouslySetInnerHTML={{ __html: info.biography }}
          />
        </div>
      )}

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: info?.biography ? '2rem' : '0', marginBottom: '1rem' }}>
            Beliebteste Titel
          </h2>
          <div className="tracklist" style={{ padding: 0, marginBottom: '2rem' }}>
            <div className="tracklist-header" style={{ gridTemplateColumns: '36px minmax(150px, 2fr) minmax(100px, 1fr) 60px' }}>
              <div style={{ textAlign: 'center' }}>#</div>
              <div>Titel</div>
              <div>Album</div>
              <div style={{ textAlign: 'right' }}>Dauer</div>
            </div>
            {topSongs.map((song, idx) => (
              <div
                key={song.id}
                className="track-row"
                style={{ gridTemplateColumns: '36px minmax(150px, 2fr) minmax(100px, 1fr) 60px' }}
                onDoubleClick={() => playTrack(song, topSongs)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const track = {
                    id: song.id, title: song.title, artist: song.artist, album: song.album,
                    albumId: song.albumId, duration: song.duration, coverArt: song.coverArt, track: song.track,
                    year: song.year, bitRate: song.bitRate, suffix: song.suffix, userRating: song.userRating,
                  };
                  openContextMenu(e.clientX, e.clientY, track, 'song');
                }}
              >
                <div className="track-num" style={{ textAlign: 'center' }}>
                  {idx + 1}
                </div>
                
                <div className="track-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {song.coverArt && (
                    <img 
                      src={buildCoverArtUrl(song.coverArt, 64)} 
                      alt={song.album} 
                      style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                    />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div className="track-title">{song.title}</div>
                  </div>
                </div>
                
                <div className="track-album truncate" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {song.album}
                </div>
                
                <div className="track-duration" style={{ textAlign: 'right' }}>
                  {formatDuration(song.duration)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Albums */}
      <h2 className="section-title" style={{ marginTop: (info?.biography || topSongs.length > 0) ? '2rem' : '0', marginBottom: '1rem' }}>
        Alben von {artist.name}
      </h2>

      {albums.length > 0 ? (
        <div className="album-grid-wrap">
          {albums.map(a => <AlbumCard key={a.id} album={a} />)}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>Keine Alben gefunden.</p>
      )}
    </div>
  );
}
