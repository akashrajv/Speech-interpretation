import os
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.models import (
    SpeechAnalysis,
    AudioRecording,
    Transcript,
    WordAlignment,
    AcousticFeatureSummary,
    DetectedFlaw,
    RubricScore,
    GeminiInterpretation,
)
from backend.app.audio.preprocessing import preprocess_and_save_audio, decode_and_resample
from backend.app.audio.waveform import compute_waveform_envelope, compute_rms_series
from backend.app.audio.fft_analysis import compute_spectral_features
from backend.app.audio.mfcc_analysis import compute_mfcc_features, compute_mfcc_distance
from backend.app.audio.pitch_analysis import compute_pitch_features
from backend.app.audio.pause_detection import detect_pauses
from backend.app.audio.speaking_rate import compute_speaking_rate, compute_segment_speaking_rates
from backend.app.alignment.aligner import normalize_transcript, force_align_transcript
from backend.app.alignment.transcript_mapping import match_reference_and_participant_segments
from backend.app.detection.flaw_merger import run_flaw_detection_pipeline
from backend.app.scoring.rubric import calculate_rubric_scores
from backend.app.feedback.gemini_interpreter import interpret_with_gemini

logger = logging.getLogger(__name__)

def run_speech_analysis_pipeline(
    analysis_id: str,
    participant_audio_path: str,
    reference_audio_path: str = None,
    transcript_text: str = "",
    title: str = "Speech Evaluation",
    speech_category: str = "Persuasive Oratory",
    speaker_id: str = None,
    trigger_gemini: bool = True,
    db: Session = None
) -> SpeechAnalysis:
    """
    End-to-end processing pipeline for a speech evaluation job.
    Calculates acoustic features, forced alignments, matched segments,
    temporal flaws, rubric scores, and Gemini interpretation.
    """
    analysis = db.query(SpeechAnalysis).filter(SpeechAnalysis.id == analysis_id).first()
    if not analysis:
        raise ValueError(f"Analysis {analysis_id} not found")

    try:
        analysis.status = "processing"
        db.commit()

        # 1. Preprocess participant audio
        part_proc_path = os.path.join(settings.PROCESSED_STORAGE_DIR, f"{analysis_id}_part.wav")
        part_meta = preprocess_and_save_audio(participant_audio_path, part_proc_path)
        y_part, sr_part, part_dur = decode_and_resample(part_proc_path)

        analysis.duration_seconds = part_dur

        # Record participant audio metadata
        part_rec = AudioRecording(
            analysis_id=analysis_id,
            role="participant",
            original_filename=os.path.basename(participant_audio_path),
            file_path=participant_audio_path,
            processed_path=part_proc_path,
            sample_rate=part_meta["sample_rate"],
            duration_seconds=part_dur,
            speech_active_duration=part_meta["speech_active_duration"],
            snr_db=part_meta["snr_db"],
            clipping_detected=part_meta["clipping_detected"]
        )
        db.add(part_rec)

        # 2. Preprocess reference audio if provided
        has_reference = bool(reference_audio_path and os.path.exists(reference_audio_path))
        analysis.has_reference = has_reference

        y_ref, sr_ref, ref_dur = None, 16000, 0.0
        ref_meta = {}
        if has_reference:
            ref_proc_path = os.path.join(settings.PROCESSED_STORAGE_DIR, f"{analysis_id}_ref.wav")
            ref_meta = preprocess_and_save_audio(reference_audio_path, ref_proc_path)
            y_ref, sr_ref, ref_dur = decode_and_resample(ref_proc_path)

            ref_rec = AudioRecording(
                analysis_id=analysis_id,
                role="reference",
                original_filename=os.path.basename(reference_audio_path),
                file_path=reference_audio_path,
                processed_path=ref_proc_path,
                sample_rate=ref_meta["sample_rate"],
                duration_seconds=ref_dur,
                speech_active_duration=ref_meta["speech_active_duration"],
                snr_db=ref_meta["snr_db"],
                clipping_detected=ref_meta["clipping_detected"]
            )
            db.add(ref_rec)

        # 3. Transcript Handling
        if not transcript_text or not transcript_text.strip():
            logger.info("Transcript omitted by user. Auto-generating transcript from participant audio...")
            from backend.app.audio.transcription import auto_transcribe_audio
            transcript_text = auto_transcribe_audio(participant_audio_path, speech_category)

        display_words, clean_words = normalize_transcript(transcript_text)
        word_count = len(clean_words)

        transcript_obj = Transcript(
            analysis_id=analysis_id,
            raw_text=transcript_text,
            normalized_text=" ".join(clean_words),
            word_count=word_count
        )
        db.add(transcript_obj)

        # 4. Feature Extraction - Participant
        part_rms = compute_rms_series(y_part, sr_part)
        part_pauses_res = detect_pauses(y_part, sr_part)
        part_pitch = compute_pitch_features(y_part, sr_part)
        part_spectral = compute_spectral_features(y_part, sr_part)
        part_mfcc = compute_mfcc_features(y_part, sr_part)
        part_rate = compute_speaking_rate(word_count, part_dur, part_meta["speech_active_duration"])

        # Forced Alignment - Participant
        part_alignments = force_align_transcript(y_part, sr_part, transcript_text, part_pauses_res["pauses"])
        part_seg_rates = compute_segment_speaking_rates(part_alignments)

        for item in part_alignments:
            db.add(WordAlignment(
                analysis_id=analysis_id,
                role="participant",
                word=item["word"],
                word_index=item["word_index"],
                start_seconds=item["start_seconds"],
                end_seconds=item["end_seconds"],
                confidence=item["confidence"]
            ))

        part_series_dict = {
            "time_stamps": part_rms["times"],
            "rms_envelope": part_rms["rms"],
            "pitch_contour": part_pitch["contour"],
            "spectral_centroid": part_spectral["centroid_series"],
            "speaking_rate_series": part_seg_rates,
            "pauses": part_pauses_res["pauses"],
            "mfcc_heatmaps": part_mfcc["heatmap"],
            "spectrogram_summary": part_spectral["spectrogram"]
        }

        part_summary_obj = AcousticFeatureSummary(
            analysis_id=analysis_id,
            role="participant",
            duration_seconds=part_dur,
            speaking_rate_wpm=part_rate["speaking_rate_wpm"],
            median_pitch_hz=part_pitch["median_pitch_hz"],
            pitch_variability_hz=part_pitch["pitch_variability_hz"],
            pitch_min_hz=part_pitch["pitch_min_hz"],
            pitch_max_hz=part_pitch["pitch_max_hz"],
            pause_count=part_pauses_res["pause_count"],
            average_pause_seconds=part_pauses_res["average_pause_seconds"],
            silence_ratio=part_pauses_res["silence_ratio"],
            rms_mean=part_rms["mean"],
            rms_std=part_rms["std"],
            spectral_centroid_mean=part_spectral["centroid_mean"],
            spectral_bandwidth_mean=part_spectral["bandwidth_mean"],
            spectral_rolloff_mean=part_spectral["rolloff_mean"],
            feature_series_json=json.dumps(part_series_dict)
        )
        db.add(part_summary_obj)

        # 5. Feature Extraction - Reference (if available)
        ref_summary_dict = {}
        ref_alignments = []
        mfcc_dist = {"cosine_distance": 0.0, "dtw_distance": 0.0}
        ref_pitch = {"contour": [], "times": []}
        ref_rms = {"rms": [], "times": [], "mean": 0.0}
        ref_pauses = []

        if has_reference and y_ref is not None:
            ref_rms = compute_rms_series(y_ref, sr_ref)
            ref_pauses_res = detect_pauses(y_ref, sr_ref)
            ref_pauses = ref_pauses_res["pauses"]
            ref_pitch = compute_pitch_features(y_ref, sr_ref)
            ref_spectral = compute_spectral_features(y_ref, sr_ref)
            ref_mfcc = compute_mfcc_features(y_ref, sr_ref)
            ref_rate = compute_speaking_rate(word_count, ref_dur, ref_meta.get("speech_active_duration", ref_dur))

            ref_alignments = force_align_transcript(y_ref, sr_ref, transcript_text, ref_pauses)
            ref_seg_rates = compute_segment_speaking_rates(ref_alignments)

            for item in ref_alignments:
                db.add(WordAlignment(
                    analysis_id=analysis_id,
                    role="reference",
                    word=item["word"],
                    word_index=item["word_index"],
                    start_seconds=item["start_seconds"],
                    end_seconds=item["end_seconds"],
                    confidence=item["confidence"]
                ))

            mfcc_dist = compute_mfcc_distance(ref_mfcc["raw_mfcc"], part_mfcc["raw_mfcc"])

            ref_series_dict = {
                "time_stamps": ref_rms["times"],
                "rms_envelope": ref_rms["rms"],
                "pitch_contour": ref_pitch["contour"],
                "spectral_centroid": ref_spectral["centroid_series"],
                "speaking_rate_series": ref_seg_rates,
                "pauses": ref_pauses,
                "mfcc_heatmaps": ref_mfcc["heatmap"],
                "spectrogram_summary": ref_spectral["spectrogram"]
            }

            ref_summary_dict = {
                "duration_seconds": ref_dur,
                "speaking_rate_wpm": ref_rate["speaking_rate_wpm"],
                "median_pitch_hz": ref_pitch["median_pitch_hz"],
                "pitch_variability_hz": ref_pitch["pitch_variability_hz"],
                "pause_count": ref_pauses_res["pause_count"],
                "average_pause_seconds": ref_pauses_res["average_pause_seconds"],
                "silence_ratio": ref_pauses_res["silence_ratio"],
                "rms_mean": ref_rms["mean"],
                "snr_db": ref_meta.get("snr_db", 25.0),
                "clipping_detected": ref_meta.get("clipping_detected", False)
            }

            ref_summary_obj = AcousticFeatureSummary(
                analysis_id=analysis_id,
                role="reference",
                duration_seconds=ref_dur,
                speaking_rate_wpm=ref_rate["speaking_rate_wpm"],
                median_pitch_hz=ref_pitch["median_pitch_hz"],
                pitch_variability_hz=ref_pitch["pitch_variability_hz"],
                pitch_min_hz=ref_pitch["pitch_min_hz"],
                pitch_max_hz=ref_pitch["pitch_max_hz"],
                pause_count=ref_pauses_res["pause_count"],
                average_pause_seconds=ref_pauses_res["average_pause_seconds"],
                silence_ratio=ref_pauses_res["silence_ratio"],
                rms_mean=ref_rms["mean"],
                rms_std=ref_rms["std"],
                spectral_centroid_mean=ref_spectral["centroid_mean"],
                spectral_bandwidth_mean=ref_spectral["bandwidth_mean"],
                spectral_rolloff_mean=ref_spectral["rolloff_mean"],
                feature_series_json=json.dumps(ref_series_dict)
            )
            db.add(ref_summary_obj)
        else:
            # Standalone defaults for participant-only evaluation
            ref_summary_dict = {
                "duration_seconds": part_dur,
                "speaking_rate_wpm": 140.0,
                "median_pitch_hz": part_pitch.get("median_pitch_hz"),
                "pitch_variability_hz": 28.0,
                "pause_count": max(1, int(part_dur / 4.0)),
                "average_pause_seconds": 0.65,
                "silence_ratio": 0.18,
                "rms_mean": part_rms["mean"],
                "snr_db": 25.0,
                "clipping_detected": False
            }

        # 6. Segment Matching
        matched_segments = match_reference_and_participant_segments(
            ref_alignments=ref_alignments if ref_alignments else part_alignments,
            part_alignments=part_alignments
        )

        part_summary_dict = {
            "duration_seconds": part_dur,
            "speaking_rate_wpm": part_rate["speaking_rate_wpm"],
            "median_pitch_hz": part_pitch["median_pitch_hz"],
            "pitch_variability_hz": part_pitch["pitch_variability_hz"],
            "pause_count": part_pauses_res["pause_count"],
            "average_pause_seconds": part_pauses_res["average_pause_seconds"],
            "silence_ratio": part_pauses_res["silence_ratio"],
            "rms_mean": part_rms["mean"],
            "snr_db": part_meta.get("snr_db", 25.0),
            "clipping_detected": part_meta.get("clipping_detected", False)
        }

        # 7. Flaw Detection Engine
        flaws = run_flaw_detection_pipeline(
            part_summary=part_summary_dict,
            ref_summary=ref_summary_dict,
            part_pitch=part_pitch,
            ref_pitch=ref_pitch,
            part_rms=part_rms,
            ref_rms=ref_rms,
            part_pauses=part_pauses_res["pauses"],
            ref_pauses=ref_pauses,
            part_alignments=part_alignments,
            ref_alignments=ref_alignments if ref_alignments else part_alignments,
            matched_segments=matched_segments,
            mfcc_dist=mfcc_dist,
            audio_duration=part_dur
        )

        for f in flaws:
            db.add(DetectedFlaw(
                analysis_id=analysis_id,
                flaw_id=f["flaw_id"],
                category=f["category"],
                start_seconds=f["start_seconds"],
                end_seconds=f["end_seconds"],
                text_segment=f["text_segment"],
                reference_value=f.get("reference_value"),
                participant_value=f.get("participant_value"),
                unit=f["unit"],
                deviation_percent=f.get("deviation_percent"),
                severity=f["severity"],
                confidence=f["confidence"],
                evidence_json=json.dumps(f.get("evidence", [])),
                explanation=f["explanation"],
                recommendation=f["recommendation"]
            ))

        # 8. Rubric Scoring
        weights = {
            "pacing": settings.WEIGHT_PACING,
            "pitch": settings.WEIGHT_PITCH,
            "volume": settings.WEIGHT_VOLUME,
            "pronunciation": settings.WEIGHT_PRONUNCIATION,
            "emphasis": settings.WEIGHT_EMPHASIS,
        }
        rubric_res = calculate_rubric_scores(
            part_summary=part_summary_dict,
            ref_summary=ref_summary_dict,
            flaws=flaws,
            weights=weights,
            has_reference=has_reference
        )

        analysis.overall_score = rubric_res["overall_score"]

        db.add(RubricScore(
            analysis_id=analysis_id,
            overall_score=rubric_res["overall_score"],
            pacing_score=rubric_res["pacing_score"],
            pitch_score=rubric_res["pitch_score"],
            volume_score=rubric_res["volume_score"],
            pronunciation_score=rubric_res["pronunciation_score"],
            emphasis_score=rubric_res["emphasis_score"],
            weights_json=json.dumps(rubric_res["weights"]),
            dimension_justifications_json=json.dumps(rubric_res["dimensions"]),
            scoring_version="rubric_v1.0"
        ))

        # 9. Gemini Coaching or Deterministic Fallback
        gemini_res = interpret_with_gemini(
            speech_category=speech_category,
            overall_score=rubric_res["overall_score"],
            transcript_text=transcript_text,
            flaws=flaws,
            rubric_score=rubric_res,
            part_summary=part_summary_dict,
            ref_summary=ref_summary_dict
        )

        db.add(GeminiInterpretation(
            analysis_id=analysis_id,
            model_used=gemini_res["model_used"],
            summary=gemini_res["summary"],
            speech_context_json=json.dumps(gemini_res.get("speech_context")) if gemini_res.get("speech_context") else None,
            strengths_json=json.dumps(gemini_res.get("strengths", [])),
            interpretations_json=json.dumps(gemini_res.get("interpretations", [])),
            overall_recommendations_json=json.dumps(gemini_res.get("overall_recommendations", [])),
            limitations_json=json.dumps(gemini_res.get("limitations", [])),
            is_deterministic_fallback=gemini_res.get("is_deterministic_fallback", False)
        ))

        analysis.status = "completed"
        db.commit()
        db.refresh(analysis)
        logger.info(f"Analysis {analysis_id} completed successfully. Score: {rubric_res['overall_score']}, Flaws: {len(flaws)}")
        return analysis

    except Exception as e:
        logger.exception(f"Analysis {analysis_id} failed: {str(e)}")
        analysis.status = "failed"
        analysis.error_message = str(e)
        db.commit()
        raise e
