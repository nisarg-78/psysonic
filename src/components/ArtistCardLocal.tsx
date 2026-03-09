import React from 'react';
import { SubsonicArtist, buildCoverArtUrl } from '../api/subsonic';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

interface Props {
  artist: SubsonicArtist;
}

export default function ArtistCardLocal({ artist }: Props) {
  const navigate = useNavigate();
  const coverId = artist.coverArt || artist.id;

  return (
    <div 
      className="artist-card"
      onClick={() => navigate(`/artist/${artist.id}`)}
    >
      <div className="artist-card-avatar" style={{ position: 'relative', overflow: 'hidden' }}>
        {coverId ? (
          <img 
            src={buildCoverArtUrl(coverId, 200)} 
            alt={artist.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.classList.add('fallback-visible');
            }}
          />
        ) : (
          <Users size={32} color="var(--text-muted)" />
        )}
      </div>
      <div className="artist-card-name" data-tooltip={artist.name}>
        {artist.name}
      </div>
      {typeof artist.albumCount === 'number' && (
        <div className="artist-card-meta">
          {artist.albumCount} {artist.albumCount === 1 ? 'Album' : 'Alben'}
        </div>
      )}
    </div>
  );
}
