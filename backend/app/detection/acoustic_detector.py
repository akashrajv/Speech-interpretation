import uuid
import numpy as np
from typing import List, Dict, Any

def detect_acoustic_deviations(
    matched_segments: List[Dict[str, Any]],
    mfcc_dist_info: Dict[str, float]
) -> List[Dict[str, Any]]:
    """
    Identifies high spectral/timbral divergence segments based on MFCC distances.
    Explains that acoustic deviation describes spectral differences and does not independently prove poor speech.
    """
    flaws = []
    cos_dist = mfcc_dist_info.get("cosine_distance", 0.0)

    # If global distance is notably elevated (> 0.25)
    if cos_dist > 0.25 and matched_segments:
        # Highlight most divergent segment (highest rate difference or duration difference)
        worst_seg = max(matched_segments, key=lambda s: abs(s.get("wpm_deviation_percent", 0.0)))
        dev_pct = cos_dist * 100.0

        flaws.append({
            "flaw_id": f"flaw_acoustic_dev_{uuid.uuid4().hex[:8]}",
            "category": "unusual_acoustic_deviation",
            "start_seconds": worst_seg["participant_start"],
            "end_seconds": worst_seg["participant_end"],
            "text_segment": worst_seg["text"],
            "reference_value": 0.08,
            "participant_value": round(float(cos_dist), 3),
            "unit": "mfcc_cosine_distance",
            "deviation_percent": round(float(dev_pct), 1),
            "severity": "low",
            "confidence": 0.80,
            "evidence": [
                {
                    "metric": "mfcc_cosine_distance",
                    "participant_value": round(float(cos_dist), 3),
                    "reference_value": 0.08,
                    "unit": "distance",
                    "delta_percent": round(float(dev_pct), 1),
                    "threshold_applied": "distance > 0.25"
                }
            ],
            "explanation": f"Acoustic spectral distance (MFCC distance {cos_dist:.3f}) showed notable divergence across '{worst_seg['text']}'. Note: timbral variance reflects vocal tract resonance and acoustic environment, not solely speaker skill.",
            "recommendation": "Maintain consistent microphone distance and forward vocal resonance to improve acoustic clarity."
        })

    return flaws
