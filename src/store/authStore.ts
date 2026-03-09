import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ConnectionMode = 'local' | 'external';

interface AuthState {
  // Server config
  serverName: string;
  lanIp: string;
  externalUrl: string;
  username: string;
  password: string; // stored encrypted via plugin-store
  activeConnection: ConnectionMode;

  // Last.fm
  lastfmApiKey: string;
  lastfmApiSecret: string;
  lastfmSessionKey: string;
  lastfmUsername: string;

  // Settings
  minimizeToTray: boolean;
  scrobblingEnabled: boolean;
  maxCacheMb: number;
  downloadFolder: string;

  // Status
  isLoggedIn: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Actions
  setCredentials: (data: {
    serverName: string;
    lanIp: string;
    externalUrl: string;
    username: string;
    password: string;
  }) => void;
  setActiveConnection: (mode: ConnectionMode) => void;
  toggleConnection: () => void;
  setLoggedIn: (v: boolean) => void;
  setConnecting: (v: boolean) => void;
  setConnectionError: (e: string | null) => void;
  setLastfm: (apiKey: string, apiSecret: string, sessionKey: string, username: string) => void;
  setMinimizeToTray: (v: boolean) => void;
  setScrobblingEnabled: (v: boolean) => void;
  setMaxCacheMb: (v: number) => void;
  setDownloadFolder: (v: string) => void;
  logout: () => void;

  // Derived
  getBaseUrl: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      serverName: '',
      lanIp: '',
      externalUrl: '',
      username: '',
      password: '',
      activeConnection: 'local',
      lastfmApiKey: '',
      lastfmApiSecret: '',
      lastfmSessionKey: '',
      lastfmUsername: '',
      minimizeToTray: false,
      scrobblingEnabled: true,
      maxCacheMb: 500,
      downloadFolder: '',
      isLoggedIn: false,
      isConnecting: false,
      connectionError: null,

      setCredentials: (data) => set({ ...data, connectionError: null }),

      setActiveConnection: (mode) => set({ activeConnection: mode }),

      toggleConnection: () =>
        set(s => ({ activeConnection: s.activeConnection === 'local' ? 'external' : 'local' })),

      setLoggedIn: (v) => set({ isLoggedIn: v }),
      setConnecting: (v) => set({ isConnecting: v }),
      setConnectionError: (e) => set({ connectionError: e }),

      setLastfm: (apiKey, apiSecret, sessionKey, username) =>
        set({ lastfmApiKey: apiKey, lastfmApiSecret: apiSecret, lastfmSessionKey: sessionKey, lastfmUsername: username }),

      setMinimizeToTray: (v) => set({ minimizeToTray: v }),
      setScrobblingEnabled: (v) => set({ scrobblingEnabled: v }),
      setMaxCacheMb: (v) => set({ maxCacheMb: v }),
      setDownloadFolder: (v) => set({ downloadFolder: v }),

      logout: () => set({
        isLoggedIn: false,
        username: '',
        password: '',
        lastfmSessionKey: '',
        lastfmUsername: '',
      }),

      getBaseUrl: () => {
        const s = get();
        if (s.activeConnection === 'local') {
          return s.lanIp.startsWith('http') ? s.lanIp : `http://${s.lanIp}`;
        }
        return s.externalUrl.startsWith('http') ? s.externalUrl : `https://${s.externalUrl}`;
      },
    }),
    {
      name: 'psysonic-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
