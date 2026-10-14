import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class SpeechAnalysis(Base):
    __tablename__ = "speech_analyses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False, default="Untitled Speech Evaluation")
    speech_category = Column(String(100), nullable=False, default="Public Speaking")
    speaker_id = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="uploaded")  # uploaded, queued, processing, completed, failed
    error_message = Column(Text, nullable=True)
    has_reference = Column(Boolean, default=True)
    overall_score = Column(Float, nullable=True)
    scoring_version = Column(String(50), default="rubric_v1.0")
    duration_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    recordings = relationship("AudioRecording", back_populates="analysis", cascade="all, delete-orphan")
    transcript = relationship("Transcript", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    features = relationship("AcousticFeatureSummary", back_populates="analysis", cascade="all, delete-orphan")
    alignments = relationship("WordAlignment", back_populates="analysis", cascade="all, delete-orphan")
    flaws = relationship("DetectedFlaw", back_populates="analysis", cascade="all, delete-orphan")
    rubric_score = relationship("RubricScore", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    gemini_interpretation = relationship("GeminiInterpretation", back_populates="analysis", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_analysis_status", "status"),
        Index("idx_analysis_created_at", "created_at"),
    )

class AudioRecording(Base):
    __tablename__ = "audio_recordings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("speech_analyses.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # "reference" or "participant"
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    processed_path = Column(String(500), nullable=True)
    format = Column(String(50), default="wav")
    sample_rate = Column(Integer, default=16000)
    channels = Column(Integer, default=1)
    duration_seconds = Column(Float, default=0.0)
    speech_active_duration = Column(Float, default=0.0)
    snr_db = Column(Float, nullable=True)
    clipping_detected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("SpeechAnalysis", back_populates="recordings")

class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("speech_analyses.id", ondelete="CASCADE"), nullable=False)
    raw_text = Column(Text, nullable=False)
    normalized_text = Column(Text, nullable=False)
    word_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("SpeechAnalysis", back_populates="transcript")

class WordAlignment(Base):
    __tablename__ = "word_alignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("speech_analyses.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # reference or participant
    word = Column(String(100), nullable=False)
    word_index = Column(Integer, nullable=False)
    start_seconds = Column(Float, nullable=False)
    end_seconds = Column(Float, nullable=False)
    confidence = Column(Float, default=1.0)

    analysis = relationship("SpeechAnalysis", back_populates="alignments")
    __table_args__ = (
        Index("idx_alignment_analysis_role", "analysis_id", "role"),
    )

class AcousticFeatureSummary(Base):
    __tablename__ = "acoustic_feature_summaries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("speech_analyses.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # reference or participant
    duration_seconds = Column(Float, default=0.0)
    speaking_rate_wpm = Column(Float, default=0.0)
    median_pitch_hz = Column(Float, nullable=True)
    pitch_variability_hz = Column(Float, nullable=True)
    pitch_min_hz = Column(Float, nullable=True)
    pitch_max_hz = Column(Float, nullable=True)
    pause_count = Column(Integer, default=0)
    average_pause_seconds = Column(Float, default=0.0)
    silence_ratio = Column(Float, default=0.0)
    rms_mean = Column(Float, default=0.0)
    rms_std = Column(Float, default=0.0)
    spectral_centroid_mean = Column(Float, nullable=True)
    spectral_bandwidth_mean = Column(Float, nullable=True)
    spectral_rolloff_mean = Column(Float, nullable=True)
    feature_series_json = Column(Text, nullable=True)  # JSON with time series arrays
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("SpeechAnalysis", back_populates="features")

class DetectedFlaw(Base):
    __tablename__ = "detected_flaws"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("speech_analyses.id", ondelete="CASCADE"), nullable=False)
    flaw_id = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)
    start_seconds = Column(Float, nullable=False)
    end_seconds = Column(Float, nullable=False)
    text_segment = Column(Text, nullable=False)
    reference_value = Column(Float, nullable=True)
    participant_value = Column(Float, nullable=True)
    unit = Column(String(50), nullable=False)
    deviation_percent = Column(Float, nullable=True)
    severity = Column(String(20), nullable=False, default="medium")  # low, medium, high
    confidence = Column(Float, default=0.85)
    evidence_json = Column(Text, nullable=True)  # JSON array of metric dicts
    explanation = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("SpeechAnalysis", back_populates="flaws")
    __table_args__ = (
        Index("idx_flaw_analysis_id", "analysis_id"),
        Index("idx_flaw_category", "category"),
    )

class RubricScore(Base):
    __tablename__ = "rubric_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("speech_analyses.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Float, nullable=False)
    pacing_score = Column(Float, nullable=False)
    pitch_score = Column(Float, nullable=False)
    volume_score = Column(Float, nullable=False)
    pronunciation_score = Column(Float, nullable=False)
    emphasis_score = Column(Float, nullable=False)
    weights_json = Column(Text, nullable=True)
    dimension_justifications_json = Column(Text, nullable=True)
    scoring_version = Column(String(50), default="rubric_v1.0")
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("SpeechAnalysis", back_populates="rubric_score")

class ScoringConfiguration(Base):
    __tablename__ = "scoring_configurations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False, default="Default Competitor Rubric")
    version = Column(String(50), nullable=False, default="rubric_v1.0")
    pacing_weight = Column(Float, default=0.25)
    pitch_weight = Column(Float, default=0.20)
    volume_weight = Column(Float, default=0.20)
    pronunciation_weight = Column(Float, default=0.20)
    emphasis_weight = Column(Float, default=0.15)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DatasetSample(Base):
    __tablename__ = "dataset_samples"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    sample_id = Column(String(100), unique=True, nullable=False)
    script_id = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    speech_category = Column(String(100), default="Persuasive Oratory")
    speaker_id = Column(String(100), nullable=True)
    role = Column(String(20), nullable=False)  # reference or participant
    audio_path = Column(String(500), nullable=False)
    transcript_text = Column(Text, nullable=False)
    flaw_categories_json = Column(Text, nullable=True)
    severity = Column(String(20), default="none")
    is_synthetic = Column(Boolean, default=False)
    perturbation_type = Column(String(100), nullable=True)
    split = Column(String(20), default="train")  # train, val, test
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    annotations = relationship("HumanAnnotation", back_populates="sample", cascade="all, delete-orphan")

class HumanAnnotation(Base):
    __tablename__ = "human_annotations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dataset_sample_id = Column(String(36), ForeignKey("dataset_samples.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(String(100), default="expert_judge_1")
    flaw_category = Column(String(100), nullable=False)
    start_seconds = Column(Float, nullable=False)
    end_seconds = Column(Float, nullable=False)
    text_segment = Column(Text, nullable=False)
    severity = Column(String(20), default="medium")
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("DatasetSample", back_populates="annotations")

class GeminiInterpretation(Base):
    __tablename__ = "gemini_interpretations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("speech_analyses.id", ondelete="CASCADE"), nullable=False)
    model_used = Column(String(100), default="gemini-3.5-flash-lite")
    summary = Column(Text, nullable=False)
    speech_context_json = Column(Text, nullable=True)
    strengths_json = Column(Text, nullable=True)
    interpretations_json = Column(Text, nullable=True)
    overall_recommendations_json = Column(Text, nullable=True)
    limitations_json = Column(Text, nullable=True)
    is_deterministic_fallback = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("SpeechAnalysis", back_populates="gemini_interpretation")
