import uuid
import re
from typing import List, Dict, Any

def detect_pause_flaws(
    part_pauses: List[Dict[str, Any]],
    part_alignments: List[Dict[str, Any]],
    ref_pauses: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Detects excessive pause durations and misplaced pauses interrupting syntactic clauses.
    """
    flaws = []
    avg_ref_pause = sum(p["duration_seconds"] for p in ref_pauses) / len(ref_pauses) if ref_pauses else 0.65

    for p in part_pauses:
        p_start = p["start_seconds"]
        p_end = p["end_seconds"]
        dur = p["duration_seconds"]

        # Find surrounding words
        preceding_word = None
        following_word = None

        for w in part_alignments:
            if w["end_seconds"] <= p_start + 0.1:
                preceding_word = w
            elif w["start_seconds"] >= p_end - 0.1 and following_word is None:
                following_word = w

        context_text = ""
        if preceding_word and following_word:
            context_text = f"{preceding_word['word']} [PAUSE] {following_word['word']}"
        elif preceding_word:
            context_text = f"{preceding_word['word']} [PAUSE]"
        elif following_word:
            context_text = f"[PAUSE] {following_word['word']}"
        else:
            context_text = "Silent interval"

        # Check for excessive pause (> 1.6s or > 120% of expected pause)
        if dur >= 1.6:
            severity = "high" if dur >= 2.4 else "medium"
            delta_pct = ((dur - avg_ref_pause) / avg_ref_pause * 100.0) if avg_ref_pause > 0 else 100.0

            flaws.append({
                "flaw_id": f"flaw_pause_long_{uuid.uuid4().hex[:8]}",
                "category": "excessive_pause",
                "start_seconds": p_start,
                "end_seconds": p_end,
                "text_segment": context_text,
                "reference_value": round(float(avg_ref_pause), 2),
                "participant_value": round(float(dur), 2),
                "unit": "seconds",
                "deviation_percent": round(float(delta_pct), 1),
                "severity": severity,
                "confidence": 0.90,
                "evidence": [
                    {
                        "metric": "pause_duration",
                        "participant_value": round(float(dur), 2),
                        "reference_value": round(float(avg_ref_pause), 2),
                        "unit": "seconds",
                        "delta_percent": round(float(delta_pct), 1),
                        "threshold_applied": "duration >= 1.6s"
                    }
                ],
                "explanation": f"A prolonged silence of {dur:.2f}s occurred here ({delta_pct:+.1f}% compared to average pause), which disrupts rhetorical momentum.",
                "recommendation": "Shorten this pause to around 0.6–0.8s to sustain audience engagement while still marking a rhetorical transition."
            })

        # Check for misplaced pause inside a phrase (no punctuation in preceding word)
        elif dur >= 0.5 and preceding_word and following_word:
            prec_text = preceding_word["word"]
            has_punctuation = bool(re.search(r"[,.!?;:\u2014]", prec_text))

            if not has_punctuation:
                flaws.append({
                    "flaw_id": f"flaw_pause_misplaced_{uuid.uuid4().hex[:8]}",
                    "category": "misplaced_pause",
                    "start_seconds": p_start,
                    "end_seconds": p_end,
                    "text_segment": context_text,
                    "reference_value": 0.15,
                    "participant_value": round(float(dur), 2),
                    "unit": "seconds",
                    "deviation_percent": round(float((dur - 0.15) / 0.15 * 100.0), 1),
                    "severity": "medium",
                    "confidence": 0.85,
                    "evidence": [
                        {
                            "metric": "intra_phrase_pause",
                            "participant_value": round(float(dur), 2),
                            "reference_value": 0.15,
                            "unit": "seconds",
                            "threshold_applied": "mid-clause hesitation >= 0.5s"
                        }
                    ],
                    "explanation": f"An unnatural pause of {dur:.2f}s divided the continuous phrase '{context_text}' where no syntactic punctuation or clause break exists.",
                    "recommendation": "Connect these words smoothly with continuous breath support rather than breaking in the middle of the thought."
                })

    return flaws
