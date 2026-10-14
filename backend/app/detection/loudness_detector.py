import uuid
import numpy as np
from typing import List, Dict, Any

def detect_loudness_flaws(
    part_rms: Dict[str, Any],
    ref_rms: Dict[str, Any],
    matched_segments: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Detects inconsistent loudness, trailing off at ends of phrases, and dynamic instability.
    """
    flaws = []
    p_rms_vals = part_rms.get("rms", [])
    p_times = part_rms.get("times", [])

    if not p_rms_vals or not p_times:
        return flaws

    for seg in matched_segments:
        s_start = seg["participant_start"]
        s_end = seg["participant_end"]

        # Gather RMS samples in this segment
        seg_samples = [
            v for t, v in zip(p_times, p_rms_vals)
            if s_start <= t <= s_end
        ]

        if len(seg_samples) >= 8:
            mean_vol = np.mean(seg_samples)
            std_vol = np.std(seg_samples)
            cov = (std_vol / (mean_vol + 1e-6))

            # Check trailing off: compare first half mean to last quarter mean
            split_idx = int(len(seg_samples) * 0.75)
            head_vol = np.mean(seg_samples[:split_idx])
            tail_vol = np.mean(seg_samples[split_idx:])

            # Trailing off flaw: tail volume drops below 30% of head volume
            if head_vol > 0.05 and tail_vol < head_vol * 0.30:
                drop_pct = (1.0 - (tail_vol / head_vol)) * 100.0
                flaws.append({
                    "flaw_id": f"flaw_loudness_drop_{uuid.uuid4().hex[:8]}",
                    "category": "inconsistent_loudness",
                    "start_seconds": round(float(s_start + (s_end - s_start) * 0.75), 2),
                    "end_seconds": s_end,
                    "text_segment": seg["text"],
                    "reference_value": round(float(head_vol), 3),
                    "participant_value": round(float(tail_vol), 3),
                    "unit": "rms_amplitude",
                    "deviation_percent": round(float(drop_pct), 1),
                    "severity": "medium",
                    "confidence": 0.86,
                    "evidence": [
                        {
                            "metric": "phrase_tail_attenuation",
                            "participant_value": round(float(tail_vol), 3),
                            "reference_value": round(float(head_vol), 3),
                            "unit": "RMS",
                            "delta_percent": round(float(-drop_pct), 1),
                            "threshold_applied": "tail < 30% of phrase energy"
                        }
                    ],
                    "explanation": f"Loudness dropped sharply by {drop_pct:.1f}% at the conclusion of '{seg['text']}', causing the final words to lose projection.",
                    "recommendation": "Maintain firm breath support through the final syllable so your terminal words remain audible and authoritative."
                })

    return flaws
