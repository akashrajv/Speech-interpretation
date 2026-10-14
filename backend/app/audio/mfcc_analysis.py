import numpy as np
import librosa
from scipy.spatial.distance import cosine
from typing import Dict, Any, List, Optional

def compute_mfcc_features(y: np.ndarray, sr: int, n_mfcc: int = 13, hop_length: int = 512) -> Dict[str, Any]:
    """
    Computes 13 MFCCs, delta, and delta-delta coefficients along with summary statistics
    and downsampled matrix for heatmap visualization.
    """
    if len(y) < 1024:
        return {
            "mfcc_mean": [],
            "mfcc_std": [],
            "heatmap": None,
            "raw_mfcc": np.zeros((n_mfcc, 1))
        }

    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc, hop_length=hop_length)
    delta_mfcc = librosa.feature.delta(mfcc)
    delta2_mfcc = librosa.feature.delta(mfcc, order=2)

    mean_mfcc = np.mean(mfcc, axis=1).tolist()
    std_mfcc = np.std(mfcc, axis=1).tolist()

    # Downsample time steps for visualization
    max_time_steps = 100
    times = librosa.frames_to_time(np.arange(mfcc.shape[1]), sr=sr, hop_length=hop_length)

    if mfcc.shape[1] > max_time_steps:
        time_idx = np.linspace(0, mfcc.shape[1] - 1, max_time_steps, dtype=int)
        compact_mfcc = mfcc[:, time_idx]
        compact_times = times[time_idx]
    else:
        compact_mfcc = mfcc
        compact_times = times

    heatmap_data = {
        "z": [[round(float(v), 2) for v in row] for row in compact_mfcc.tolist()],
        "x": [round(float(t), 2) for t in compact_times.tolist()],
        "y": [f"MFCC {i+1}" for i in range(n_mfcc)]
    }

    return {
        "mfcc_mean": [round(float(x), 3) for x in mean_mfcc],
        "mfcc_std": [round(float(x), 3) for x in std_mfcc],
        "heatmap": heatmap_data,
        "raw_mfcc": mfcc
    }

def compute_mfcc_distance(ref_mfcc: np.ndarray, part_mfcc: np.ndarray) -> Dict[str, float]:
    """
    Calculates acoustic distance between reference and participant MFCC sequences
    using global mean cosine distance and normalized DTW alignment distance.
    """
    if ref_mfcc.size == 0 or part_mfcc.size == 0:
        return {"cosine_distance": 0.0, "dtw_distance": 0.0}

    ref_mean = np.mean(ref_mfcc, axis=1)
    part_mean = np.mean(part_mfcc, axis=1)

    cos_dist = float(cosine(ref_mean, part_mean)) if np.linalg.norm(ref_mean) > 0 and np.linalg.norm(part_mean) > 0 else 0.0

    # Compute fast DTW on normalized MFCC frames (subsampled to at most 150 frames)
    def subsample(mat, max_f=120):
        if mat.shape[1] > max_f:
            idx = np.linspace(0, mat.shape[1] - 1, max_f, dtype=int)
            return mat[:, idx]
        return mat

    sub_ref = subsample(ref_mfcc)
    sub_part = subsample(part_mfcc)

    try:
        # Compute pairwise euclidean cost matrix
        # sub_ref: (13, N), sub_part: (13, M)
        diff = sub_ref[:, :, None] - sub_part[:, None, :] # shape (13, N, M)
        cost_matrix = np.sqrt(np.sum(diff**2, axis=0)) # shape (N, M)

        # Dynamic programming DTW
        N, M = cost_matrix.shape
        accumulated_cost = np.zeros((N, M))
        accumulated_cost[0, 0] = cost_matrix[0, 0]

        for i in range(1, N):
            accumulated_cost[i, 0] = accumulated_cost[i - 1, 0] + cost_matrix[i, 0]
        for j in range(1, M):
            accumulated_cost[0, j] = accumulated_cost[0, j - 1] + cost_matrix[0, j]

        for i in range(1, N):
            for j in range(1, M):
                accumulated_cost[i, j] = cost_matrix[i, j] + min(
                    accumulated_cost[i - 1, j],
                    accumulated_cost[i, j - 1],
                    accumulated_cost[i - 1, j - 1]
                )

        normalized_dtw = float(accumulated_cost[-1, -1] / (N + M))
    except Exception:
        normalized_dtw = float(cos_dist * 10.0)

    return {
        "cosine_distance": round(cos_dist, 4),
        "dtw_distance": round(normalized_dtw, 4)
    }
