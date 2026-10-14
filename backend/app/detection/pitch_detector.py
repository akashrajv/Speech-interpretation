import uuid
import numpy as np
from typing import List, Dict, Any

def detect_pitch_flaws(
    part_pitch: Dict[str, Any],
    ref_pitch: Dict[str, Any],
    matched_segments: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Detects monotone flat intonation and sudden pitch breaks/instability.
    """
    flaws = []
    p_contour = part_pitch.get("contour", [])
    p_times = part_pitch.get("times", [])
    r_contour = ref_pitch.get("contour", [])
    r_times = ref_pitch.get("times", [])

    if not p_contour or not p_times:
        return flaws

    # Check segment-by-segment intonation
    for seg in matched_segments:
        s_start = seg["participant_start"]
        s_end = seg["participant_end"]

        # Collect participant voiced frames in this window
        seg_p_f0 = [
            f0 for t, f0 in zip(p_times, p_contour)
            if s_start <= t <= s_end and f0 is not None
        ]

        if len(seg_p_f0) >= 6:
            seg_p_std = float(np.std(seg_p_f0))

            # Reference counterpart in matching time span
            r_start = seg.get("reference_start", s_start)
            r_end = seg.get("reference_end", s_end)
            seg_r_f0 = [
                f0 for t, f0 in zip(r_times, r_contour)
                if r_start <= t <= r_end and f0 is not None
            ]
            seg_r_std = float(np.std(seg_r_f0)) if len(seg_r_f0) >= 6 else 28.0

            # 1. Monotone / Flat intonation
            if seg_p_std < 12.0 and seg_r_std >= 22.0:
                delta_pct = ((seg_p_std - seg_r_std) / seg_r_std * 100.0) if seg_r_std > 0 else -50.0
                flaws.append({
                    "flaw_id": f"flaw_pitch_monotone_{uuid.uuid4().hex[:8]}",
                    "category": "flat_intonation",
                    "start_seconds": s_start,
                    "end_seconds": s_end,
                    "text_segment": seg["text"],
                    "reference_value": round(float(seg_r_std), 1),
                    "participant_value": round(float(seg_p_std), 1),
                    "unit": "Hz_std_dev",
                    "deviation_percent": round(float(delta_pct), 1),
                    "severity": "medium",
                    "confidence": 0.88,
                    "evidence": [
                        {
                            "metric": "f0_variability",
                            "participant_value": round(float(seg_p_std), 1),
                            "reference_value": round(float(seg_r_std), 1),
                            "unit": "Hz std",
                            "delta_percent": round(float(delta_pct), 1),
                            "threshold_applied": "std < 12Hz while ref >= 22Hz"
                        }
                    ],
                    "explanation": f"Delivery on '{seg['text']}' was acoustically monotone with minimal pitch inflection (pitch std dev {seg_p_std:.1f} Hz vs reference {seg_r_std:.1f} Hz).",
                    "recommendation": "Use intentional pitch modulation: lift pitch on the climax of the phrase and resolve downward at the period."
                })

            # 2. Pitch break / erratic instability
            diffs = np.abs(np.diff(seg_p_f0))
            if len(diffs) > 0 and np.max(diffs) > 55.0:
                max_jump = float(np.max(diffs))
                flaws.append({
                    "flaw_id": f"flaw_pitch_break_{uuid.uuid4().hex[:8]}",
                    "category": "abrupt_pitch_change",
                    "start_seconds": s_start,
                    "end_seconds": s_end,
                    "text_segment": seg["text"],
                    "reference_value": 15.0,
                    "participant_value": round(float(max_jump), 1),
                    "unit": "Hz_delta",
                    "deviation_percent": round(float((max_jump - 15.0) / 15.0 * 100.0), 1),
                    "severity": "high" if max_jump > 75.0 else "medium",
                    "confidence": 0.84,
                    "evidence": [
                        {
                            "metric": "max_frame_f0_jump",
                            "participant_value": round(float(max_jump), 1),
                            "reference_value": 15.0,
                            "unit": "Hz",
                            "threshold_applied": "sudden delta > 55Hz"
                        }
                    ],
                    "explanation": f"Detected an abrupt pitch spike or vocal break of {max_jump:.1f} Hz within phrase '{seg['text']}', suggesting unstable vocal fold tension or breath instability.",
                    "recommendation": "Maintain relaxed throat posture and steady abdominal breath support to avoid sudden involuntary pitch fractures."
                })

    return flaws
