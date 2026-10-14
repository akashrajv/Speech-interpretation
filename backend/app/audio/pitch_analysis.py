import numpy as np
import librosa
from typing import Dict, Any, List, Optional

def compute_pitch_features(y: np.ndarray, sr: int, fmin: float = 65.0, fmax: float = 500.0, hop_length: int = 512) -> Dict[str, Any]:
    """
    Estimates fundamental frequency (F0) contour using Librosa's YIN algorithm.
    Extracts median, range, variability, and voiced frame ratio.
    """
    if len(y) < 2048:
        return {
            "median_pitch_hz": None,
            "pitch_variability_hz": None,
            "pitch_min_hz": None,
            "pitch_max_hz": None,
            "voiced_ratio": 0.0,
            "contour": [],
            "times": []
        }

    try:
        # Use YIN for reliable local pitch contour
        f0 = librosa.yin(y, fmin=fmin, fmax=fmax, sr=sr, hop_length=hop_length)
        times = librosa.frames_to_time(np.arange(len(f0)), sr=sr, hop_length=hop_length)

        # Estimate unvoiced frames using energy & thresholding
        rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
        # Match lengths
        min_len = min(len(f0), len(rms), len(times))
        f0 = f0[:min_len]
        rms = rms[:min_len]
        times = times[:min_len]

        energy_thresh = np.percentile(rms, 20)
        voiced_mask = (rms > energy_thresh) & (f0 > fmin + 5) & (f0 < fmax - 5)

        voiced_f0 = f0[voiced_mask]
        voiced_ratio = float(np.mean(voiced_mask))

        if len(voiced_f0) > 5:
            med_f0 = float(np.median(voiced_f0))
            std_f0 = float(np.std(voiced_f0))
            min_f0 = float(np.percentile(voiced_f0, 5))
            max_f0 = float(np.percentile(voiced_f0, 95))
        else:
            med_f0, std_f0, min_f0, max_f0 = None, None, None, None

        # Downsample contour for rendering if length > 400
        step = max(1, len(f0) // 400)
        downsampled_times = []
        downsampled_contour = []

        for i in range(0, len(f0), step):
            downsampled_times.append(round(float(times[i]), 2))
            if voiced_mask[i]:
                downsampled_contour.append(round(float(f0[i]), 1))
            else:
                downsampled_contour.append(None)

        return {
            "median_pitch_hz": round(med_f0, 1) if med_f0 is not None else None,
            "pitch_variability_hz": round(std_f0, 1) if std_f0 is not None else None,
            "pitch_min_hz": round(min_f0, 1) if min_f0 is not None else None,
            "pitch_max_hz": round(max_f0, 1) if max_f0 is not None else None,
            "voiced_ratio": round(voiced_ratio, 3),
            "contour": downsampled_contour,
            "times": downsampled_times
        }

    except Exception as e:
        return {
            "median_pitch_hz": None,
            "pitch_variability_hz": None,
            "pitch_min_hz": None,
            "pitch_max_hz": None,
            "voiced_ratio": 0.0,
            "contour": [],
            "times": []
        }
