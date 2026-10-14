from typing import Dict, Any, List

DEFAULT_RUBRIC_WEIGHTS = {
    "pacing": 0.25,
    "pitch": 0.20,
    "volume": 0.20,
    "pronunciation": 0.20,
    "emphasis": 0.15
}

def calculate_rubric_scores(
    part_summary: Dict[str, Any],
    ref_summary: Dict[str, Any],
    flaws: List[Dict[str, Any]],
    weights: Dict[str, float] = None,
    has_reference: bool = True
) -> Dict[str, Any]:
    """
    Computes reproducible 0-100 scores across 5 speech dimensions.
    Based strictly on acoustic measurements and detected flaws.
    """
    if weights is None:
        weights = DEFAULT_RUBRIC_WEIGHTS.copy()

    # Normalize weights to sum to 1.0
    weight_sum = sum(weights.values())
    if weight_sum > 0:
        weights = {k: v / weight_sum for k, v in weights.items()}

    # Count flaws by category
    flaw_counts = {}
    for f in flaws:
        cat = f.get("category", "")
        flaw_counts[cat] = flaw_counts.get(cat, 0) + (1.5 if f.get("severity") == "high" else 1.0)

    # 1. Pacing & Rhythm (25%)
    # Evaluates WPM deviation and pause balance
    pacing_base = 95.0
    rate_flaws = flaw_counts.get("excessive_speaking_rate", 0) + flaw_counts.get("unusually_slow_rate", 0)
    pause_flaws = flaw_counts.get("excessive_pause", 0) + flaw_counts.get("misplaced_pause", 0)

    pacing_penalty = (rate_flaws * 7.5) + (pause_flaws * 6.0)
    if has_reference and ref_summary:
        ref_wpm = ref_summary.get("speaking_rate_wpm", 140.0)
        part_wpm = part_summary.get("speaking_rate_wpm", 140.0)
        global_wpm_delta = abs(part_wpm - ref_wpm) / max(ref_wpm, 1.0)
        if global_wpm_delta > 0.2:
            pacing_penalty += min(15.0, (global_wpm_delta - 0.2) * 50.0)

    pacing_score = max(35.0, min(100.0, pacing_base - pacing_penalty))

    # 2. Pitch & Intonation (20%)
    pitch_base = 94.0
    pitch_flaws = flaw_counts.get("flat_intonation", 0) + flaw_counts.get("abrupt_pitch_change", 0)
    pitch_penalty = pitch_flaws * 8.5

    part_f0_std = part_summary.get("pitch_variability_hz") or 22.0
    if part_f0_std < 14.0:
        pitch_penalty += 12.0
    elif part_f0_std > 50.0:
        pitch_penalty += 6.0

    pitch_score = max(30.0, min(100.0, pitch_base - pitch_penalty))

    # 3. Volume & Projection (20%)
    volume_base = 92.0
    loudness_flaws = flaw_counts.get("inconsistent_loudness", 0)
    volume_penalty = loudness_flaws * 7.0

    # Snr / clipping check
    if part_summary.get("clipping_detected"):
        volume_penalty += 10.0
    snr = part_summary.get("snr_db", 25.0)
    if snr < 12.0:
        volume_penalty += 8.0

    volume_score = max(35.0, min(100.0, volume_base - volume_penalty))

    # 4. Pronunciation & Clarity (20%)
    pron_base = 93.0
    pron_flaws = flaw_counts.get("potential_pronunciation_mismatch", 0)
    pron_penalty = pron_flaws * 9.0
    pron_score = max(40.0, min(100.0, pron_base - pron_penalty))

    # 5. Emphasis & Expressiveness (15%)
    emp_base = 90.0
    acoustic_flaws = flaw_counts.get("unusual_acoustic_deviation", 0)
    emp_penalty = (acoustic_flaws * 5.0) + (pitch_flaws * 4.0) + (loudness_flaws * 3.0)
    emphasis_score = max(35.0, min(100.0, emp_base - emp_penalty))

    # Weighted Overall Score
    scores = {
        "pacing": round(pacing_score, 1),
        "pitch": round(pitch_score, 1),
        "volume": round(volume_score, 1),
        "pronunciation": round(pron_score, 1),
        "emphasis": round(emphasis_score, 1)
    }

    overall = sum(scores[k] * weights[k] for k in scores)
    overall = round(max(0.0, min(100.0, overall)), 1)

    # Detailed dimensions with justifications
    dimensions = [
        {
            "dimension": "Pacing & Rhythm",
            "score": scores["pacing"],
            "weight": weights["pacing"],
            "weighted_score": round(scores["pacing"] * weights["pacing"], 1),
            "justification": f"Evaluated speaking tempo ({part_summary.get('speaking_rate_wpm', 0):.1f} WPM), pause frequency, and phrase durations. {rate_flaws + pause_flaws:.0f} pacing flaws identified.",
            "key_metrics": {
                "wpm": part_summary.get("speaking_rate_wpm", 0),
                "pause_count": part_summary.get("pause_count", 0),
                "avg_pause_s": part_summary.get("average_pause_seconds", 0)
            }
        },
        {
            "dimension": "Pitch & Intonation",
            "score": scores["pitch"],
            "weight": weights["pitch"],
            "weighted_score": round(scores["pitch"] * weights["pitch"], 1),
            "justification": f"Measured pitch variability (F0 std {part_f0_std:.1f} Hz) and inflection contours across phrase boundaries.",
            "key_metrics": {
                "median_f0_hz": part_summary.get("median_pitch_hz"),
                "f0_std_hz": part_f0_std
            }
        },
        {
            "dimension": "Volume & Projection",
            "score": scores["volume"],
            "weight": weights["volume"],
            "weighted_score": round(scores["volume"] * weights["volume"], 1),
            "justification": f"Measured energy stability, sentence-tail volume retention, and SNR ({part_summary.get('snr_db', 0):.1f} dB).",
            "key_metrics": {
                "rms_mean": part_summary.get("rms_mean", 0),
                "snr_db": part_summary.get("snr_db", 0),
                "clipping": part_summary.get("clipping_detected", False)
            }
        },
        {
            "dimension": "Pronunciation & Clarity",
            "score": scores["pronunciation"],
            "weight": weights["pronunciation"],
            "weighted_score": round(scores["pronunciation"] * weights["pronunciation"], 1),
            "justification": f"Assessed word articulation duration fidelity and consonant onset clarity against reference model. {pron_flaws:.0f} potential slurs flagged.",
            "key_metrics": {
                "articulation_flaws": pron_flaws
            }
        },
        {
            "dimension": "Emphasis & Expressiveness",
            "score": scores["emphasis"],
            "weight": weights["emphasis"],
            "weighted_score": round(scores["emphasis"] * weights["emphasis"], 1),
            "justification": "Measured rhetorical dynamic range across key thematic words and spectral contrast.",
            "key_metrics": {
                "spectral_centroid_hz": part_summary.get("spectral_centroid_mean")
            }
        }
    ]

    return {
        "overall_score": overall,
        "pacing_score": scores["pacing"],
        "pitch_score": scores["pitch"],
        "volume_score": scores["volume"],
        "pronunciation_score": scores["pronunciation"],
        "emphasis_score": scores["emphasis"],
        "weights": weights,
        "dimensions": dimensions,
        "scoring_version": "rubric_v1.0"
    }
