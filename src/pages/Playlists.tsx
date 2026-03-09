import React, { useEffect, useState } from 'react';
import { SubsonicPlaylist, getPlaylists, getPlaylist, deletePlaylist } from '../api/subsonic';
import { usePlayerStore } from '../store/playerStore';
import { ListMusic, Play, Trash2 } from 'lucide-react';

export default function Playlists() {
  const [playlists, setPlaylists] = useState<SubsonicPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  
  const playTrack = usePlayerStore(s => s.playTrack);
  const clearQueue = usePlayerStore(s => s.clearQueue);

  const fetchPlaylists = () => {
    setLoading(true);
    getPlaylists()
      .then(data => {
        setPlaylists(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load playlists', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handlePlay = async (id: string) => {
    try {
      const data = await getPlaylist(id);
      const tracks = data.songs.map((s: any) => ({
        id: s.id, title: s.title, artist: s.artist, album: s.album,
        albumId: s.albumId, duration: s.duration, coverArt: s.coverArt, track: s.track,
        year: s.year, bitRate: s.bitRate, suffix: s.suffix, userRating: s.userRating,
      }));
      if (tracks.length > 0) {
        clearQueue();
        playTrack(tracks[0], tracks);
      }
    } catch (e) {
      console.error('Failed to play playlist', e);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Playlist "${name}" wirklich löschen?`)) {
      try {
        await deletePlaylist(id);
        fetchPlaylists();
      } catch (e) {
        console.error('Failed to delete playlist', e);
      }
    }
  };

  return (
    <div className="content-body animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <ListMusic size={32} style={{ color: 'var(--accent)' }} />
        <h1 className="page-title" style={{ margin: 0 }}>Playlists</h1>
      </div>

      {loading ? (
        <div className="empty-state">Lade Playlists...</div>
      ) : playlists.length === 0 ? (
        <div className="empty-state">
          Keine Playlists gefunden.<br/>
          Nutze die Warteschlange, um Playlists zu erstellen.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {playlists.map(p => (
            <div 
              key={p.id} 
              style={{
                background: 'var(--surface0)',
                borderRadius: '12px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                border: '1px solid var(--surface1)',
                transition: 'all 0.2s ease'
              }}
              className="hover-card"
            >
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.25rem 0', color: 'var(--text)' }} className="truncate">
                  {p.name}
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--subtext0)' }}>
                  {p.songCount} {p.songCount === 1 ? 'Track' : 'Tracks'} • {Math.floor(p.duration / 60)} Min.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handlePlay(p.id)}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Play size={16} fill="currentColor" /> Abspielen
                </button>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => handleDelete(p.id, p.name)}
                  data-tooltip="Löschen"
                  style={{ width: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--red)' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
