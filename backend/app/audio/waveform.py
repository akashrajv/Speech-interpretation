import numpy as np
from typing import Dict, Any, List

def compute_waveform_envelope(y: np.ndarray, num_points: int = 800) -> List[float]:
    """Downsamples audio to a fixed number of envelope peaks for waveform rendering."""
    if len(y) == 0:
        return []
    step = max(1, len(y) // num_points)
    envelope = []
    for i in range(0, len(y), step):
        chunk = y[i : i + step]
        if len(chunk) > 0:
            val = float(np.max(np.abs(chunk)))
            envelope.append(round(val, 4))
    return envelope[:num_points]

def compute_rms_series(y: np.ndarray, sr: int, frame_ms: int = 50, hop_ms: int = 25) -> Dict[str, Any]:
    """Computes short-time Root-Mean-Square (RMS) energy sequence and timestamps."""
    frame_len = int(frame_ms * sr / 1000)
    hop_len = int(hop_ms * sr / 1000)

    if len(y) < frame_len:
        return {"times": [], "rms": [], "mean": 0.0, "std": 0.0, "max": 0.0}

    num_frames = (len(y) - frame_len) // hop_len + 1
    rms_values = np.zeros(num_frames)
    times = np.zeros(num_frames)

    for i in range(num_frames):
        start = i * hop_len
        frame = y[start : start + frame_len]
        rms_values[i] = np.sqrt(np.mean(frame**2) + 1e-12)
        times[i] = (start + frame_len / 2) / sr

    mean_rms = float(np.mean(rms_values))
    std_rms = float(np.std(rms_values))
    max_rms = float(np.max(rms_values))

    # Downsample times & values if too large (> 1200 points)
    max_display_points = 1000
    if len(times) > max_display_points:
        subsample = len(times) // max_display_points
        times = times[::subsample]
        rms_values = rms_values[::subsample]

    return {
        "times": [round(float(t), 3) for t in times],
        "rms": [round(float(v), 4) for v in rms_values],
        "mean": round(mean_rms, 4),
        "std": round(std_rms, 4),
        "max": round(max_rms, 4)
    }
