import pytest
import numpy as np
import soundfile as sf
import tempfile
import os

from backend.app.audio.preprocessing import (
    validate_audio_file,
    decode_and_resample,
    check_signal_quality,
    detect_voice_activity,
    preprocess_and_save_audio
)
from backend.app.audio.waveform import compute_waveform_envelope, compute_rms_series
from backend.app.audio.fft_analysis import compute_spectral_features
from backend.app.audio.mfcc_analysis import compute_mfcc_features, compute_mfcc_distance
from backend.app.audio.pitch_analysis import compute_pitch_features
from backend.app.audio.pause_detection import detect_pauses
from backend.app.audio.speaking_rate import compute_speaking_rate

@pytest.fixture
def sample_wav():
    sr = 16000
    duration = 3.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # 220Hz tone with an unvoiced/silent middle section
    y = 0.5 * np.sin(2 * np.pi * 220 * t).astype(np.float32)
    # Insert 0.8s silence in middle
    s_start = int(1.0 * sr)
    s_end = int(1.8 * sr)
    y[s_start:s_end] = 0.0

    fd, path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    sf.write(path, y, sr)
    yield path, y, sr
    if os.path.exists(path):
        os.remove(path)

def test_preprocessing(sample_wav):
    path, y, sr = sample_wav
    val = validate_audio_file(path)
    assert val["valid"] is True

    y_dec, sr_dec, dur = decode_and_resample(path, target_sr=16000)
    assert sr_dec == 16000
    assert abs(dur - 3.0) < 0.1

    qual = check_signal_quality(y_dec, sr_dec)
    assert qual["clipping_detected"] is False
    assert qual["snr_db"] > 0

    is_speech, act_dur = detect_voice_activity(y_dec, sr_dec)
    assert act_dur < dur
    assert act_dur > 0.5

def test_waveform_and_rms(sample_wav):
    path, y, sr = sample_wav
    env = compute_waveform_envelope(y, num_points=100)
    assert len(env) > 0
    assert max(env) > 0.4

    rms_res = compute_rms_series(y, sr)
    assert len(rms_res["times"]) > 0
    assert rms_res["mean"] > 0

def test_spectral_and_mfcc(sample_wav):
    path, y, sr = sample_wav
    spec = compute_spectral_features(y, sr)
    assert spec["centroid_mean"] is not None
    assert spec["spectrogram"] is not None

    mfcc = compute_mfcc_features(y, sr)
    assert len(mfcc["mfcc_mean"]) == 13
    assert mfcc["heatmap"] is not None

    dist = compute_mfcc_distance(mfcc["raw_mfcc"], mfcc["raw_mfcc"])
    assert dist["cosine_distance"] < 0.01

def test_pitch_estimation(sample_wav):
    path, y, sr = sample_wav
    pitch = compute_pitch_features(y, sr)
    assert pitch["median_pitch_hz"] is not None
    # 220Hz test tone
    assert abs(pitch["median_pitch_hz"] - 220.0) < 15.0
    assert pitch["voiced_ratio"] > 0.4

def test_pause_detection(sample_wav):
    path, y, sr = sample_wav
    pauses_res = detect_pauses(y, sr, min_pause_seconds=0.3)
    assert pauses_res["pause_count"] >= 1
    # Check that detected pause overlaps with the 1.0 - 1.8s silence
    detected = False
    for p in pauses_res["pauses"]:
        if 0.8 <= p["start_seconds"] <= 1.2:
            detected = True
            break
    assert detected is True

def test_speaking_rate():
    rate = compute_speaking_rate(word_count=50, total_duration_seconds=20.0, speech_active_duration_seconds=16.0)
    assert rate["speaking_rate_wpm"] == 150.0
    assert rate["active_speaking_rate_wpm"] == 187.5
