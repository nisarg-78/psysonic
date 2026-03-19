use std::io::Cursor;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::time::{Duration, Instant};

use biquad::{Biquad, Coefficients, DirectForm2Transposed, ToHertz, Type as FilterType};
use rodio::{Decoder, Sink, Source};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

// ─── 10-Band Graphic Equalizer ────────────────────────────────────────────────

const EQ_BANDS_HZ: [f32; 10] = [31.0, 62.0, 125.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0, 16000.0];
const EQ_Q: f32 = 1.41;
const EQ_CHECK_INTERVAL: usize = 1024;

struct EqSource<S: Source<Item = f32>> {
    inner: S,
    sample_rate: u32,
    channels: u16,
    gains: Arc<[AtomicU32; 10]>,
    enabled: Arc<AtomicBool>,
    filters: [[DirectForm2Transposed<f32>; 2]; 10],
    current_gains: [f32; 10],
    sample_counter: usize,
    channel_idx: usize,
}

impl<S: Source<Item = f32>> EqSource<S> {
    fn new(inner: S, gains: Arc<[AtomicU32; 10]>, enabled: Arc<AtomicBool>) -> Self {
        let sample_rate = inner.sample_rate();
        let channels = inner.channels();
        let filters = std::array::from_fn(|band| {
            let freq = EQ_BANDS_HZ[band].clamp(20.0, (sample_rate as f32 / 2.0) - 100.0);
            std::array::from_fn(|_| {
                let coeffs = Coefficients::<f32>::from_params(
                    FilterType::PeakingEQ(0.0),
                    (sample_rate as f32).hz(),
                    freq.hz(),
                    EQ_Q,
                ).unwrap_or_else(|_| Coefficients::<f32>::from_params(
                    FilterType::PeakingEQ(0.0),
                    (sample_rate as f32).hz(),
                    1000.0f32.hz(),
                    EQ_Q,
                ).unwrap());
                DirectForm2Transposed::<f32>::new(coeffs)
            })
        });
        Self {
            inner, sample_rate, channels, gains, enabled,
            filters,
            current_gains: [0.0; 10],
            sample_counter: 0,
            channel_idx: 0,
        }
    }

    fn refresh_if_needed(&mut self) {
        for band in 0..10 {
            let gain_db = f32::from_bits(self.gains[band].load(Ordering::Relaxed));
            if (gain_db - self.current_gains[band]).abs() > 0.01 {
                self.current_gains[band] = gain_db;
                let freq = EQ_BANDS_HZ[band].clamp(20.0, (self.sample_rate as f32 / 2.0) - 100.0);
                if let Ok(coeffs) = Coefficients::<f32>::from_params(
                    FilterType::PeakingEQ(gain_db),
                    (self.sample_rate as f32).hz(),
                    freq.hz(),
                    EQ_Q,
                ) {
                    for ch in 0..2 {
                        self.filters[band][ch].update_coefficients(coeffs);
                    }
                }
            }
        }
    }
}

impl<S: Source<Item = f32>> Iterator for EqSource<S> {
    type Item = f32;

    fn next(&mut self) -> Option<f32> {
        let sample = self.inner.next()?;

        if self.sample_counter % EQ_CHECK_INTERVAL == 0 {
            self.refresh_if_needed();
        }
        self.sample_counter = self.sample_counter.wrapping_add(1);

        if !self.enabled.load(Ordering::Relaxed) {
            self.channel_idx = (self.channel_idx + 1) % self.channels as usize;
            return Some(sample);
        }

        let ch = self.channel_idx.min(1);
        self.channel_idx = (self.channel_idx + 1) % self.channels as usize;

        let mut s = sample;
        for band in 0..10 {
            s = self.filters[band][ch].run(s);
        }
        Some(s.clamp(-1.0, 1.0))
    }
}

impl<S: Source<Item = f32>> Source for EqSource<S> {
    fn current_frame_len(&self) -> Option<usize> { self.inner.current_frame_len() }
    fn channels(&self) -> u16 { self.channels }
    fn sample_rate(&self) -> u32 { self.sample_rate }
    fn total_duration(&self) -> Option<Duration> { self.inner.total_duration() }

    fn try_seek(&mut self, pos: Duration) -> Result<(), rodio::source::SeekError> {
        // Reset biquad filter state to avoid glitches/clicks after seek.
        for band in 0..10 {
            let gain_db = f32::from_bits(self.gains[band].load(Ordering::Relaxed));
            self.current_gains[band] = gain_db;
            let freq = EQ_BANDS_HZ[band].clamp(20.0, (self.sample_rate as f32 / 2.0) - 100.0);
            if let Ok(coeffs) = Coefficients::<f32>::from_params(
                FilterType::PeakingEQ(gain_db),
                (self.sample_rate as f32).hz(),
                freq.hz(),
                EQ_Q,
            ) {
                for ch in 0..2 {
                    self.filters[band][ch] = DirectForm2Transposed::<f32>::new(coeffs);
                }
            }
        }
        self.channel_idx = 0;
        self.sample_counter = 0;
        self.inner.try_seek(pos)
    }
}

// ─── Debug logger ─────────────────────────────────────────────────────────────

// ─── Engine state (registered as Tauri managed state) ────────────────────────

pub(crate) struct PreloadedTrack {
    url: String,
    data: Vec<u8>,
    duration_hint: f64,
}

pub struct AudioEngine {
    pub stream_handle: Arc<rodio::OutputStreamHandle>,
    pub current: Arc<Mutex<AudioCurrent>>,
    /// Monotonically incremented on each audio_play / audio_stop call.
    /// The background progress task captures its own `gen` at creation and
    /// bails out if this counter has moved on, preventing stale events.
    pub generation: Arc<AtomicU64>,
    pub http_client: reqwest::Client,
    pub eq_gains: Arc<[AtomicU32; 10]>,
    pub eq_enabled: Arc<AtomicBool>,
    pub preloaded: Arc<Mutex<Option<PreloadedTrack>>>,
    pub crossfade_enabled: Arc<AtomicBool>,
    pub crossfade_secs: Arc<AtomicU32>,  // f32 stored as bits
    pub fading_out_sink: Arc<Mutex<Option<Sink>>>,
}

pub struct AudioCurrent {
    /// The active rodio Sink. `None` when stopped.
    pub sink: Option<Sink>,
    pub duration_secs: f64,
    /// Position (seconds) that we seeked/resumed from.
    pub seek_offset: f64,
    /// Instant when we started counting from seek_offset (None when paused/stopped).
    pub play_started: Option<Instant>,
    /// Set when paused; holds the position at pause time.
    pub paused_at: Option<f64>,
    pub replay_gain_linear: f32,
    pub base_volume: f32,
}

impl AudioCurrent {
    pub fn position(&self) -> f64 {
        if let Some(p) = self.paused_at {
            return p;
        }
        if let Some(t) = self.play_started {
            let elapsed = t.elapsed().as_secs_f64();
            (self.seek_offset + elapsed).min(self.duration_secs.max(0.001))
        } else {
            self.seek_offset
        }
    }
}

/// Initialise the audio engine. Spawns a dedicated thread that holds the
/// `OutputStream` alive for the lifetime of the process (parking prevents
/// the thread — and thus the stream — from being dropped).
pub fn create_engine() -> (AudioEngine, std::thread::JoinHandle<()>) {
    let (tx, rx) = std::sync::mpsc::sync_channel::<rodio::OutputStreamHandle>(0);

    let thread = std::thread::Builder::new()
        .name("psysonic-audio-stream".into())
        .spawn(move || match rodio::OutputStream::try_default() {
            Ok((_stream, handle)) => {
                tx.send(handle).ok();
                // Park forever — `_stream` must stay alive for audio to work.
                loop {
                    std::thread::park();
                }
            }
            Err(e) => {
                eprintln!("[psysonic] audio output error: {e}");
            }
        })
        .expect("spawn audio stream thread");

    let stream_handle = rx.recv().expect("audio stream handle");

    let engine = AudioEngine {
        stream_handle: Arc::new(stream_handle),
        current: Arc::new(Mutex::new(AudioCurrent {
            sink: None,
            duration_secs: 0.0,
            seek_offset: 0.0,
            play_started: None,
            paused_at: None,
            replay_gain_linear: 1.0,
            base_volume: 0.8,
        })),
        generation: Arc::new(AtomicU64::new(0)),
        http_client: reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_default(),
        eq_gains: Arc::new(std::array::from_fn(|_| AtomicU32::new(0f32.to_bits()))),
        eq_enabled: Arc::new(AtomicBool::new(false)),
        preloaded: Arc::new(Mutex::new(None)),
        crossfade_enabled: Arc::new(AtomicBool::new(false)),
        crossfade_secs: Arc::new(AtomicU32::new(3.0f32.to_bits())),
        fading_out_sink: Arc::new(Mutex::new(None)),
    };

    (engine, thread)
}

// ─── Event payloads ───────────────────────────────────────────────────────────

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub current_time: f64,
    pub duration: f64,
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/// Download and play the given URL. Replaces any currently playing track.
/// Emits `audio:playing` (with duration as f64) once playback starts,
/// then `audio:progress` every 500 ms, and `audio:ended` when done.
#[tauri::command]
pub async fn audio_play(
    url: String,
    volume: f32,
    duration_hint: f64,
    replay_gain_db: Option<f32>,
    replay_gain_peak: Option<f32>,
    app: AppHandle,
    state: State<'_, AudioEngine>,
) -> Result<(), String> {
    // Claim this generation — any in-flight progress task with the old gen will exit.
    let gen = state.generation.fetch_add(1, Ordering::SeqCst) + 1;

    // Stop any previous fading sink unconditionally.
    {
        let mut fo = state.fading_out_sink.lock().unwrap();
        if let Some(old) = fo.take() {
            old.stop();
        }
    }

    // NOTE: We intentionally do NOT stop the current Sink here.
    // The old Sink keeps playing while we download + decode the new track.
    // We swap Sinks atomically only after the new data is ready, so the
    // old track plays to completion (or as close to it as possible).

    // ── Check preload cache or download ──────────────────────────────────────
    let data: Vec<u8> = {
        let cached = {
            let mut preloaded = state.preloaded.lock().unwrap();
            if let Some(p) = preloaded.as_ref().filter(|p| p.url == url) {
                let d = p.data.clone();
                let _ = p.duration_hint; // used for type check
                *preloaded = None;
                Some(d)
            } else {
                None
            }
        };
        if let Some(cached_data) = cached {
            cached_data
        } else {
            let response = state
                .http_client
                .get(&url)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if !response.status().is_success() {
                let status = response.status().as_u16();
                if state.generation.load(Ordering::SeqCst) != gen {
                    return Ok(());
                }
                let msg = format!("HTTP {status}");
                app.emit("audio:error", &msg).ok();
                return Err(msg);
            }
            response.bytes().await.map_err(|e| e.to_string())?.into()
        }
    };

    // Bail if superseded while downloading.
    if state.generation.load(Ordering::SeqCst) != gen {
        return Ok(());
    }

    // ── Decode ────────────────────────────────────────────────────────────────

    // Trust the Subsonic API duration_hint as the primary source.
    // Decoder::total_duration() is unreliable for VBR MP3 (symphonia may
    // return a single-frame or header duration that is far too short).
    let decoder_duration = {
        let cursor = Cursor::new(data.clone());
        Decoder::new(cursor)
            .ok()
            .and_then(|d| d.total_duration())
            .map(|d| d.as_secs_f64())
    };
    let duration_secs = if duration_hint > 1.0 {
        duration_hint
    } else {
        decoder_duration.unwrap_or(duration_hint)
    };

    let cursor = Cursor::new(data);
    let decoder = Decoder::new(cursor).map_err(|e| {
        app.emit("audio:error", e.to_string()).ok();
        e.to_string()
    })?;

    // Final generation check before committing.
    if state.generation.load(Ordering::SeqCst) != gen {
        return Ok(());
    }

    // ── Compute replay gain ───────────────────────────────────────────────────
    let gain_linear: f32 = replay_gain_db
        .map(|db| 10f32.powf(db / 20.0))
        .unwrap_or(1.0);
    let peak = replay_gain_peak.unwrap_or(1.0).max(0.001);
    // Limit gain so peak sample doesn't exceed 1.0 (prevent clipping).
    let gain_linear = gain_linear.min(1.0 / peak);
    let effective_volume = (volume.clamp(0.0, 1.0) * gain_linear).clamp(0.0, 1.0);

    // ── Create new sink ───────────────────────────────────────────────────────
    let crossfade_enabled = state.crossfade_enabled.load(Ordering::Relaxed);
    let crossfade_secs_val = f32::from_bits(state.crossfade_secs.load(Ordering::Relaxed)).clamp(0.5, 12.0);

    let sink = Sink::try_new(&*state.stream_handle).map_err(|e| e.to_string())?;
    sink.set_volume(effective_volume);
    let eq_source = EqSource::new(
        decoder.convert_samples::<f32>(),
        state.eq_gains.clone(),
        state.eq_enabled.clone(),
    );
    sink.append(eq_source);

    // Atomically swap sinks: take old one, install new one.
    // Capture old volume so the crossfade fade-out starts at the right level.
    let (old_sink, old_vol) = {
        let mut cur = state.current.lock().unwrap();
        let old_vol = (cur.base_volume * cur.replay_gain_linear).clamp(0.0, 1.0);
        let old = cur.sink.take();
        cur.sink = Some(sink);
        cur.duration_secs = duration_secs;
        cur.seek_offset = 0.0;
        cur.play_started = Some(Instant::now());
        cur.paused_at = None;
        cur.replay_gain_linear = gain_linear;
        cur.base_volume = volume.clamp(0.0, 1.0);
        (old, old_vol)
    };

    // Handle old sink: crossfade fade-out or immediate stop.
    // The new track is already playing; the old sink runs in parallel during a crossfade.
    if crossfade_enabled {
        if let Some(old) = old_sink {
            // Park the old sink in fading_out_sink so a subsequent audio_play can cancel it.
            *state.fading_out_sink.lock().unwrap() = Some(old);
            let fo_arc = state.fading_out_sink.clone();
            tokio::spawn(async move {
                let steps: u32 = 30;
                let step_ms = ((crossfade_secs_val * 1000.0) / steps as f32) as u64;
                for i in (0..=steps).rev() {
                    {
                        let fo = fo_arc.lock().unwrap();
                        match fo.as_ref() {
                            Some(s) => s.set_volume(old_vol * (i as f32 / steps as f32)),
                            None => return, // cancelled by a subsequent audio_play
                        }
                    }
                    tokio::time::sleep(Duration::from_millis(step_ms)).await;
                }
                if let Some(s) = fo_arc.lock().unwrap().take() {
                    s.stop();
                }
            });
        }
    } else if let Some(old) = old_sink {
        old.stop();
    }

    app.emit("audio:playing", duration_secs).ok();

    // ── Progress + ended detection ────────────────────────────────────────────
    // We do NOT use `sink.empty()` because in rodio 0.19 the source moves from
    // the pending queue to the active state almost immediately after `append()`,
    // making `empty()` return `true` within milliseconds even for long tracks.
    //
    // Instead we use the wall-clock position (seek_offset + elapsed).
    // `AudioCurrent::position()` is clamped to `duration_secs`, so once it
    // reaches the end it stays there. We fire `audio:ended` after two
    // consecutive ticks where position >= duration - threshold, where threshold
    // is extended to crossfade_secs when crossfade is enabled so the frontend
    // gets time to start the next track during the fade.
    let gen_counter = state.generation.clone();
    let current_arc = state.current.clone();
    let app_clone = app.clone();
    let crossfade_enabled_arc = state.crossfade_enabled.clone();
    let crossfade_secs_arc = state.crossfade_secs.clone();

    tokio::spawn(async move {
        let mut near_end_ticks: u32 = 0;

        loop {
            tokio::time::sleep(Duration::from_millis(500)).await;

            if gen_counter.load(Ordering::SeqCst) != gen {
                break;
            }

            let (pos, dur, is_paused) = {
                let cur = current_arc.lock().unwrap();
                (cur.position(), cur.duration_secs, cur.paused_at.is_some())
            };

            app_clone
                .emit(
                    "audio:progress",
                    ProgressPayload { current_time: pos, duration: dur },
                )
                .ok();

            if is_paused {
                // Don't advance near-end counter while paused (stay put).
                continue;
            }

            let cf_enabled = crossfade_enabled_arc.load(Ordering::Relaxed);
            let cf_secs = f32::from_bits(crossfade_secs_arc.load(Ordering::Relaxed)).clamp(0.5, 12.0) as f64;
            let end_threshold = if cf_enabled { cf_secs.max(1.0) } else { 1.0 };

            if dur > end_threshold && pos >= dur - end_threshold {
                near_end_ticks += 1;
                if near_end_ticks >= 2 {
                    gen_counter.fetch_add(1, Ordering::SeqCst);
                    app_clone.emit("audio:ended", ()).ok();
                    break;
                }
            } else {
                near_end_ticks = 0;
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn audio_pause(state: State<'_, AudioEngine>) {
    let mut cur = state.current.lock().unwrap();
    if let Some(sink) = &cur.sink {
        if !sink.is_paused() {
            let pos = cur.position();
            sink.pause();
            cur.paused_at = Some(pos);
            cur.play_started = None;
        }
    }
}

#[tauri::command]
pub fn audio_resume(state: State<'_, AudioEngine>) {
    let mut cur = state.current.lock().unwrap();
    if let Some(sink) = &cur.sink {
        if sink.is_paused() {
            let pos = cur.paused_at.unwrap_or(cur.seek_offset);
            sink.play();
            cur.seek_offset = pos;
            cur.play_started = Some(Instant::now());
            cur.paused_at = None;
        }
    }
}

#[tauri::command]
pub fn audio_stop(state: State<'_, AudioEngine>) {
    state.generation.fetch_add(1, Ordering::SeqCst);
    let mut cur = state.current.lock().unwrap();
    if let Some(sink) = cur.sink.take() {
        sink.stop();
    }
    cur.duration_secs = 0.0;
    cur.seek_offset = 0.0;
    cur.play_started = None;
    cur.paused_at = None;
}

#[tauri::command]
pub fn audio_seek(seconds: f64, state: State<'_, AudioEngine>) -> Result<(), String> {
    let mut cur = state.current.lock().unwrap();
    if let Some(sink) = &cur.sink {
        sink.try_seek(Duration::from_secs_f64(seconds.max(0.0)))
            .map_err(|e: rodio::source::SeekError| e.to_string())?;
        if cur.paused_at.is_some() {
            cur.paused_at = Some(seconds);
        } else {
            cur.seek_offset = seconds;
            cur.play_started = Some(Instant::now());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn audio_set_volume(volume: f32, state: State<'_, AudioEngine>) {
    let mut cur = state.current.lock().unwrap();
    cur.base_volume = volume.clamp(0.0, 1.0);
    if let Some(sink) = &cur.sink {
        sink.set_volume((cur.base_volume * cur.replay_gain_linear).clamp(0.0, 1.0));
    }
}

#[tauri::command]
pub fn audio_set_eq(gains: [f32; 10], enabled: bool, state: State<'_, AudioEngine>) {
    state.eq_enabled.store(enabled, Ordering::Relaxed);
    for (i, &gain) in gains.iter().enumerate() {
        state.eq_gains[i].store(gain.clamp(-12.0, 12.0).to_bits(), Ordering::Relaxed);
    }
}

#[tauri::command]
pub async fn audio_preload(
    url: String,
    duration_hint: f64,
    state: State<'_, AudioEngine>,
) -> Result<(), String> {
    // Don't re-download if already preloaded for this URL.
    {
        let preloaded = state.preloaded.lock().unwrap();
        if preloaded.as_ref().map(|p| p.url == url).unwrap_or(false) {
            return Ok(());
        }
    }
    let response = state
        .http_client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Ok(()); // silently fail preload
    }
    let data: Vec<u8> = response.bytes().await.map_err(|e| e.to_string())?.into();
    *state.preloaded.lock().unwrap() = Some(PreloadedTrack { url, data, duration_hint });
    Ok(())
}

#[tauri::command]
pub fn audio_set_crossfade(enabled: bool, secs: f32, state: State<'_, AudioEngine>) {
    state.crossfade_enabled.store(enabled, Ordering::Relaxed);
    state.crossfade_secs.store(secs.clamp(0.5, 12.0).to_bits(), Ordering::Relaxed);
}
