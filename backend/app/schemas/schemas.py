from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

# --- Health Schemas ---
class HealthResponse(BaseModel):
    status: str
    version: str
    gemini_enabled: bool
    gemini_configured: bool
    database_connected: bool
    audio_storage_path: str
    installed_decoders: List[str]

class ModelStatusResponse(BaseModel):
    gemini_model: str
    gemini_status: str
    vad_status: str
    pitch_estimator: str
    forced_aligner: str

# --- Acoustic Feature Schemas ---
class AcousticSummary(BaseModel):
    role: str
    duration_seconds: float
    speaking_rate_wpm: float
    median_pitch_hz: Optional[float] = None
    pitch_variability_hz: Optional[float] = None
    pitch_min_hz: Optional[float] = None
    pitch_max_hz: Optional[float] = None
    pause_count: int = 0
    average_pause_seconds: float = 0.0
    silence_ratio: float = 0.0
    rms_mean: float = 0.0
    rms_std: float = 0.0
    spectral_centroid_mean: Optional[float] = None
    spectral_bandwidth_mean: Optional[float] = None
    spectral_rolloff_mean: Optional[float] = None

class FeatureSeries(BaseModel):
    time_stamps: List[float] = []
    rms_envelope: List[float] = []
    pitch_contour: List[Optional[float]] = []
    spectral_centroid: List[float] = []
    speaking_rate_series: List[Dict[str, Any]] = []
    pauses: List[Dict[str, Any]] = []
    mfcc_heatmaps: Optional[Dict[str, Any]] = None
    spectrogram_summary: Optional[Dict[str, Any]] = None

class WordAlignmentItem(BaseModel):
    word: str
    word_index: int
    start_seconds: float
    end_seconds: float
    confidence: float = 1.0

# --- Flaw Schemas ---
class EvidenceItem(BaseModel):
    metric: str
    participant_value: float
    reference_value: Optional[float] = None
    unit: str
    delta_percent: Optional[float] = None
    threshold_applied: Optional[str] = None

class FlawItem(BaseModel):
    flaw_id: str
    category: str
    start_seconds: float
    end_seconds: float
    text_segment: str
    reference_value: Optional[float] = None
    participant_value: Optional[float] = None
    unit: str
    deviation_percent: Optional[float] = None
    severity: str  # low, medium, high
    confidence: float = 0.85
    evidence: List[EvidenceItem] = []
    explanation: str
    recommendation: str

# --- Rubric Schemas ---
class DimensionScore(BaseModel):
    dimension: str
    score: float
    weight: float
    weighted_score: float
    justification: str
    key_metrics: Dict[str, Any] = {}

class RubricScoreBreakdown(BaseModel):
    overall_score: float
    pacing_score: float
    pitch_score: float
    volume_score: float
    pronunciation_score: float
    emphasis_score: float
    weights: Dict[str, float]
    dimensions: List[DimensionScore] = []
    scoring_version: str

# --- Gemini Interpretation Schemas ---
class SpeechContextAnalysis(BaseModel):
    theme_and_intent: str
    dramatic_or_rhetorical_stakes: str
    contextual_delivery_advice: str

class FlawInterpretation(BaseModel):
    flaw_id: str
    explanation: str
    impact: str
    contextual_significance: Optional[str] = None
    recommendations: List[str]
    practice_exercise: str
    priority: str

class GeminiInterpretationResponse(BaseModel):
    model_used: str
    is_deterministic_fallback: bool
    summary: str
    speech_context: Optional[SpeechContextAnalysis] = None
    strengths: List[str] = []
    interpretations: List[FlawInterpretation] = []
    overall_recommendations: List[str] = []
    limitations: List[str] = []

# --- Speech Analysis Schemas ---
class AnalysisListItem(BaseModel):
    id: str
    title: str
    speech_category: str
    speaker_id: Optional[str] = None
    status: str
    has_reference: bool
    overall_score: Optional[float] = None
    flaw_count: int = 0
    duration_seconds: float
    created_at: datetime

class AnalysisDetailResponse(BaseModel):
    id: str
    title: str
    speech_category: str
    speaker_id: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    has_reference: bool
    duration_seconds: float
    created_at: datetime
    transcript: Optional[str] = None
    word_count: Optional[int] = None
    participant_features: Optional[AcousticSummary] = None
    reference_features: Optional[AcousticSummary] = None
    feature_series_participant: Optional[FeatureSeries] = None
    feature_series_reference: Optional[FeatureSeries] = None
    alignments_participant: List[WordAlignmentItem] = []
    alignments_reference: List[WordAlignmentItem] = []
    flaws: List[FlawItem] = []
    rubric_score: Optional[RubricScoreBreakdown] = None
    gemini_interpretation: Optional[GeminiInterpretationResponse] = None

# --- Dataset & Validation Schemas ---
class DatasetSampleCreate(BaseModel):
    script_id: str
    title: str
    speech_category: str = "Persuasive Oratory"
    speaker_id: Optional[str] = None
    role: str = "participant"
    transcript_text: str
    flaw_categories: List[str] = []
    severity: str = "medium"
    split: str = "train"
    notes: Optional[str] = None

class DatasetSampleResponse(BaseModel):
    id: str
    sample_id: str
    script_id: str
    title: str
    speech_category: str
    speaker_id: Optional[str] = None
    role: str
    audio_path: str
    transcript_text: str
    flaw_categories: List[str] = []
    severity: str
    is_synthetic: bool
    perturbation_type: Optional[str] = None
    split: str
    notes: Optional[str] = None
    annotations_count: int = 0
    created_at: datetime

class HumanAnnotationCreate(BaseModel):
    dataset_sample_id: str
    reviewer_id: str = "expert_judge_1"
    flaw_category: str
    start_seconds: float
    end_seconds: float
    text_segment: str
    severity: str = "medium"
    explanation: Optional[str] = None

class HumanAnnotationResponse(BaseModel):
    id: str
    dataset_sample_id: str
    reviewer_id: str
    flaw_category: str
    start_seconds: float
    end_seconds: float
    text_segment: str
    severity: str
    explanation: Optional[str] = None
    created_at: datetime

class CategoryMetric(BaseModel):
    category: str
    ground_truth_count: int
    predicted_count: int
    true_positives: int
    false_positives: int
    false_negatives: int
    precision: float
    recall: float
    f1_score: float
    mean_temporal_iou: float

class ValidationReportResponse(BaseModel):
    total_test_samples: int
    total_annotations: int
    total_predictions: int
    overall_precision: float
    overall_recall: float
    overall_f1_score: float
    mean_temporal_iou: float
    iou_threshold: float
    confusion_matrix: Dict[str, Dict[str, int]]
    category_metrics: List[CategoryMetric]
    evaluation_notes: str

# --- Settings Schemas ---
class SettingsResponse(BaseModel):
    gemini_enabled: bool
    gemini_configured: bool
    gemini_model: str
    weight_pacing: float
    weight_pitch: float
    weight_volume: float
    weight_pronunciation: float
    weight_emphasis: float
    max_upload_size_mb: int
    max_audio_duration_seconds: int

class SettingsUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    enable_gemini: Optional[bool] = None
    weight_pacing: Optional[float] = None
    weight_pitch: Optional[float] = None
    weight_volume: Optional[float] = None
    weight_pronunciation: Optional[float] = None
    weight_emphasis: Optional[float] = None
