import pytest
import numpy as np

from backend.app.alignment.aligner import normalize_transcript, force_align_transcript
from backend.app.alignment.transcript_mapping import segment_transcript_into_phrases, match_reference_and_participant_segments
from backend.app.detection.rate_detector import detect_speaking_rate_flaws
from backend.app.detection.pause_detector import detect_pause_flaws
from backend.app.detection.pitch_detector import detect_pitch_flaws
from backend.app.detection.flaw_merger import calculate_temporal_iou, merge_overlapping_flaws
from backend.app.scoring.rubric import calculate_rubric_scores
from backend.app.evaluation.metrics import evaluate_flaw_detections

def test_transcript_alignment():
    text = "To be, or not to be, that is the question."
    disp, clean = normalize_transcript(text)
    assert len(clean) == 10
    assert clean[0] == "to"

    # Mock audio (5 seconds)
    sr = 16000
    y = np.ones(5 * sr, dtype=np.float32)
    pauses = [{"start_seconds": 2.2, "end_seconds": 2.7, "duration_seconds": 0.5}]

    alignments = force_align_transcript(y, sr, text, pauses)
    assert len(alignments) == 10
    assert alignments[0]["start_seconds"] >= 0.0
    assert alignments[-1]["end_seconds"] <= 5.0
    # Chronological ordering
    for i in range(len(alignments) - 1):
        assert alignments[i]["start_seconds"] <= alignments[i+1]["start_seconds"]

def test_segment_matching():
    aligns_ref = [
        {"word": "To", "word_index": 0, "start_seconds": 0.0, "end_seconds": 0.3},
        {"word": "be,", "word_index": 1, "start_seconds": 0.3, "end_seconds": 0.8},
        {"word": "or", "word_index": 2, "start_seconds": 1.2, "end_seconds": 1.4},
        {"word": "not", "word_index": 3, "start_seconds": 1.4, "end_seconds": 1.7},
        {"word": "to", "word_index": 4, "start_seconds": 1.7, "end_seconds": 1.9},
        {"word": "be,", "word_index": 5, "start_seconds": 1.9, "end_seconds": 2.4},
    ]
    # Participant speaks much faster
    aligns_part = [
        {"word": "To", "word_index": 0, "start_seconds": 0.0, "end_seconds": 0.15},
        {"word": "be,", "word_index": 1, "start_seconds": 0.15, "end_seconds": 0.35},
        {"word": "or", "word_index": 2, "start_seconds": 0.45, "end_seconds": 0.6},
        {"word": "not", "word_index": 3, "start_seconds": 0.6, "end_seconds": 0.75},
        {"word": "to", "word_index": 4, "start_seconds": 0.75, "end_seconds": 0.9},
        {"word": "be,", "word_index": 5, "start_seconds": 0.9, "end_seconds": 1.1},
    ]

    matched = match_reference_and_participant_segments(aligns_ref, aligns_part, words_per_phrase=2)
    assert len(matched) >= 1
    # Participant should be identified as faster (positive WPM deviation)
    assert matched[0]["wpm_deviation_percent"] > 0

def test_flaw_detectors():
    # Rate flaw detection
    matched = [{
        "text": "To be,",
        "participant_start": 0.0,
        "participant_end": 0.35,
        "participant_wpm": 210.0,
        "reference_wpm": 135.0,
        "wpm_deviation_percent": 55.5,
        "participant_duration": 0.35,
        "reference_duration": 0.8
    }]
    flaws = detect_speaking_rate_flaws(matched, {}, {})
    assert len(flaws) == 1
    assert flaws[0]["category"] == "excessive_speaking_rate"
    assert flaws[0]["severity"] == "high"

    # Pause flaw detection
    pauses = [{"start_seconds": 3.0, "end_seconds": 4.9, "duration_seconds": 1.9}]
    aligns = [
        {"word": "question:", "start_seconds": 2.5, "end_seconds": 3.0},
        {"word": "Whether", "start_seconds": 4.9, "end_seconds": 5.4}
    ]
    pause_flaws = detect_pause_flaws(pauses, aligns, [{"duration_seconds": 0.6}])
    assert len(pause_flaws) == 1
    assert pause_flaws[0]["category"] == "excessive_pause"

def test_rubric_scoring_reproducibility():
    part_summary = {
        "speaking_rate_wpm": 142.0,
        "pitch_variability_hz": 24.0,
        "rms_mean": 0.12,
        "snr_db": 28.0,
        "clipping_detected": False,
        "pause_count": 4,
        "average_pause_seconds": 0.55
    }
    ref_summary = {
        "speaking_rate_wpm": 138.0,
        "pitch_variability_hz": 26.0,
        "rms_mean": 0.13,
        "snr_db": 30.0,
        "clipping_detected": False
    }
    flaws = []

    res1 = calculate_rubric_scores(part_summary, ref_summary, flaws)
    res2 = calculate_rubric_scores(part_summary, ref_summary, flaws)

    # Strictly reproducible
    assert res1["overall_score"] == res2["overall_score"]
    assert res1["overall_score"] >= 90.0

def test_temporal_iou_and_metrics():
    # Overlapping intervals
    iou = calculate_temporal_iou(1.0, 3.0, 2.0, 4.0)
    assert abs(iou - (1.0 / 3.0)) < 1e-4

    # Non-overlapping
    iou_zero = calculate_temporal_iou(1.0, 2.0, 2.5, 4.0)
    assert iou_zero == 0.0

    # Ground truth vs predicted evaluation
    gt = [
        {"dataset_sample_id": "s1", "flaw_category": "excessive_speaking_rate", "start_seconds": 1.0, "end_seconds": 3.0, "text_segment": "rapid phrase"}
    ]
    pred = [
        {"category": "excessive_speaking_rate", "start_seconds": 1.2, "end_seconds": 2.9, "text_segment": "rapid phrase"}
    ]
    eval_res = evaluate_flaw_detections(gt, pred, iou_threshold=0.3)
    assert eval_res["overall_precision"] == 1.0
    assert eval_res["overall_recall"] == 1.0
    assert eval_res["overall_f1_score"] == 1.0
