import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English Translations
const enTranslation = {
  sidebar: {
    library: 'Library',
    mainstage: 'Mainstage',
    newReleases: 'New Releases',
    allAlbums: 'All Albums',
    artists: 'Artists',
    playlists: 'Playlists',
    randomMix: 'Random Mix',
    favorites: 'Favorites',
    system: 'System',
    statistics: 'Statistics',
    settings: 'Settings',
    expand: 'Expand Sidebar',
    collapse: 'Collapse Sidebar'
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    languageEn: 'English',
    languageDe: 'German',
    theme: 'Theme',
    appearance: 'Appearance',
    connection: 'Connection',
    lanIp: 'LAN IP',
    externalUrl: 'External URL',
    testBtn: 'Test Connection',
    testingBtn: 'Testing…',
    connected: 'Connected',
    failed: 'Failed',
    activeConn: 'Active Connection',
    activeServer: 'Currently used server:',
    connLocal: 'Local (LAN)',
    connExternal: 'External (Internet)',
    lfmTitle: 'Last.fm Scrobbling',
    lfmDesc1: 'Psysonic supports server-side scrobbling directly via Navidrome. To link Last.fm, please log in once via the <strong>Navidrome Webplayer</strong> in your browser, go to your profile, and connect your Last.fm account.',
    lfmDesc2: 'Once that is done, Psysonic automatically forwards your currently playing songs to Navidrome, and they will appear on Last.fm.',
    scrobbleEnabled: 'Scrobbling enabled',
    scrobbleDesc: 'Send songs to Last.fm after 50% playtime',
    behavior: 'App Behavior',
    trayTitle: 'Minimize to Tray',
    trayDesc: 'Minimize app to the system tray on close (X)',
    cacheTitle: 'Max. Cache Size',
    cacheDesc: 'For preloaded tracks',
    downloadsTitle: 'Download Folder',
    downloadsDefault: 'Default Downloads Folder',
    pickFolder: 'Select',
    pickFolderTitle: 'Select Download Folder',
    logout: 'Logout'
  },
  queue: {
    title: 'Queue',
    savePlaylist: 'Save Playlist',
    playlistName: 'Playlist Name',
    cancel: 'Cancel',
    save: 'Save',
    loadPlaylist: 'Load Playlist',
    loading: 'Loading...',
    noPlaylists: 'No playlists found.',
    load: 'Load',
    delete: 'Delete',
    deleteConfirm: 'Delete playlist "{{name}}"?',
    clear: 'Clear',
    hide: 'Hide',
    close: 'Close',
    nextTracks: 'Next Tracks',
    emptyQueue: 'The queue is empty.'
  },
  player: {
    regionLabel: 'Music Player',
    openFullscreen: 'Open Fullscreen Player',
    noTitle: 'No Title',
    stop: 'Stop',
    prev: 'Previous Track',
    play: 'Play',
    pause: 'Pause',
    next: 'Next Track',
    repeat: 'Repeat',
    repeatOff: 'Off',
    repeatAll: 'All',
    repeatOne: 'One',
    progress: 'Song Progress',
    volume: 'Volume',
    toggleQueue: 'Toggle Queue'
  }
};

// German Translations
const deTranslation = {
  sidebar: {
    library: 'Bibliothek',
    mainstage: 'Mainstage',
    newReleases: 'Neueste',
    allAlbums: 'Alle Alben',
    artists: 'Künstler',
    playlists: 'Playlists',
    randomMix: 'Zufallsmix',
    favorites: 'Favoriten',
    system: 'System',
    statistics: 'Statistiken',
    settings: 'Einstellungen',
    expand: 'Sidebar einblenden',
    collapse: 'Sidebar ausblenden'
  },
  settings: {
    title: 'Einstellungen',
    language: 'Sprache',
    languageEn: 'Englisch',
    languageDe: 'Deutsch',
    theme: 'Design',
    appearance: 'Darstellung',
    connection: 'Verbindung',
    lanIp: 'LAN-IP',
    externalUrl: 'Externe URL',
    testBtn: 'Verbindung testen',
    testingBtn: 'Teste…',
    connected: 'Verbunden',
    failed: 'Fehlgeschlagen',
    activeConn: 'Aktive Verbindung',
    activeServer: 'Aktuell verwendeter Server:',
    connLocal: 'Lokal (LAN)',
    connExternal: 'Extern (Internet)',
    lfmTitle: 'Last.fm Scrobbling',
    lfmDesc1: 'Psysonic unterstützt serverseitiges Scrobbling direkt über Navidrome. Um Last.fm zu verknüpfen, logge dich bitte einmalig über den <strong>Navidrome Webplayer</strong> im Browser ein, gehe auf dein Profil und verbinde deinen Last.fm Account.',
    lfmDesc2: 'Sobald das erledigt ist, leitet Psysonic deine aktuell gespielten Songs automatisch an Navidrome weiter, und diese erscheinen auf Last.fm.',
    scrobbleEnabled: 'Scrobbling aktiviert',
    scrobbleDesc: 'Songs nach 50% Laufzeit an Last.fm senden',
    behavior: 'App-Verhalten',
    trayTitle: 'In Tray minimieren',
    trayDesc: 'App beim Schließen (X) in den System-Tray minimieren',
    cacheTitle: 'Max. Cache-Größe',
    cacheDesc: 'Für vorgeladene Tracks',
    downloadsTitle: 'Download-Ordner',
    downloadsDefault: 'Standard-Downloads-Ordner',
    pickFolder: 'Auswählen',
    pickFolderTitle: 'Download-Ordner auswählen',
    logout: 'Abmelden'
  },
  queue: {
    title: 'Warteschlange',
    savePlaylist: 'Playlist speichern',
    playlistName: 'Name der Playlist',
    cancel: 'Abbrechen',
    save: 'Speichern',
    loadPlaylist: 'Playlist laden',
    loading: 'Lade...',
    noPlaylists: 'Keine Playlists gefunden.',
    load: 'Laden',
    delete: 'Löschen',
    deleteConfirm: 'Playlist "{{name}}" löschen?',
    clear: 'Leeren',
    hide: 'Verbergen',
    close: 'Schließen',
    nextTracks: 'Nächste Titel',
    emptyQueue: 'Die Warteschlange ist leer.'
  },
  player: {
    regionLabel: 'Musikplayer',
    openFullscreen: 'Vollbild-Player öffnen',
    noTitle: 'Kein Titel',
    stop: 'Stop',
    prev: 'Vorheriger Titel',
    play: 'Play',
    pause: 'Pause',
    next: 'Nächster Titel',
    repeat: 'Wiederholen',
    repeatOff: 'Aus',
    repeatAll: 'Alle',
    repeatOne: 'Einen',
    progress: 'Songfortschritt',
    volume: 'Lautstärke',
    toggleQueue: 'Warteschlange umschalten'
  }
};

// Retrieve language from local storage or default to 'en'
const savedLanguage = localStorage.getItem('psysonic_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      de: { translation: deTranslation }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

// Setup listener to persist language changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('psysonic_language', lng);
});

export default i18n;
