import os
import io
import soundfile as sf
import numpy as np
import scipy.signal
from pathlib import Path
from typing import Tuple, Dict, Any, Optional

SUPPORTED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".aac"}
TARGET_SAMPLE_RATE = 16000

def validate_audio_file(file_path: str, max_size_mb: int = 50) -> Dict[str, Any]:
    """Validates file size, extension, and format existence."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported audio format: {ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}")

    size_mb = path.stat().st_size / (1024 * 1024)
    if size_mb > max_size_mb:
        raise ValueError(f"File size ({size_mb:.1f} MB) exceeds limit of {max_size_mb} MB")

    return {"valid": True, "size_mb": size_mb, "extension": ext}

def decode_and_resample(file_path: str, target_sr: int = TARGET_SAMPLE_RATE) -> Tuple[np.ndarray, int, float]:
    """
    Decodes audio into mono float32 numpy array normalized to [-1.0, 1.0],
    resampling to target_sr if required.
    """
    try:
        data, sr = sf.read(file_path, dtype="float32")
    except Exception as e:
        # Fallback to librosa if soundfile direct read fails on certain formats
        try:
            import librosa
            data, sr = librosa.load(file_path, sr=target_sr, mono=True)
            duration = len(data) / target_sr
            return data.astype(np.float32), target_sr, float(duration)
        except Exception as e2:
            raise RuntimeError(f"Failed to decode audio file {file_path}: {str(e2)}")

    # Convert multi-channel to mono
    if data.ndim > 1:
        data = np.mean(data, axis=1)

    # Resample if needed
    if sr != target_sr:
        num_target_samples = int(round(len(data) * float(target_sr) / sr))
        data = scipy.signal.resample(data, num_target_samples).astype(np.float32)
        sr = target_sr

    duration = float(len(data)) / float(sr)
    return data, sr, duration

def check_signal_quality(y: np.ndarray, sr: int) -> Dict[str, Any]:
    """
    Inspects clipping, peak amplitude, and estimates Signal-to-Noise Ratio (SNR).
    """
    if len(y) == 0:
        return {"empty": True, "duration": 0.0, "clipping": False, "snr_db": 0.0}

    peak = float(np.max(np.abs(y)))
    # Check clipping: if > 0.999 or many consecutive samples saturated
    clipping_ratio = float(np.mean(np.abs(y) >= 0.99))
    clipping = clipping_ratio > 0.005

    # Estimate SNR using lowest 10% energy frames vs highest 50% energy frames
    frame_len = int(0.03 * sr)  # 30ms frames
    hop_len = int(0.015 * sr)
    frames = [y[i:i+frame_len] for i in range(0, len(y) - frame_len, hop_len)]

    if len(frames) > 10:
        energies = np.array([np.sum(f**2) for f in frames]) + 1e-12
        noise_floor = np.percentile(energies, 10)
        signal_energy = np.percentile(energies, 85)
        snr_db = float(10 * np.log10(max(signal_energy / (noise_floor + 1e-12), 1.0)))
    else:
        snr_db = 20.0

    return {
        "empty": False,
        "peak_amplitude": peak,
        "clipping_detected": clipping,
        "clipping_ratio": clipping_ratio,
        "snr_db": round(snr_db, 2)
    }

def detect_voice_activity(y: np.ndarray, sr: int, frame_ms: int = 30, hop_ms: int = 15) -> Tuple[np.ndarray, float]:
    """
    Simple, robust energy & spectral flux based Voice Activity Detector (VAD).
    Returns boolean array of speech activity per frame and speech active duration.
    """
    frame_len = int(frame_ms * sr / 1000)
    hop_len = int(hop_ms * sr / 1000)
    num_frames = max(1, (len(y) - frame_len) // hop_len + 1)

    # Frame RMS
    rms = np.zeros(num_frames)
    for i in range(num_frames):
        start = i * hop_len
        frame = y[start : start + frame_len]
        rms[i] = np.sqrt(np.mean(frame**2) + 1e-12)

    # Adaptive threshold: noise floor + fraction of range
    noise_floor = np.percentile(rms, 15)
    max_energy = np.percentile(rms, 95)
    threshold = noise_floor + 0.12 * (max_energy - noise_floor)
    threshold = max(threshold, 0.01)

    is_speech = rms > threshold

    # Smooth short gaps (< 200ms) and short bursts (< 100ms)
    min_gap_frames = int(200 / hop_ms)
    min_speech_frames = int(100 / hop_ms)

    # Fill short gaps
    gap_len = 0
    for i in range(len(is_speech)):
        if not is_speech[i]:
            gap_len += 1
        else:
            if 0 < gap_len < min_gap_frames:
                is_speech[i - gap_len : i] = True
            gap_len = 0

    active_duration = float(np.sum(is_speech) * hop_ms / 1000.0)
    return is_speech, active_duration

def preprocess_and_save_audio(input_path: str, output_path: str) -> Dict[str, Any]:
    """
    Full preprocessing pipeline: validates, decodes, resamples to 16kHz mono,
    checks quality, saves normalized WAV, and returns metadata.
    """
    validate_audio_file(input_path)
    y, sr, duration = decode_and_resample(input_path, TARGET_SAMPLE_RATE)
    quality = check_signal_quality(y, sr)
    _, active_duration = detect_voice_activity(y, sr)

    # Save processed WAV
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    sf.write(output_path, y, sr, subtype="PCM_16")

    return {
        "processed_path": output_path,
        "sample_rate": sr,
        "duration_seconds": round(duration, 3),
        "speech_active_duration": round(active_duration, 3),
        "snr_db": quality["snr_db"],
        "clipping_detected": quality["clipping_detected"],
        "peak_amplitude": quality["peak_amplitude"]
    }
