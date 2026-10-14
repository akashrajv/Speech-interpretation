import re
from typing import List, Dict, Any

def segment_transcript_into_phrases(
    alignments: List[Dict[str, Any]],
    words_per_phrase: int = 5
) -> List[Dict[str, Any]]:
    """
    Groups aligned words into logical phrases based on punctuation marks
    (',', '.', '!', '?', ';', ':') or max word length.
    """
    if not alignments:
        return []

    phrases = []
    current_words = []
    phrase_start = alignments[0]["start_seconds"]

    for i, item in enumerate(alignments):
        current_words.append(item)
        word_text = item["word"]
        has_break = bool(re.search(r"[,.!?;:\u2014]", word_text)) or len(current_words) >= words_per_phrase

        if has_break or i == len(alignments) - 1:
            phrase_end = item["end_seconds"]
            phrase_str = " ".join([w["word"] for w in current_words])
            duration = max(0.1, phrase_end - phrase_start)
            wpm = len(current_words) / (duration / 60.0)

            phrases.append({
                "phrase_index": len(phrases),
                "text": phrase_str,
                "start_seconds": round(float(phrase_start), 2),
                "end_seconds": round(float(phrase_end), 2),
                "duration_seconds": round(float(duration), 2),
                "word_count": len(current_words),
                "wpm": round(float(wpm), 1),
                "word_indices": [w["word_index"] for w in current_words]
            })

            current_words = []
            if i < len(alignments) - 1:
                phrase_start = alignments[i + 1]["start_seconds"]

    return phrases

def match_reference_and_participant_segments(
    ref_alignments: List[Dict[str, Any]],
    part_alignments: List[Dict[str, Any]],
    words_per_phrase: int = 5
) -> List[Dict[str, Any]]:
    """
    Matches reference phrases to participant phrases based on aligned word index spans.
    Computes comparative metrics: duration deviation, WPM deviation, and alignment consistency.
    """
    ref_phrases = segment_transcript_into_phrases(ref_alignments, words_per_phrase)
    part_phrases = segment_transcript_into_phrases(part_alignments, words_per_phrase)

    matched_pairs = []
    num_phrases = min(len(ref_phrases), len(part_phrases))

    for idx in range(num_phrases):
        ref_p = ref_phrases[idx]
        part_p = part_phrases[idx]

        wpm_delta = ((part_p["wpm"] - ref_p["wpm"]) / ref_p["wpm"] * 100.0) if ref_p["wpm"] > 0 else 0.0
        dur_delta = ((part_p["duration_seconds"] - ref_p["duration_seconds"]) / ref_p["duration_seconds"] * 100.0) if ref_p["duration_seconds"] > 0 else 0.0

        matched_pairs.append({
            "segment_index": idx,
            "text": part_p["text"],
            "reference_start": ref_p["start_seconds"],
            "reference_end": ref_p["end_seconds"],
            "reference_wpm": ref_p["wpm"],
            "reference_duration": ref_p["duration_seconds"],
            "participant_start": part_p["start_seconds"],
            "participant_end": part_p["end_seconds"],
            "participant_wpm": part_p["wpm"],
            "participant_duration": part_p["duration_seconds"],
            "wpm_deviation_percent": round(float(wpm_delta), 1),
            "duration_deviation_percent": round(float(dur_delta), 1),
            "word_count": part_p["word_count"]
        })

    return matched_pairs
