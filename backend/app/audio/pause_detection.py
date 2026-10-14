import numpy as np
from typing import Dict, Any, List

def detect_pauses(
    y: np.ndarray,
    sr: int,
    min_pause_seconds: float = 0.25,
    long_pause_threshold: float = 1.2,
    frame_ms: int = 30,
    hop_ms: int = 15
) -> Dict[str, Any]:
    """
    Detects silent pauses using adaptive energy and returns detailed intervals and statistics.
    """
    frame_len = int(frame_ms * sr / 1000)
    hop_len = int(hop_ms * sr / 1000)
    total_duration = len(y) / sr

    if len(y) < frame_len:
        return {
            "pause_count": 0,
            "average_pause_seconds": 0.0,
            "silence_ratio": 0.0,
            "long_pause_count": 0,
            "pauses": []
        }

    num_frames = (len(y) - frame_len) // hop_len + 1
    rms = np.zeros(num_frames)
    for i in range(num_frames):
        chunk = y[i * hop_len : i * hop_len + frame_len]
        rms[i] = np.sqrt(np.mean(chunk**2) + 1e-12)

    noise_floor = np.percentile(rms, 15)
    max_energy = np.percentile(rms, 95)
    thresh = noise_floor + 0.10 * (max_energy - noise_floor)
    thresh = max(thresh, 0.012)

    is_silent = rms < thresh

    # Group silent frames into contiguous intervals
    pauses: List[Dict[str, Any]] = []
    in_pause = False
    start_frame = 0

    for i, silent in enumerate(is_silent):
        if silent and not in_pause:
            in_pause = True
            start_frame = i
        elif not silent and in_pause:
            in_pause = False
            start_time = (start_frame * hop_len) / sr
            end_time = (i * hop_len + frame_len) / sr
            duration = end_time - start_time
            if duration >= min_pause_seconds:
                pauses.append({
                    "start_seconds": round(float(start_time), 2),
                    "end_seconds": round(float(end_time), 2),
                    "duration_seconds": round(float(duration), 2),
                    "is_long_pause": duration >= long_pause_threshold
                })

    # If audio ends during a pause
    if in_pause:
        start_time = (start_frame * hop_len) / sr
        end_time = total_duration
        duration = end_time - start_time
        if duration >= min_pause_seconds:
            pauses.append({
                "start_seconds": round(float(start_time), 2),
                "end_seconds": round(float(duration), 2),
                "duration_seconds": round(float(duration), 2),
                "is_long_pause": duration >= long_pause_threshold
            })

    total_pause_duration = sum(p["duration_seconds"] for p in pauses)
    avg_pause = (total_pause_duration / len(pauses)) if pauses else 0.0
    silence_ratio = (total_pause_duration / total_duration) if total_duration > 0 else 0.0
    long_count = sum(1 for p in pauses if p["is_long_pause"])

    return {
        "pause_count": len(pauses),
        "average_pause_seconds": round(avg_pause, 2),
        "silence_ratio": round(silence_ratio, 3),
        "long_pause_count": long_count,
        "total_pause_duration": round(total_pause_duration, 2),
        "pauses": pauses
    }
