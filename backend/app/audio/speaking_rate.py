from typing import Dict, Any, List

def compute_speaking_rate(
    word_count: int,
    total_duration_seconds: float,
    speech_active_duration_seconds: float
) -> Dict[str, Any]:
    """
    Computes overall WPM based on total duration and speech-active duration.
    Consistently documents and returns both definitions.
    """
    if total_duration_seconds <= 0 or word_count <= 0:
        return {
            "speaking_rate_wpm": 0.0,
            "active_speaking_rate_wpm": 0.0,
            "word_count": word_count,
            "total_duration": total_duration_seconds,
            "speech_active_duration": speech_active_duration_seconds
        }

    total_minutes = total_duration_seconds / 60.0
    active_minutes = max(speech_active_duration_seconds, 1.0) / 60.0

    wpm_total = word_count / total_minutes
    wpm_active = word_count / active_minutes

    return {
        "speaking_rate_wpm": round(float(wpm_total), 1),
        "active_speaking_rate_wpm": round(float(wpm_active), 1),
        "word_count": word_count,
        "total_duration": round(float(total_duration_seconds), 2),
        "speech_active_duration": round(float(speech_active_duration_seconds), 2)
    }

def compute_segment_speaking_rates(
    word_alignments: List[Dict[str, Any]],
    window_words: int = 6
) -> List[Dict[str, Any]]:
    """
    Computes rolling segment-level WPM across aligned word sequences.
    """
    if len(word_alignments) < 2:
        return []

    segments = []
    step = max(1, window_words // 2)

    for i in range(0, len(word_alignments) - window_words + 1, step):
        window = word_alignments[i : i + window_words]
        start_time = window[0]["start_seconds"]
        end_time = window[-1]["end_seconds"]
        seg_duration = end_time - start_time
        seg_words = " ".join([w["word"] for w in window])

        if seg_duration > 0.3:
            wpm = (len(window) / (seg_duration / 60.0))
            segments.append({
                "start_seconds": round(float(start_time), 2),
                "end_seconds": round(float(end_time), 2),
                "text_segment": seg_words,
                "word_count": len(window),
                "duration_seconds": round(float(seg_duration), 2),
                "wpm": round(float(wpm), 1)
            })

    return segments
