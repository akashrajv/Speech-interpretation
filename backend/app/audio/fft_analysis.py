import numpy as np
import librosa
from typing import Dict, Any, List

def compute_spectral_features(y: np.ndarray, sr: int, hop_length: int = 512, n_fft: int = 1024) -> Dict[str, Any]:
    """
    Computes spectral features including Centroid, Bandwidth, Rolloff,
    Flatness, and a compact spectrogram matrix for visualization.
    """
    if len(y) < n_fft:
        return {
            "centroid_mean": None,
            "bandwidth_mean": None,
            "rolloff_mean": None,
            "flatness_mean": None,
            "spectrogram": None,
            "times": [],
            "frequencies": []
        }

    # Spectral centroid
    cent = librosa.feature.spectral_centroid(y=y, sr=sr, n_fft=n_fft, hop_length=hop_length)[0]
    # Spectral bandwidth
    bw = librosa.feature.spectral_bandwidth(y=y, sr=sr, n_fft=n_fft, hop_length=hop_length)[0]
    # Spectral rolloff (85%)
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, n_fft=n_fft, hop_length=hop_length, roll_percent=0.85)[0]
    # Spectral flatness
    flatness = librosa.feature.spectral_flatness(y=y, n_fft=n_fft, hop_length=hop_length)[0]

    # STFT Magnitude Spectrogram (in dB)
    D = np.abs(librosa.stft(y, n_fft=n_fft, hop_length=hop_length))
    D_db = librosa.amplitude_to_db(D, ref=np.max)

    times = librosa.frames_to_time(np.arange(D.shape[1]), sr=sr, hop_length=hop_length)
    freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)

    # For frontend rendering efficiency: downsample frequencies to 32 bands and times to max 120 points
    target_freq_bins = 32
    target_time_bins = min(120, D.shape[1])

    # Downsample frequency axis
    freq_indices = np.linspace(0, len(freqs) - 1, target_freq_bins, dtype=int)
    downsampled_freqs = freqs[freq_indices].tolist()

    # Downsample time axis
    time_indices = np.linspace(0, len(times) - 1, target_time_bins, dtype=int)
    downsampled_times = times[time_indices].tolist()

    # Downsample 2D spectrogram matrix
    compact_spec = D_db[np.ix_(freq_indices, time_indices)]

    # Downsample centroid series for chart
    cent_downsampled = [round(float(c), 1) for c in cent[time_indices]]

    return {
        "centroid_mean": round(float(np.mean(cent)), 1),
        "bandwidth_mean": round(float(np.mean(bw)), 1),
        "rolloff_mean": round(float(np.mean(rolloff)), 1),
        "flatness_mean": round(float(np.mean(flatness)), 4),
        "spectrogram": {
            "z": [[round(float(val), 1) for val in row] for row in compact_spec.tolist()],
            "x": [round(float(t), 2) for t in downsampled_times],
            "y": [round(float(f), 0) for f in downsampled_freqs]
        },
        "centroid_series": cent_downsampled,
        "times": [round(float(t), 2) for t in downsampled_times]
    }
