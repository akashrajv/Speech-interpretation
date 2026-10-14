import uuid
from typing import List, Dict, Any

def detect_speaking_rate_flaws(
    matched_segments: List[Dict[str, Any]],
    part_summary: Dict[str, Any],
    ref_summary: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Detects excessive speaking rate and unusually slow rate segments
    by comparing matched participant segments with reference segments.
    """
    flaws = []

    # Segment-level checks
    for seg in matched_segments:
        ref_wpm = seg.get("reference_wpm", 140.0)
        part_wpm = seg.get("participant_wpm", 140.0)
        deviation_pct = seg.get("wpm_deviation_percent", 0.0)

        # 1. Excessive speaking rate
        if deviation_pct > 25.0 or (ref_wpm > 0 and part_wpm > 180.0 and deviation_pct > 15.0):
            severity = "high" if deviation_pct > 40.0 else "medium"
            confidence = min(0.95, 0.75 + (abs(deviation_pct) / 200.0))

            flaws.append({
                "flaw_id": f"flaw_rate_fast_{uuid.uuid4().hex[:8]}",
                "category": "excessive_speaking_rate",
                "start_seconds": seg["participant_start"],
                "end_seconds": seg["participant_end"],
                "text_segment": seg["text"],
                "reference_value": round(float(ref_wpm), 1),
                "participant_value": round(float(part_wpm), 1),
                "unit": "words_per_minute",
                "deviation_percent": round(float(deviation_pct), 1),
                "severity": severity,
                "confidence": round(float(confidence), 2),
                "evidence": [
                    {
                        "metric": "speaking_rate",
                        "participant_value": round(float(part_wpm), 1),
                        "reference_value": round(float(ref_wpm), 1),
                        "unit": "wpm",
                        "delta_percent": round(float(deviation_pct), 1),
                        "threshold_applied": "+25% over reference"
                    },
                    {
                        "metric": "segment_duration",
                        "participant_value": seg["participant_duration"],
                        "reference_value": seg["reference_duration"],
                        "unit": "seconds",
                        "delta_percent": seg.get("duration_deviation_percent", 0.0)
                    }
                ],
                "explanation": f"Participant's speaking rate ({part_wpm:.1f} WPM) is {deviation_pct:+.1f}% faster than the reference ({ref_wpm:.1f} WPM) on this segment, which can hinder clarity and reduce emotional weight.",
                "recommendation": "Slow down across this phrase, articulate key verbs and nouns distinctly, and allow a natural pause before transitioning to the next thought."
            })

        # 2. Unusually slow speaking rate
        elif deviation_pct < -25.0 or (ref_wpm > 0 and part_wpm < 100.0 and deviation_pct < -15.0):
            severity = "high" if deviation_pct < -38.0 else "medium"
            confidence = min(0.95, 0.75 + (abs(deviation_pct) / 200.0))

            flaws.append({
                "flaw_id": f"flaw_rate_slow_{uuid.uuid4().hex[:8]}",
                "category": "unusually_slow_rate",
                "start_seconds": seg["participant_start"],
                "end_seconds": seg["participant_end"],
                "text_segment": seg["text"],
                "reference_value": round(float(ref_wpm), 1),
                "participant_value": round(float(part_wpm), 1),
                "unit": "words_per_minute",
                "deviation_percent": round(float(deviation_pct), 1),
                "severity": severity,
                "confidence": round(float(confidence), 2),
                "evidence": [
                    {
                        "metric": "speaking_rate",
                        "participant_value": round(float(part_wpm), 1),
                        "reference_value": round(float(ref_wpm), 1),
                        "unit": "wpm",
                        "delta_percent": round(float(deviation_pct), 1),
                        "threshold_applied": "-25% below reference"
                    }
                ],
                "explanation": f"Participant delivered this phrase at {part_wpm:.1f} WPM, which is {abs(deviation_pct):.1f}% slower than the matched reference ({ref_wpm:.1f} WPM), risking loss of audience momentum.",
                "recommendation": "Maintain vocal forward energy through this clause without dragging syllable durations."
            })

    return flaws
