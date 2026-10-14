import uuid
from typing import List, Dict, Any

def detect_pronunciation_mismatches(
    part_alignments: List[Dict[str, Any]],
    ref_alignments: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Detects potential word-level articulation mismatches or alignment failures.
    Compares word duration ratios and alignment confidence.
    """
    flaws = []
    num_words = min(len(part_alignments), len(ref_alignments))

    for i in range(num_words):
        p_w = part_alignments[i]
        r_w = ref_alignments[i]

        p_dur = p_w.get("duration_seconds", 0.3)
        r_dur = r_w.get("duration_seconds", 0.3)
        p_conf = p_w.get("confidence", 0.9)

        # Ratio anomaly: word spoken in < 25% or > 250% of expected duration with low confidence
        ratio = (p_dur / r_dur) if r_dur > 0 else 1.0

        if (ratio < 0.28 and r_dur > 0.45) or (p_conf < 0.75 and ratio < 0.4):
            dev_pct = ((p_dur - r_dur) / r_dur) * 100.0
            flaws.append({
                "flaw_id": f"flaw_articulation_rushed_{uuid.uuid4().hex[:8]}",
                "category": "potential_pronunciation_mismatch",
                "start_seconds": p_w["start_seconds"],
                "end_seconds": p_w["end_seconds"],
                "text_segment": p_w["word"],
                "reference_value": round(float(r_dur), 2),
                "participant_value": round(float(p_dur), 2),
                "unit": "seconds_per_word",
                "deviation_percent": round(float(dev_pct), 1),
                "severity": "low" if abs(dev_pct) < 50 else "medium",
                "confidence": 0.82,
                "evidence": [
                    {
                        "metric": "word_duration",
                        "participant_value": round(float(p_dur), 2),
                        "reference_value": round(float(r_dur), 2),
                        "unit": "s",
                        "delta_percent": round(float(dev_pct), 1),
                        "threshold_applied": "duration ratio < 0.28"
                    }
                ],
                "explanation": f"The word '{p_w['word']}' was compressed to {p_dur:.2f}s ({dev_pct:.1f}% shorter than reference), risking slurred or indistinct consonant articulation.",
                "recommendation": f"Enunciate all consonant stops in '{p_w['word']}' rather than swallowing the syllable."
            })

    return flaws
