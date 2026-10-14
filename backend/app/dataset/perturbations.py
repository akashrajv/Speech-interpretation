import numpy as np
import scipy.signal
import soundfile as sf
import os
from typing import Tuple, Dict, Any

def apply_speed_perturbation(y: np.ndarray, sr: int, speed_factor: float = 1.35) -> np.ndarray:
    """
    Speeds up or slows down audio by resampling, creating realistic rate differences.
    speed_factor > 1.0 = faster delivery.
    """
    num_samples = int(len(y) / speed_factor)
    return scipy.signal.resample(y, num_samples).astype(np.float32)

def apply_silence_insertion(y: np.ndarray, sr: int, insert_time_sec: float = 3.0, silence_duration_sec: float = 2.0) -> np.ndarray:
    """Inserts an awkward prolonged silence interval into the audio."""
    insert_sample = int(insert_time_sec * sr)
    insert_sample = min(len(y), max(0, insert_sample))

    silence = np.zeros(int(silence_duration_sec * sr), dtype=np.float32)
    # Add minimal ambient noise floor
    silence += np.random.normal(0, 1e-4, len(silence)).astype(np.float32)

    return np.concatenate([y[:insert_sample], silence, y[insert_sample:]])

def apply_tail_attenuation(y: np.ndarray, sr: int, start_ratio: float = 0.70, attenuation_factor: float = 0.20) -> np.ndarray:
    """Fades out loudness significantly towards the end of the recording (trailing off)."""
    out = y.copy()
    start_sample = int(len(y) * start_ratio)
    ramp_len = len(y) - start_sample
    if ramp_len > 0:
        ramp = np.linspace(1.0, attenuation_factor, ramp_len, dtype=np.float32)
        out[start_sample:] *= ramp
    return out

def generate_synthetic_flawed_audio(
    clean_audio_path: str,
    output_audio_path: str,
    flaw_type: str = "excessive_speed"
) -> Dict[str, Any]:
    """
    Applies controlled acoustic perturbation to produce ground-truth flawed audio.
    """
    y, sr = sf.read(clean_audio_path, dtype="float32")
    if y.ndim > 1:
        y = np.mean(y, axis=1)

    if flaw_type == "excessive_speed":
        y_mod = apply_speed_perturbation(y, sr, speed_factor=1.35)
        note = "Synthetic perturbation: playback rate increased by 35%."
    elif flaw_type == "excessive_pause":
        y_mod = apply_silence_insertion(y, sr, insert_time_sec=len(y)/sr * 0.45, silence_duration_sec=2.2)
        note = "Synthetic perturbation: inserted 2.2s silence gap."
    elif flaw_type == "inconsistent_loudness":
        y_mod = apply_tail_attenuation(y, sr, start_ratio=0.65, attenuation_factor=0.20)
        note = "Synthetic perturbation: attenuated final 35% of recording by 80%."
    else:
        y_mod = y.copy()
        note = "Clean unmodified audio."

    os.makedirs(os.path.dirname(output_audio_path), exist_ok=True)
    sf.write(output_audio_path, y_mod, sr, subtype="PCM_16")

    return {
        "output_path": output_audio_path,
        "sample_rate": sr,
        "duration_seconds": round(len(y_mod) / sr, 2),
        "flaw_type": flaw_type,
        "note": note
    }
