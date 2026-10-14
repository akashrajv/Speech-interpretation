export interface HealthStatus {
  status: string;
  version: string;
  gemini_enabled: boolean;
  gemini_configured: boolean;
  database_connected: boolean;
  audio_storage_path: string;
  installed_decoders: string[];
}

export interface ModelStatus {
  gemini_model: string;
  gemini_status: string;
  vad_status: string;
  pitch_estimator: string;
  forced_aligner: string;
}

export interface DashboardSummary {
  total_analyses: number;
  completed_analyses: number;
  average_delivery_score: number;
  total_detected_flaws: number;
  most_common_flaw_category: string;
  flaw_category_distribution: Record<string, number>;
  score_distribution: Record<string, number>;
  dataset_sample_count: number;
  recent_analyses: AnalysisListItem[];
}

export interface AnalysisListItem {
  id: string;
  title: string;
  speech_category: string;
  speaker_id?: string;
  status: 'uploaded' | 'queued' | 'processing' | 'completed' | 'failed';
  has_reference: boolean;
  overall_score?: number;
  flaw_count: number;
  duration_seconds: number;
  created_at: string;
}

export interface EvidenceItem {
  metric: string;
  participant_value: number;
  reference_value?: number;
  unit: string;
  delta_percent?: number;
  threshold_applied?: string;
}

export interface FlawItem {
  flaw_id: string;
  category: string;
  start_seconds: number;
  end_seconds: number;
  text_segment: string;
  reference_value?: number;
  participant_value?: number;
  unit: string;
  deviation_percent?: number;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  evidence: EvidenceItem[];
  explanation: string;
  recommendation: string;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  weight: number;
  weighted_score: number;
  justification: string;
  key_metrics: Record<string, any>;
}

export interface RubricScoreBreakdown {
  overall_score: number;
  pacing_score: number;
  pitch_score: number;
  volume_score: number;
  pronunciation_score: number;
  emphasis_score: number;
  weights: Record<string, number>;
  dimensions: DimensionScore[];
  scoring_version: string;
}

export interface SpeechContextAnalysis {
  theme_and_intent: string;
  dramatic_or_rhetorical_stakes: string;
  contextual_delivery_advice: string;
}

export interface FlawInterpretation {
  flaw_id: string;
  explanation: string;
  impact: string;
  contextual_significance?: string;
  recommendations: string[];
  practice_exercise: string;
  priority: string;
}

export interface GeminiInterpretationResponse {
  model_used: string;
  is_deterministic_fallback: boolean;
  summary: string;
  speech_context?: SpeechContextAnalysis;
  strengths: string[];
  interpretations: FlawInterpretation[];
  overall_recommendations: string[];
  limitations: string[];
}

export interface AcousticSummary {
  role: string;
  duration_seconds: number;
  speaking_rate_wpm: number;
  median_pitch_hz?: number;
  pitch_variability_hz?: number;
  pitch_min_hz?: number;
  pitch_max_hz?: number;
  pause_count: number;
  average_pause_seconds: number;
  silence_ratio: number;
  rms_mean: number;
  rms_std: number;
  spectral_centroid_mean?: number;
  spectral_bandwidth_mean?: number;
  spectral_rolloff_mean?: number;
}

export interface FeatureSeries {
  time_stamps: number[];
  rms_envelope: number[];
  pitch_contour: (number | null)[];
  spectral_centroid: number[];
  speaking_rate_series: {
    start_seconds: number;
    end_seconds: number;
    text_segment: string;
    wpm: number;
  }[];
  pauses: {
    start_seconds: number;
    end_seconds: number;
    duration_seconds: number;
    is_long_pause: boolean;
  }[];
  mfcc_heatmaps?: {
    z: number[][];
    x: number[];
    y: string[];
  };
  spectrogram_summary?: {
    z: number[][];
    x: number[];
    y: number[];
  };
}

export interface WordAlignmentItem {
  word: string;
  word_index: number;
  start_seconds: number;
  end_seconds: number;
  confidence: number;
}

export interface AnalysisDetail {
  id: string;
  title: string;
  speech_category: string;
  speaker_id?: string;
  status: string;
  error_message?: string;
  has_reference: boolean;
  duration_seconds: number;
  created_at: string;
  transcript?: string;
  word_count?: number;
  participant_features?: AcousticSummary;
  reference_features?: AcousticSummary;
  feature_series_participant?: FeatureSeries;
  feature_series_reference?: FeatureSeries;
  alignments_participant: WordAlignmentItem[];
  alignments_reference: WordAlignmentItem[];
  flaws: FlawItem[];
  rubric_score?: RubricScoreBreakdown;
  gemini_interpretation?: GeminiInterpretationResponse;
}

export interface DatasetSample {
  id: string;
  sample_id: string;
  script_id: string;
  title: string;
  speech_category: string;
  speaker_id?: string;
  role: string;
  audio_path: string;
  transcript_text: string;
  flaw_categories: string[];
  severity: string;
  is_synthetic: boolean;
  perturbation_type?: string;
  split: string;
  notes?: string;
  annotations_count: number;
  created_at: string;
}

export interface ValidationReport {
  total_test_samples: number;
  total_annotations: number;
  total_predictions: number;
  overall_precision: number;
  overall_recall: number;
  overall_f1_score: number;
  mean_temporal_iou: number;
  iou_threshold: number;
  confusion_matrix: Record<string, Record<string, number>>;
  category_metrics: {
    category: string;
    ground_truth_count: number;
    predicted_count: number;
    true_positives: number;
    false_positives: number;
    false_negatives: number;
    precision: number;
    recall: number;
    f1_score: number;
    mean_temporal_iou: number;
  }[];
  evaluation_notes: string;
}

export interface SettingsData {
  gemini_enabled: boolean;
  gemini_configured: boolean;
  gemini_model: string;
  weight_pacing: number;
  weight_pitch: number;
  weight_volume: number;
  weight_pronunciation: number;
  weight_emphasis: number;
  max_upload_size_mb: number;
  max_audio_duration_seconds: number;
}

export interface PracticeDayPlan {
  day_label: string;
  focus_area: string;
  drill_title: string;
  instructions: string;
  target_metric: string;
}

export interface PersonalizedReportRequest {
  speaker_name?: string;
  target_goal?: string;
  coaching_tone?: string;
  custom_notes?: string;
}

export interface PersonalizedReportResponse {
  report_id: string;
  analysis_id: string;
  generated_at: string;
  speaker_name: string;
  speech_title: string;
  speech_category: string;
  target_goal: string;
  duration_seconds: number;
  overall_score: number;
  grade_letter: string;
  performance_verdict: string;
  executive_assessment: string;
  speech_meaning_context?: string;
  strengths: string[];
  priority_flaws: FlawItem[];
  rubric_breakdown?: RubricScoreBreakdown;
  action_routine: PracticeDayPlan[];
  adjudication_notes: string[];
}

