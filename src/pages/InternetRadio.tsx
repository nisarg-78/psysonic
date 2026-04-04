import React, { useEffect, useState, useRef } from 'react';
import { Cast, Plus, Trash2, X, Pencil, Check, Globe } from 'lucide-react';
import {
  getInternetRadioStations, createInternetRadioStation,
  updateInternetRadioStation, deleteInternetRadioStation,
  InternetRadioStation, buildCoverArtUrl, coverArtCacheKey,
} from '../api/subsonic';
import { usePlayerStore } from '../store/playerStore';
import CachedImage from '../components/CachedImage';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-shell';

export default function InternetRadio() {
  const { t } = useTranslation();
  const { playRadio, stop, currentRadio, isPlaying } = usePlayerStore();

  const [stations, setStations] = useState<InternetRadioStation[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [addHomepage, setAddHomepage] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const addNameRef = useRef<HTMLInputElement>(null);

  // Edit inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editHomepage, setEditHomepage] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    getInternetRadioStations()
      .then(setStations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (adding) addNameRef.current?.focus();
  }, [adding]);

  const reload = async () => {
    const list = await getInternetRadioStations().catch(() => [] as InternetRadioStation[]);
    setStations(list);
  };

  const handleAdd = async () => {
    if (!addName.trim() || !addUrl.trim()) return;
    setAddSaving(true);
    try {
      await createInternetRadioStation(addName.trim(), addUrl.trim(), addHomepage.trim() || undefined);
      await reload();
    } catch {}
    setAddSaving(false);
    setAdding(false);
    setAddName(''); setAddUrl(''); setAddHomepage('');
  };

  const handleEditStart = (s: InternetRadioStation) => {
    setEditId(s.id);
    setEditName(s.name);
    setEditUrl(s.streamUrl);
    setEditHomepage(s.homepageUrl ?? '');
    setDeleteConfirmId(null);
  };

  const handleEditSave = async () => {
    if (!editId || !editName.trim() || !editUrl.trim()) return;
    setEditSaving(true);
    try {
      await updateInternetRadioStation(editId, editName.trim(), editUrl.trim(), editHomepage.trim() || undefined);
      await reload();
    } catch {}
    setEditSaving(false);
    setEditId(null);
  };

  const handleDelete = async (e: React.MouseEvent, s: InternetRadioStation) => {
    e.stopPropagation();
    if (deleteConfirmId !== s.id) {
      setDeleteConfirmId(s.id);
      return;
    }
    if (currentRadio?.id === s.id) stop();
    try {
      await deleteInternetRadioStation(s.id);
      setStations(prev => prev.filter(st => st.id !== s.id));
    } catch {}
    setDeleteConfirmId(null);
  };

  const handlePlay = (e: React.MouseEvent, s: InternetRadioStation) => {
    e.stopPropagation();
    if (currentRadio?.id === s.id && isPlaying) {
      stop();
    } else {
      playRadio(s);
    }
  };

  if (loading) {
    return (
      <div className="content-body" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="content-body animate-fade-in">

      {/* ── Header ── */}
      <div className="playlists-header">
        <h1 className="page-title" style={{ marginBottom: 0 }}>{t('radio.title')}</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {adding ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                ref={addNameRef}
                className="input"
                style={{ width: 160 }}
                placeholder={t('radio.stationName')}
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setAddName(''); setAddUrl(''); setAddHomepage(''); } }}
              />
              <input
                className="input"
                style={{ width: 220 }}
                placeholder={t('radio.streamUrl')}
                value={addUrl}
                onChange={e => setAddUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setAddName(''); setAddUrl(''); setAddHomepage(''); } }}
              />
              <input
                className="input"
                style={{ width: 160 }}
                placeholder={t('radio.homepageUrl')}
                value={addHomepage}
                onChange={e => setAddHomepage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setAddName(''); setAddUrl(''); setAddHomepage(''); } }}
              />
              <button className="btn btn-primary" onClick={handleAdd} disabled={addSaving || !addName.trim() || !addUrl.trim()}>
                {addSaving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : t('radio.save')}
              </button>
              <button className="btn btn-surface" onClick={() => { setAdding(false); setAddName(''); setAddUrl(''); setAddHomepage(''); }}>
                {t('radio.cancel')}
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              <Plus size={15} /> {t('radio.addStation')}
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {stations.length === 0 ? (
        <div className="empty-state">{t('radio.empty')}</div>
      ) : (
        <div className="album-grid-wrap">
          {stations.map(s => {
            const isActive = currentRadio?.id === s.id;
            const isEditingThis = editId === s.id;

            return (
              <div
                key={s.id}
                className={`album-card${isActive ? ' radio-card-active' : ''}`}
                onMouseLeave={() => { if (deleteConfirmId === s.id) setDeleteConfirmId(null); }}
              >
                {/* Cover area */}
                <div className="album-card-cover">
                  {s.coverArt ? (
                    <CachedImage
                      src={buildCoverArtUrl(s.coverArt, 256)}
                      cacheKey={coverArtCacheKey(s.coverArt, 256)}
                      alt={s.name}
                      className="album-card-cover-img"
                    />
                  ) : (
                    <div className="album-card-cover-placeholder playlist-card-icon">
                      <Cast size={48} strokeWidth={1.2} />
                    </div>
                  )}

                  {/* LIVE badge on active station */}
                  {isActive && isPlaying && (
                    <div className="radio-live-overlay">
                      <span className="radio-live-badge">{t('radio.live')}</span>
                    </div>
                  )}

                  {/* Play overlay */}
                  <div className="album-card-play-overlay">
                    <button
                      className="album-card-details-btn"
                      onClick={e => handlePlay(e, s)}
                    >
                      {isActive && isPlaying
                        ? <X size={15} />
                        : <Cast size={14} />
                      }
                    </button>
                  </div>

                  {/* Delete button */}
                  <button
                    className={`playlist-card-delete ${deleteConfirmId === s.id ? 'playlist-card-delete--confirm' : ''}`}
                    onClick={e => handleDelete(e, s)}
                    data-tooltip={deleteConfirmId === s.id ? t('radio.confirmDelete') : t('radio.deleteStation')}
                    data-tooltip-pos="bottom"
                  >
                    {deleteConfirmId === s.id ? <Trash2 size={12} /> : <X size={12} />}
                  </button>
                </div>

                {/* Info / inline edit */}
                <div className="album-card-info" style={{ padding: '0.5rem 0.6rem 0.4rem' }}>
                  {isEditingThis ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <input
                        className="input"
                        style={{ fontSize: '0.78rem', padding: '0.25rem 0.4rem' }}
                        value={editName}
                        placeholder={t('radio.stationName')}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditId(null); }}
                        autoFocus
                      />
                      <input
                        className="input"
                        style={{ fontSize: '0.78rem', padding: '0.25rem 0.4rem' }}
                        value={editUrl}
                        placeholder={t('radio.streamUrl')}
                        onChange={e => setEditUrl(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditId(null); }}
                      />
                      <input
                        className="input"
                        style={{ fontSize: '0.78rem', padding: '0.25rem 0.4rem' }}
                        value={editHomepage}
                        placeholder={t('radio.homepageUrl')}
                        onChange={e => setEditHomepage(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditId(null); }}
                      />
                      <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.1rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1, padding: '0.2rem 0' }} onClick={handleEditSave} disabled={editSaving}>
                          {editSaving ? <span className="spinner" style={{ width: 10, height: 10 }} /> : <Check size={12} />}
                        </button>
                        <button className="btn btn-surface" style={{ flex: 1, padding: '0.2rem 0' }} onClick={() => setEditId(null)}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="album-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                        <button
                          className="player-btn player-btn-sm"
                          style={{ flexShrink: 0, opacity: 0.6 }}
                          onClick={() => handleEditStart(s)}
                          data-tooltip={t('radio.editStation')}
                        >
                          <Pencil size={11} />
                        </button>
                        {s.homepageUrl && (
                          <button
                            className="player-btn player-btn-sm"
                            style={{ flexShrink: 0, opacity: 0.6 }}
                            onClick={() => open(s.homepageUrl!)}
                            data-tooltip={t('radio.openHomepage')}
                          >
                            <Globe size={11} />
                          </button>
                        )}
                      </div>
                      <div className="album-card-artist" style={{ fontSize: '0.7rem', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.streamUrl}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
