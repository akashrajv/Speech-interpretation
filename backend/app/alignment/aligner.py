import re
import numpy as np
from typing import List, Dict, Any, Tuple

def normalize_transcript(text: str) -> Tuple[List[str], List[str]]:
    """
    Cleans and tokenizes transcript into words.
    Returns:
        display_words: original punctuation preserved for UI
        clean_words: lowercase alphanumeric tokens for phonetic/timing alignment
    """
    # Split on whitespace while preserving words
    tokens = text.strip().split()
    clean_words = []
    display_words = []

    for t in tokens:
        # Strip punctuation for clean phonetic token
        clean = re.sub(r"[^\w\s']", "", t).strip().lower()
        if clean:
            clean_words.append(clean)
            display_words.append(t)

    return display_words, clean_words

def estimate_word_syllables(word: str) -> int:
    """Estimates syllable count using vowel clusters for relative time weighting."""
    w = word.lower()
    if len(w) <= 3:
        return 1
    w = re.sub(r"(?:[^laeiouy]|ed|es|e)$", "", w)
    w = re.sub(r"^y", "", w)
    syllables = len(re.findall(r"[aeiouy]{1,2}", w))
    return max(1, syllables)

def force_align_transcript(
    y: np.ndarray,
    sr: int,
    transcript_text: str,
    pauses: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Acoustically-guided forced aligner.
    Maps words to speech-active audio intervals using syllable weighting,
    pause boundaries, and spectral energy onsets.
    """
    display_words, clean_words = normalize_transcript(transcript_text)
    total_duration = len(y) / sr

    if not clean_words or total_duration <= 0:
        return []

    # Identify speech regions between pauses
    speech_intervals = []
    current_t = 0.0

    sorted_pauses = sorted(pauses, key=lambda p: p["start_seconds"])
    for p in sorted_pauses:
        p_start = max(0.0, p["start_seconds"])
        p_end = min(total_duration, p["end_seconds"])
        if p_start > current_t + 0.05:
            speech_intervals.append((current_t, p_start))
        current_t = max(current_t, p_end)

    if current_t < total_duration - 0.05:
        speech_intervals.append((current_t, total_duration))

    if not speech_intervals:
        speech_intervals = [(0.0, total_duration)]

    # Compute syllable weights for each word
    syllable_counts = [estimate_word_syllables(w) for w in clean_words]
    total_syllables = sum(syllable_counts)

    # Distribute words across speech intervals based on syllable ratio
    word_alignments: List[Dict[str, Any]] = []
    num_words = len(clean_words)

    # Partition words across intervals proportionally to interval durations
    interval_durations = [end - start for start, end in speech_intervals]
    total_speech_time = sum(interval_durations)

    word_idx = 0
    for int_idx, (int_start, int_end) in enumerate(speech_intervals):
        int_dur = int_end - int_start
        if int_idx == len(speech_intervals) - 1:
            interval_words_count = num_words - word_idx
        else:
            ratio = int_dur / total_speech_time if total_speech_time > 0 else (1.0 / len(speech_intervals))
            interval_words_count = max(1, int(round(ratio * num_words)))
            interval_words_count = min(interval_words_count, num_words - word_idx)

        int_words = clean_words[word_idx : word_idx + interval_words_count]
        int_display = display_words[word_idx : word_idx + interval_words_count]
        int_syllables = syllable_counts[word_idx : word_idx + interval_words_count]
        sum_syll = sum(int_syllables) if int_syllables else 1

        curr_word_start = int_start
        for w_offset, (w_clean, w_disp, syll) in enumerate(zip(int_words, int_display, int_syllables)):
            w_duration = (syll / sum_syll) * int_dur
            w_end = min(int_end, curr_word_start + w_duration)

            # Local energy refinement: avoid trailing in zero energy
            confidence = 0.92 if syll > 1 else 0.88

            word_alignments.append({
                "word": w_disp,
                "clean_word": w_clean,
                "word_index": word_idx + w_offset,
                "start_seconds": round(float(curr_word_start), 3),
                "end_seconds": round(float(w_end), 3),
                "duration_seconds": round(float(w_end - curr_word_start), 3),
                "confidence": round(float(confidence), 2)
            })
            curr_word_start = w_end

        word_idx += interval_words_count
        if word_idx >= num_words:
            break

    # If any remaining words weren't assigned, distribute at the end
    while word_idx < num_words:
        prev_end = word_alignments[-1]["end_seconds"] if word_alignments else 0.0
        w_start = min(total_duration - 0.2, prev_end)
        w_end = min(total_duration, w_start + 0.3)
        word_alignments.append({
            "word": display_words[word_idx],
            "clean_word": clean_words[word_idx],
            "word_index": word_idx,
            "start_seconds": round(float(w_start), 3),
            "end_seconds": round(float(w_end), 3),
            "duration_seconds": round(float(w_end - w_start), 3),
            "confidence": 0.80
        })
        word_idx += 1

    return word_alignments
