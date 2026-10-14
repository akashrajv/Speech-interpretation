import os
import io
import csv
import json
import uuid
import shutil
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.core.config import settings
from backend.app.database.session import get_db, Base, engine
from backend.app.models.models import (
    SpeechAnalysis,
    AudioRecording,
    Transcript,
    WordAlignment,
    AcousticFeatureSummary,
    DetectedFlaw,
    RubricScore,
    DatasetSample,
    HumanAnnotation,
    GeminiInterpretation,
)
from backend.app.schemas.schemas import (
    HealthResponse,
    ModelStatusResponse,
    AnalysisListItem,
    AnalysisDetailResponse,
    AcousticSummary,
    FeatureSeries,
    WordAlignmentItem,
    FlawItem,
    EvidenceItem,
    RubricScoreBreakdown,
    DimensionScore,
    SpeechContextAnalysis,
    GeminiInterpretationResponse,
    FlawInterpretation,
    DatasetSampleCreate,
    DatasetSampleResponse,
    HumanAnnotationCreate,
    HumanAnnotationResponse,
    ValidationReportResponse,
    SettingsResponse,
    SettingsUpdateRequest,
)
from backend.app.services.analysis_service import run_speech_analysis_pipeline
from backend.app.evaluation.metrics import evaluate_flaw_detections
from backend.app.utils.sample_generator import create_sample_preset_data

router = APIRouter()

# --- Health & Models ---
@router.get("/health", response_model=HealthResponse)
def get_health(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.execute(func.now())
    except Exception:
        db_ok = False

    gemini_key = os.getenv("GEMINI_API_KEY", settings.GEMINI_API_KEY)
    gemini_enabled = os.getenv("ENABLE_GEMINI", str(settings.ENABLE_GEMINI)).lower() in ("true", "1", "yes")

    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "gemini_enabled": gemini_enabled,
        "gemini_configured": bool(gemini_key),
        "database_connected": db_ok,
        "audio_storage_path": settings.AUDIO_STORAGE_DIR,
        "installed_decoders": ["soundfile (libsndfile)", "scipy", "librosa"]
    }

@router.get("/health/models", response_model=ModelStatusResponse)
def get_model_status():
    gemini_key = os.getenv("GEMINI_API_KEY", settings.GEMINI_API_KEY)
    return {
        "gemini_model": os.getenv("GEMINI_MODEL", settings.GEMINI_MODEL),
        "gemini_status": "ready" if gemini_key else "not_configured (deterministic fallback active)",
        "vad_status": "active (adaptive energy & spectral flux)",
        "pitch_estimator": "active (Librosa YIN)",
        "forced_aligner": "active (acoustically-guided syllable aligner)"
    }

# --- Overview Dashboard ---
@router.get("/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    analyses = db.query(SpeechAnalysis).all()
    total_analyses = len(analyses)
    completed = [a for a in analyses if a.status == "completed" and a.overall_score is not None]

    avg_score = float(sum(a.overall_score for a in completed) / len(completed)) if completed else 0.0

    flaws = db.query(DetectedFlaw).all()
    total_flaws = len(flaws)

    # Flaw category distribution
    cat_counts = {}
    for f in flaws:
        cat_counts[f.category] = cat_counts.get(f.category, 0) + 1

    most_common_flaw = max(cat_counts, key=cat_counts.get) if cat_counts else "None detected"

    # Score distribution brackets
    score_dist = {
        "90-100": sum(1 for a in completed if a.overall_score >= 90),
        "80-89": sum(1 for a in completed if 80 <= a.overall_score < 90),
        "70-79": sum(1 for a in completed if 70 <= a.overall_score < 80),
        "60-69": sum(1 for a in completed if 60 <= a.overall_score < 70),
        "< 60": sum(1 for a in completed if a.overall_score < 60),
    }

    # Recent speech analyses
    recent = (
        db.query(SpeechAnalysis)
        .order_by(desc(SpeechAnalysis.created_at))
        .limit(6)
        .all()
    )

    recent_items = [
        {
            "id": a.id,
            "title": a.title,
            "speech_category": a.speech_category,
            "status": a.status,
            "overall_score": a.overall_score,
            "has_reference": a.has_reference,
            "flaw_count": len(a.flaws),
            "created_at": a.created_at
        }
        for a in recent
    ]

    total_dataset_samples = db.query(DatasetSample).count()

    return {
        "total_analyses": total_analyses,
        "completed_analyses": len(completed),
        "average_delivery_score": round(avg_score, 1),
        "total_detected_flaws": total_flaws,
        "most_common_flaw_category": most_common_flaw,
        "flaw_category_distribution": cat_counts,
        "score_distribution": score_dist,
        "dataset_sample_count": total_dataset_samples,
        "recent_analyses": recent_items
    }

# --- Speech Analysis Endpoints ---
@router.post("/transcribe")
async def transcribe_audio_endpoint(
    audio: UploadFile = File(...),
    speech_category: str = Form("Persuasive Oratory")
):
    """Auto-transcribes speech audio using Gemini multimodal transcription with acoustic fallback."""
    from backend.app.audio.transcription import auto_transcribe_audio
    temp_id = str(uuid.uuid4())
    ext = os.path.splitext(audio.filename)[1].lower() or ".wav"
    temp_path = os.path.join(settings.AUDIO_STORAGE_DIR, f"temp_transcribe_{temp_id}{ext}")

    os.makedirs(settings.AUDIO_STORAGE_DIR, exist_ok=True)
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(audio.file, f)

    try:
        transcript = auto_transcribe_audio(temp_path, speech_category)
        return {
            "transcript": transcript,
            "word_count": len(transcript.split()),
            "status": "success"
        }
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

@router.post("/analyses")
async def create_analysis(
    background_tasks: BackgroundTasks,
    participant_audio: UploadFile = File(...),
    reference_audio: Optional[UploadFile] = File(None),
    transcript_text: Optional[str] = Form(""),
    title: str = Form("Competitive Speech Evaluation"),
    speech_category: str = Form("Persuasive Oratory"),
    speaker_id: Optional[str] = Form(None),
    enable_gemini_interpret: bool = Form(True),
    db: Session = Depends(get_db)
):
    analysis_id = str(uuid.uuid4())

    # Save participant audio
    os.makedirs(settings.AUDIO_STORAGE_DIR, exist_ok=True)
    part_ext = os.path.splitext(participant_audio.filename)[1].lower() or ".wav"
    part_filename = f"{analysis_id}_participant{part_ext}"
    part_path = os.path.join(settings.AUDIO_STORAGE_DIR, part_filename)

    with open(part_path, "wb") as f:
        shutil.copyfileobj(participant_audio.file, f)

    # Save reference audio if provided
    ref_path = None
    if reference_audio and reference_audio.filename:
        ref_ext = os.path.splitext(reference_audio.filename)[1].lower() or ".wav"
        ref_filename = f"{analysis_id}_reference{ref_ext}"
        ref_path = os.path.join(settings.AUDIO_STORAGE_DIR, ref_filename)
        with open(ref_path, "wb") as f:
            shutil.copyfileobj(reference_audio.file, f)

    analysis = SpeechAnalysis(
        id=analysis_id,
        title=title,
        speech_category=speech_category,
        speaker_id=speaker_id,
        status="queued",
        has_reference=bool(ref_path)
    )
    db.add(analysis)
    db.commit()

    # Process in background task
    def process_job(aid: str, p_path: str, r_path: Optional[str], text: str, t_title: str, cat: str, spk: Optional[str], gemini: bool):
        from backend.app.database.session import SessionLocal
        job_db = SessionLocal()
        try:
            run_speech_analysis_pipeline(
                analysis_id=aid,
                participant_audio_path=p_path,
                reference_audio_path=r_path,
                transcript_text=text,
                title=t_title,
                speech_category=cat,
                speaker_id=spk,
                trigger_gemini=gemini,
                db=job_db
            )
        finally:
            job_db.close()

    background_tasks.add_task(
        process_job,
        analysis_id,
        part_path,
        ref_path,
        transcript_text,
        title,
        speech_category,
        speaker_id,
        enable_gemini_interpret
    )

    return {"analysis_id": analysis_id, "status": "queued", "message": "Speech analysis job enqueued successfully."}

@router.post("/analyses/sample")
def load_sample_analysis(
    background_tasks: BackgroundTasks,
    sample_key: str = Query("script_1", description="script_1 (Hamlet) or script_2 (Oratory)"),
    db: Session = Depends(get_db)
):
    """Loads a pre-synthesized speech preset and executes an immediate end-to-end evaluation."""
    presets = create_sample_preset_data("data/samples")
    if sample_key not in presets:
        sample_key = "script_1"

    data = presets[sample_key]
    analysis_id = str(uuid.uuid4())

    analysis = SpeechAnalysis(
        id=analysis_id,
        title=data["title"],
        speech_category=data["category"],
        speaker_id="contestant_42",
        status="queued",
        has_reference=True
    )
    db.add(analysis)
    db.commit()

    def process_sample_job(aid: str, d: dict):
        from backend.app.database.session import SessionLocal
        job_db = SessionLocal()
        try:
            run_speech_analysis_pipeline(
                analysis_id=aid,
                participant_audio_path=d["participant_audio"],
                reference_audio_path=d["reference_audio"],
                transcript_text=d["transcript"],
                title=d["title"],
                speech_category=d["category"],
                speaker_id="contestant_42",
                trigger_gemini=True,
                db=job_db
            )
        finally:
            job_db.close()

    background_tasks.add_task(process_sample_job, analysis_id, data)

    return {"analysis_id": analysis.id, "status": "queued", "overall_score": None}

@router.get("/analyses", response_model=List[AnalysisListItem])
def list_analyses(
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(SpeechAnalysis).order_by(desc(SpeechAnalysis.created_at))
    if category:
        query = query.filter(SpeechAnalysis.speech_category == category)
    if status:
        query = query.filter(SpeechAnalysis.status == status)

    analyses = query.all()
    results = []
    for a in analyses:
        results.append(AnalysisListItem(
            id=a.id,
            title=a.title,
            speech_category=a.speech_category,
            speaker_id=a.speaker_id,
            status=a.status,
            has_reference=a.has_reference,
            overall_score=a.overall_score,
            flaw_count=len(a.flaws),
            duration_seconds=a.duration_seconds or 0.0,
            created_at=a.created_at
        ))
    return results

@router.get("/analyses/{analysis_id}/status")
def get_analysis_status(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.query(SpeechAnalysis).filter(SpeechAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {
        "id": analysis.id,
        "status": analysis.status,
        "overall_score": analysis.overall_score,
        "error_message": analysis.error_message
    }

@router.get("/analyses/{analysis_id}", response_model=AnalysisDetailResponse)
def get_analysis_detail(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.query(SpeechAnalysis).filter(SpeechAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Participant and Reference features
    part_feat = None
    ref_feat = None
    part_series = None
    ref_series = None

    for f in analysis.features:
        summary_dict = {
            "role": f.role,
            "duration_seconds": f.duration_seconds,
            "speaking_rate_wpm": f.speaking_rate_wpm,
            "median_pitch_hz": f.median_pitch_hz,
            "pitch_variability_hz": f.pitch_variability_hz,
            "pitch_min_hz": f.pitch_min_hz,
            "pitch_max_hz": f.pitch_max_hz,
            "pause_count": f.pause_count,
            "average_pause_seconds": f.average_pause_seconds,
            "silence_ratio": f.silence_ratio,
            "rms_mean": f.rms_mean,
            "rms_std": f.rms_std,
            "spectral_centroid_mean": f.spectral_centroid_mean,
            "spectral_bandwidth_mean": f.spectral_bandwidth_mean,
            "spectral_rolloff_mean": f.spectral_rolloff_mean
        }
        series_obj = json.loads(f.feature_series_json) if f.feature_series_json else {}

        if f.role == "participant":
            part_feat = AcousticSummary(**summary_dict)
            part_series = FeatureSeries(**series_obj)
        elif f.role == "reference":
            ref_feat = AcousticSummary(**summary_dict)
            ref_series = FeatureSeries(**series_obj)

    # Alignments
    part_alignments = [
        WordAlignmentItem(
            word=w.word,
            word_index=w.word_index,
            start_seconds=w.start_seconds,
            end_seconds=w.end_seconds,
            confidence=w.confidence
        )
        for w in analysis.alignments if w.role == "participant"
    ]
    ref_alignments = [
        WordAlignmentItem(
            word=w.word,
            word_index=w.word_index,
            start_seconds=w.start_seconds,
            end_seconds=w.end_seconds,
            confidence=w.confidence
        )
        for w in analysis.alignments if w.role == "reference"
    ]

    # Flaws
    flaw_items = []
    for fl in analysis.flaws:
        ev_list = [EvidenceItem(**ev) for ev in json.loads(fl.evidence_json)] if fl.evidence_json else []
        flaw_items.append(FlawItem(
            flaw_id=fl.flaw_id,
            category=fl.category,
            start_seconds=fl.start_seconds,
            end_seconds=fl.end_seconds,
            text_segment=fl.text_segment,
            reference_value=fl.reference_value,
            participant_value=fl.participant_value,
            unit=fl.unit,
            deviation_percent=fl.deviation_percent,
            severity=fl.severity,
            confidence=fl.confidence,
            evidence=ev_list,
            explanation=fl.explanation,
            recommendation=fl.recommendation
        ))

    # Rubric score
    rubric_obj = None
    if analysis.rubric_score:
        rs = analysis.rubric_score
        weights = json.loads(rs.weights_json) if rs.weights_json else {}
        dims = [DimensionScore(**d) for d in json.loads(rs.dimension_justifications_json)] if rs.dimension_justifications_json else []
        rubric_obj = RubricScoreBreakdown(
            overall_score=rs.overall_score,
            pacing_score=rs.pacing_score,
            pitch_score=rs.pitch_score,
            volume_score=rs.volume_score,
            pronunciation_score=rs.pronunciation_score,
            emphasis_score=rs.emphasis_score,
            weights=weights,
            dimensions=dims,
            scoring_version=rs.scoring_version
        )

    # Gemini interpretation
    gemini_obj = None
    if analysis.gemini_interpretation:
        gi = analysis.gemini_interpretation
        speech_ctx = json.loads(gi.speech_context_json) if hasattr(gi, 'speech_context_json') and gi.speech_context_json else None
        interps = [FlawInterpretation(**interp) for interp in json.loads(gi.interpretations_json)] if gi.interpretations_json else []
        gemini_obj = GeminiInterpretationResponse(
            model_used=gi.model_used,
            is_deterministic_fallback=gi.is_deterministic_fallback,
            summary=gi.summary,
            speech_context=SpeechContextAnalysis(**speech_ctx) if speech_ctx else None,
            strengths=json.loads(gi.strengths_json) if gi.strengths_json else [],
            interpretations=interps,
            overall_recommendations=json.loads(gi.overall_recommendations_json) if gi.overall_recommendations_json else [],
            limitations=json.loads(gi.limitations_json) if gi.limitations_json else []
        )

    return AnalysisDetailResponse(
        id=analysis.id,
        title=analysis.title,
        speech_category=analysis.speech_category,
        speaker_id=analysis.speaker_id,
        status=analysis.status,
        error_message=analysis.error_message,
        has_reference=analysis.has_reference,
        duration_seconds=analysis.duration_seconds or 0.0,
        created_at=analysis.created_at,
        transcript=analysis.transcript.raw_text if analysis.transcript else None,
        word_count=analysis.transcript.word_count if analysis.transcript else None,
        participant_features=part_feat,
        reference_features=ref_feat,
        feature_series_participant=part_series,
        feature_series_reference=ref_series,
        alignments_participant=part_alignments,
        alignments_reference=ref_alignments,
        flaws=flaw_items,
        rubric_score=rubric_obj,
        gemini_interpretation=gemini_obj
    )

@router.get("/analyses/{analysis_id}/features")
def get_analysis_features(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.query(SpeechAnalysis).filter(SpeechAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    res = {}
    for f in analysis.features:
        res[f.role] = {
            "summary": {
                "speaking_rate_wpm": f.speaking_rate_wpm,
                "median_pitch_hz": f.median_pitch_hz,
                "pitch_variability_hz": f.pitch_variability_hz,
                "pause_count": f.pause_count,
                "average_pause_seconds": f.average_pause_seconds,
                "silence_ratio": f.silence_ratio,
                "rms_mean": f.rms_mean,
            },
            "series": json.loads(f.feature_series_json) if f.feature_series_json else {}
        }
    return res

@router.get("/analyses/{analysis_id}/flaws", response_model=List[FlawItem])
def get_analysis_flaws(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.query(SpeechAnalysis).filter(SpeechAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    flaw_items = []
    for fl in analysis.flaws:
        ev_list = [EvidenceItem(**ev) for ev in json.loads(fl.evidence_json)] if fl.evidence_json else []
        flaw_items.append(FlawItem(
            flaw_id=fl.flaw_id,
            category=fl.category,
            start_seconds=fl.start_seconds,
            end_seconds=fl.end_seconds,
            text_segment=fl.text_segment,
            reference_value=fl.reference_value,
            participant_value=fl.participant_value,
            unit=fl.unit,
            deviation_percent=fl.deviation_percent,
            severity=fl.severity,
            confidence=fl.confidence,
            evidence=ev_list,
            explanation=fl.explanation,
            recommendation=fl.recommendation
        ))
    return flaw_items

@router.get("/analyses/{analysis_id}/report")
def export_analysis_report(
    analysis_id: str,
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db)
):
    """Exports comprehensive speech evaluation report in JSON or CSV format."""
    detail = get_analysis_detail(analysis_id, db)

    if format == "json":
        return JSONResponse(
            content=detail.model_dump(mode="json"),
            headers={"Content-Disposition": f"attachment; filename=counterpoint_report_{analysis_id}.json"}
        )
    else:
        # Generate CSV of flaws & rubric
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["Counterpoint AI - Speech Evaluation Report"])
        writer.writerow(["Analysis ID", detail.id])
        writer.writerow(["Title", detail.title])
        writer.writerow(["Category", detail.speech_category])
        writer.writerow(["Overall Score", detail.rubric_score.overall_score if detail.rubric_score else "N/A"])
        writer.writerow([])

        writer.writerow(["--- Detected Flaws ---"])
        writer.writerow(["Flaw ID", "Category", "Start (s)", "End (s)", "Text Segment", "Reference Value", "Participant Value", "Unit", "Deviation %", "Severity", "Explanation", "Recommendation"])
        for f in detail.flaws:
            writer.writerow([
                f.flaw_id,
                f.category,
                f.start_seconds,
                f.end_seconds,
                f.text_segment,
                f.reference_value,
                f.participant_value,
                f.unit,
                f.deviation_percent,
                f.severity,
                f.explanation,
                f.recommendation
            ])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=counterpoint_report_{analysis_id}.csv"}
        )

@router.get("/analyses/{analysis_id}/audio/{role}")
def stream_audio(analysis_id: str, role: str, db: Session = Depends(get_db)):
    """Streams the participant or reference processed WAV audio file."""
    rec = (
        db.query(AudioRecording)
        .filter(AudioRecording.analysis_id == analysis_id, AudioRecording.role == role)
        .first()
    )
    if not rec or not rec.processed_path or not os.path.exists(rec.processed_path):
        # Check original file path
        if rec and rec.file_path and os.path.exists(rec.file_path):
            return FileResponse(rec.file_path, media_type="audio/wav")
        raise HTTPException(status_code=404, detail="Audio recording not found")

    return FileResponse(rec.processed_path, media_type="audio/wav")

@router.delete("/analyses/{analysis_id}")
def delete_analysis(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.query(SpeechAnalysis).filter(SpeechAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Clean up local audio files
    for r in analysis.recordings:
        if r.file_path and os.path.exists(r.file_path) and "samples" not in r.file_path:
            try:
                os.remove(r.file_path)
            except Exception:
                pass
        if r.processed_path and os.path.exists(r.processed_path):
            try:
                os.remove(r.processed_path)
            except Exception:
                pass

    db.delete(analysis)
    db.commit()
    return {"deleted": True, "analysis_id": analysis_id}

# --- Dataset Explorer Endpoints ---
@router.get("/dataset/samples", response_model=List[DatasetSampleResponse])
def list_dataset_samples(
    split: Optional[str] = None,
    script_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DatasetSample)
    if split:
        query = query.filter(DatasetSample.split == split)
    if script_id:
        query = query.filter(DatasetSample.script_id == script_id)

    samples = query.all()
    results = []
    for s in samples:
        results.append(DatasetSampleResponse(
            id=s.id,
            sample_id=s.sample_id,
            script_id=s.script_id,
            title=s.title,
            speech_category=s.speech_category,
            speaker_id=s.speaker_id,
            role=s.role,
            audio_path=s.audio_path,
            transcript_text=s.transcript_text,
            flaw_categories=json.loads(s.flaw_categories_json) if s.flaw_categories_json else [],
            severity=s.severity,
            is_synthetic=s.is_synthetic,
            perturbation_type=s.perturbation_type,
            split=s.split,
            notes=s.notes,
            annotations_count=len(s.annotations),
            created_at=s.created_at
        ))
    return results

@router.post("/dataset/samples", response_model=DatasetSampleResponse)
def create_dataset_sample(
    sample_in: DatasetSampleCreate,
    db: Session = Depends(get_db)
):
    sid = f"sample_{uuid.uuid4().hex[:8]}"
    sample = DatasetSample(
        sample_id=sid,
        script_id=sample_in.script_id,
        title=sample_in.title,
        speech_category=sample_in.speech_category,
        speaker_id=sample_in.speaker_id,
        role=sample_in.role,
        audio_path="data/samples/hamlet_participant_flawed.wav",
        transcript_text=sample_in.transcript_text,
        flaw_categories_json=json.dumps(sample_in.flaw_categories),
        severity=sample_in.severity,
        split=sample_in.split,
        notes=sample_in.notes
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)

    return DatasetSampleResponse(
        id=sample.id,
        sample_id=sample.sample_id,
        script_id=sample.script_id,
        title=sample.title,
        speech_category=sample.speech_category,
        speaker_id=sample.speaker_id,
        role=sample.role,
        audio_path=sample.audio_path,
        transcript_text=sample.transcript_text,
        flaw_categories=sample_in.flaw_categories,
        severity=sample.severity,
        is_synthetic=sample.is_synthetic,
        perturbation_type=sample.perturbation_type,
        split=sample.split,
        notes=sample.notes,
        annotations_count=0,
        created_at=sample.created_at
    )

@router.post("/dataset/annotations", response_model=HumanAnnotationResponse)
def add_human_annotation(
    anno_in: HumanAnnotationCreate,
    db: Session = Depends(get_db)
):
    sample = db.query(DatasetSample).filter(DatasetSample.id == anno_in.dataset_sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Dataset sample not found")

    anno = HumanAnnotation(
        dataset_sample_id=anno_in.dataset_sample_id,
        reviewer_id=anno_in.reviewer_id,
        flaw_category=anno_in.flaw_category,
        start_seconds=anno_in.start_seconds,
        end_seconds=anno_in.end_seconds,
        text_segment=anno_in.text_segment,
        severity=anno_in.severity,
        explanation=anno_in.explanation
    )
    db.add(anno)
    db.commit()
    db.refresh(anno)

    return HumanAnnotationResponse(
        id=anno.id,
        dataset_sample_id=anno.dataset_sample_id,
        reviewer_id=anno.reviewer_id,
        flaw_category=anno.flaw_category,
        start_seconds=anno.start_seconds,
        end_seconds=anno.end_seconds,
        text_segment=anno.text_segment,
        severity=anno.severity,
        explanation=anno.explanation,
        created_at=anno.created_at
    )

@router.get("/dataset/summary")
def get_dataset_summary(db: Session = Depends(get_db)):
    samples = db.query(DatasetSample).all()
    annotations = db.query(HumanAnnotation).all()

    split_counts = {"train": 0, "val": 0, "test": 0}
    for s in samples:
        split_counts[s.split] = split_counts.get(s.split, 0) + 1

    cat_counts = {}
    for a in annotations:
        cat_counts[a.flaw_category] = cat_counts.get(a.flaw_category, 0) + 1

    return {
        "total_samples": len(samples),
        "total_annotations": len(annotations),
        "split_distribution": split_counts,
        "annotation_category_distribution": cat_counts
    }

# --- Model Validation & Evaluation ---
@router.post("/evaluation/validate", response_model=ValidationReportResponse)
def validate_model(
    iou_threshold: float = Query(0.30, ge=0.1, le=0.9),
    db: Session = Depends(get_db)
):
    """
    Evaluates detector predictions against ground truth human annotations.
    Calculates Precision, Recall, F1, mean temporal IoU, and confusion matrix.
    """
    annotations = db.query(HumanAnnotation).all()
    all_flaws = db.query(DetectedFlaw).all()

    gt_list = [
        {
            "dataset_sample_id": a.dataset_sample_id,
            "flaw_category": a.flaw_category,
            "start_seconds": a.start_seconds,
            "end_seconds": a.end_seconds,
            "text_segment": a.text_segment
        }
        for a in annotations
    ]

    pred_list = [
        {
            "category": f.category,
            "start_seconds": f.start_seconds,
            "end_seconds": f.end_seconds,
            "text_segment": f.text_segment
        }
        for f in all_flaws
    ]

    res = evaluate_flaw_detections(gt_list, pred_list, iou_threshold=iou_threshold)
    return ValidationReportResponse(**res)

# --- Settings ---
@router.get("/settings", response_model=SettingsResponse)
def get_settings():
    gemini_key = os.getenv("GEMINI_API_KEY", settings.GEMINI_API_KEY)
    gemini_enabled = os.getenv("ENABLE_GEMINI", str(settings.ENABLE_GEMINI)).lower() in ("true", "1", "yes")

    return SettingsResponse(
        gemini_enabled=gemini_enabled,
        gemini_configured=bool(gemini_key),
        gemini_model=os.getenv("GEMINI_MODEL", settings.GEMINI_MODEL),
        weight_pacing=settings.WEIGHT_PACING,
        weight_pitch=settings.WEIGHT_PITCH,
        weight_volume=settings.WEIGHT_VOLUME,
        weight_pronunciation=settings.WEIGHT_PRONUNCIATION,
        weight_emphasis=settings.WEIGHT_EMPHASIS,
        max_upload_size_mb=settings.MAX_UPLOAD_SIZE_MB,
        max_audio_duration_seconds=settings.MAX_AUDIO_DURATION_SECONDS
    )

@router.post("/settings", response_model=SettingsResponse)
def update_settings(update: SettingsUpdateRequest):
    if update.gemini_api_key is not None:
        os.environ["GEMINI_API_KEY"] = update.gemini_api_key
        settings.GEMINI_API_KEY = update.gemini_api_key
    if update.gemini_model is not None:
        os.environ["GEMINI_MODEL"] = update.gemini_model
        settings.GEMINI_MODEL = update.gemini_model
    if update.enable_gemini is not None:
        os.environ["ENABLE_GEMINI"] = str(update.enable_gemini).lower()
        settings.ENABLE_GEMINI = update.enable_gemini
    if update.weight_pacing is not None:
        settings.WEIGHT_PACING = update.weight_pacing
    if update.weight_pitch is not None:
        settings.WEIGHT_PITCH = update.weight_pitch
    if update.weight_volume is not None:
        settings.WEIGHT_VOLUME = update.weight_volume
    if update.weight_pronunciation is not None:
        settings.WEIGHT_PRONUNCIATION = update.weight_pronunciation
    if update.weight_emphasis is not None:
        settings.WEIGHT_EMPHASIS = update.weight_emphasis

    return get_settings()
