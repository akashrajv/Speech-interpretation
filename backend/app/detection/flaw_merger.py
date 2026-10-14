from typing import List, Dict, Any
from backend.app.detection.rate_detector import detect_speaking_rate_flaws
from backend.app.detection.pause_detector import detect_pause_flaws
from backend.app.detection.pitch_detector import detect_pitch_flaws
from backend.app.detection.loudness_detector import detect_loudness_flaws
from backend.app.detection.pronunciation_detector import detect_pronunciation_mismatches
from backend.app.detection.acoustic_detector import detect_acoustic_deviations

def calculate_temporal_iou(start1: float, end1: float, start2: float, end2: float) -> float:
    """Calculates 1D Intersection-over-Union for two temporal intervals."""
    intersection = max(0.0, min(end1, end2) - max(start1, start2))
    union = max(end1, end2) - min(start1, start2)
    return (intersection / union) if union > 0 else 0.0

def merge_overlapping_flaws(flaws: List[Dict[str, Any]], iou_threshold: float = 0.70) -> List[Dict[str, Any]]:
    """
    Deduplicates and merges flaws of the same category with high temporal overlap.
    """
    if not flaws:
        return []

    # Sort by category and start time
    sorted_flaws = sorted(flaws, key=lambda f: (f["category"], f["start_seconds"]))
    merged: List[Dict[str, Any]] = []

    for flaw in sorted_flaws:
        if not merged:
            merged.append(flaw)
            continue

        prev = merged[-1]
        if prev["category"] == flaw["category"]:
            iou = calculate_temporal_iou(
                prev["start_seconds"], prev["end_seconds"],
                flaw["start_seconds"], flaw["end_seconds"]
            )
            if iou >= iou_threshold:
                # Merge into previous with wider interval and highest severity
                prev["start_seconds"] = min(prev["start_seconds"], flaw["start_seconds"])
                prev["end_seconds"] = max(prev["end_seconds"], flaw["end_seconds"])
                if flaw["severity"] == "high" or (flaw["severity"] == "medium" and prev["severity"] == "low"):
                    prev["severity"] = flaw["severity"]
                continue

        merged.append(flaw)

    # Sort final list chronologically by start time
    return sorted(merged, key=lambda f: f["start_seconds"])

def run_flaw_detection_pipeline(
    part_summary: Dict[str, Any],
    ref_summary: Dict[str, Any],
    part_pitch: Dict[str, Any],
    ref_pitch: Dict[str, Any],
    part_rms: Dict[str, Any],
    ref_rms: Dict[str, Any],
    part_pauses: List[Dict[str, Any]],
    ref_pauses: List[Dict[str, Any]],
    part_alignments: List[Dict[str, Any]],
    ref_alignments: List[Dict[str, Any]],
    matched_segments: List[Dict[str, Any]],
    mfcc_dist: Dict[str, float],
    audio_duration: float
) -> List[Dict[str, Any]]:
    """
    Runs all 6 detector categories, merges overlaps, and enforces duration bounds.
    """
    all_flaws = []

    # 1. Speaking rate flaws
    all_flaws.extend(detect_speaking_rate_flaws(matched_segments, part_summary, ref_summary))

    # 2. Pause flaws (excessive & misplaced)
    all_flaws.extend(detect_pause_flaws(part_pauses, part_alignments, ref_pauses))

    # 3. Pitch flaws (flat intonation & abrupt breaks)
    all_flaws.extend(detect_pitch_flaws(part_pitch, ref_pitch, matched_segments))

    # 4. Loudness flaws (inconsistent loudness & trailing off)
    all_flaws.extend(detect_loudness_flaws(part_rms, ref_rms, matched_segments))

    # 5. Articulation & pronunciation mismatches
    all_flaws.extend(detect_pronunciation_mismatches(part_alignments, ref_alignments))

    # 6. Acoustic / spectral deviations
    all_flaws.extend(detect_acoustic_deviations(matched_segments, mfcc_dist))

    # Bounds check
    sanitized = []
    for f in all_flaws:
        f_start = max(0.0, f["start_seconds"])
        f_end = min(audio_duration, f["end_seconds"])
        if f_end > f_start + 0.1:
            f["start_seconds"] = round(float(f_start), 2)
            f["end_seconds"] = round(float(f_end), 2)
            sanitized.append(f)

    # Merge overlaps
    return merge_overlapping_flaws(sanitized)
