import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlaylistStore {
  recentIds: string[];
  touchPlaylist: (id: string) => void;
  removeId: (id: string) => void;
}

export const usePlaylistStore = create<PlaylistStore>()(
  persist(
    (set) => ({
      recentIds: [],
      touchPlaylist: (id) =>
        set((s) => ({
          recentIds: [id, ...s.recentIds.filter((x) => x !== id)].slice(0, 50),
        })),
      removeId: (id) =>
        set((s) => ({ recentIds: s.recentIds.filter((x) => x !== id) })),
    }),
    { name: 'psysonic_playlists_recent' }
  )
);
