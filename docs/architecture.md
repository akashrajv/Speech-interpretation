# Counterpoint AI — System Architecture

Counterpoint AI evaluates competitive speeches by comparing a participant's recording with an ideal reference recording of the exact same transcript. It identifies delivery flaws, estimates approximate start and end timestamps, explains the mathematical evidence behind them, calculates reproducible rubric-based scores, and provides actionable improvement recommendations with optional Google Gemini API coaching.

---

## 1. Pipeline Overview

```
                      +-----------------------------+
                      | Audio Upload (Participant & |
                      |    Reference Audio Files)   |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Audio Decoding & 16kHz Mono |
                      | Preprocessing & VAD Detect  |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Acoustically-Guided Word    |
                      | Syllable Forced Alignment   |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Feature Extraction: RMS, F0 |
                      | STFT Spec, MFCC, Pauses, WPM|
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Segment Matching & Temporal |
                      | Flaw Detection Engine (1-10)|
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Reproducible 5-Dimension    |
                      | Rubric Scoring Engine (0-100|
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Google Gemini AI Coach /    |
                      | Deterministic Fallback      |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Interactive Dashboard &     |
                      | WaveSurfer / Plotly Views   |
                      +-----------------------------+
```

---

## 2. Audio Signal Processing & Feature Extraction

- **Preprocessing (`backend/app/audio/preprocessing.py`)**:
  - Decodes input formats (WAV, MP3, M4A, FLAC, OGG) using SoundFile and SciPy.
  - Normalizes to mono float32, resamples to 16 kHz.
  - Signal quality inspection: checks clipping ratio, dynamic peak amplitude, and estimates Signal-to-Noise Ratio (SNR).
  - Voice Activity Detection (VAD): Adaptive energy and spectral flux segmentation to classify speech-active vs non-speech regions.

- **Waveform & Energy (`backend/app/audio/waveform.py`)**:
  - Downsampled peak amplitude envelopes (800 points) for client rendering.
  - Short-Time Root-Mean-Square (RMS) envelope with 50ms window and 25ms hop.

- **Spectral & FFT Analysis (`backend/app/audio/fft_analysis.py`)**:
  - Short-Time Fourier Transform (STFT) magnitude spectrogram in dB.
  - Spectral Centroid, Spectral Bandwidth, Spectral Rolloff (85%), Spectral Flatness.

- **Mel-Frequency Cepstral Coefficients (`backend/app/audio/mfcc_analysis.py`)**:
  - 13 MFCCs, delta, and delta-delta coefficients.
  - Pairwise acoustic distance calculation via Frame-wise Cosine Distance and normalized Dynamic Time Warping (DTW).

- **Fundamental Frequency (F0) Pitch Estimation (`backend/app/audio/pitch_analysis.py`)**:
  - Pitch estimation using the YIN algorithm (`librosa.yin`) bounded between 65 Hz and 500 Hz.
  - Voiced vs unvoiced classification via energy gating.
  - Metrics: Median F0, Min, Max, Range, and pitch variability (standard deviation in Hz).

- **Pauses & Silence Detection (`backend/app/audio/pause_detection.py`)**:
  - Contiguous silence tracking with thresholding.
  - Classifies natural rhetorical pauses (< 1.2s) vs prolonged/awkward silences (>= 1.2s).

- **Speaking Rate (`backend/app/audio/speaking_rate.py`)**:
  - Computes Words Per Minute (WPM) based on total duration and speech-active duration.
  - Rolling segment-level WPM along aligned word sequences.

---

## 3. Forced Alignment & Segment Matching

- **Aligner (`backend/app/alignment/aligner.py`)**:
  - Tokenizes transcripts while preserving casing and punctuation.
  - Weight-distributes words across speech intervals using vowel-cluster syllable counts and pause boundaries.
  - Produces word-level start and end timestamps with confidence scores.

- **Phrase Segmentation (`backend/app/alignment/transcript_mapping.py`)**:
  - Partitions speeches into syntactic phrases using punctuation anchors.
  - Compares matched participant and reference phrases for tempo deviations and duration deltas.

---

## 4. Temporal Flaw Detection Engine

1. **Excessive Speaking Rate**: Segment WPM > 25% faster than reference or > 180 WPM.
2. **Unusually Slow Speaking Rate**: Segment WPM > 25% slower than reference or < 100 WPM.
3. **Excessive Pause**: Silence intervals >= 1.6s.
4. **Misplaced Pause**: Mid-clause pauses interrupting continuous syntactic words.
5. **Inconsistent Loudness**: Trailing volume drop-off at sentence conclusions (> 70% energy decay).
6. **Flat Intonation**: Monotone delivery (F0 std dev < 12 Hz where reference had inflection).
7. **Abrupt Pitch Changes**: Sudden pitch spikes or breaks > 55 Hz.
8. **Potential Pronunciation / Articulation Mismatches**: Word duration compressed to < 28% of expected duration.
9. **Unusual Acoustic Deviations**: Elevated MFCC distance outlier segments.

---

## 5. Rubric Scoring Engine

- **Pacing & Rhythm (25%)**: Speaking tempo deviations, silence ratios, pause frequencies.
- **Pitch & Intonation (20%)**: F0 variability, inflection contours, vocal break penalties.
- **Volume & Projection (20%)**: Loudness stability, sentence-tail volume retention, SNR.
- **Pronunciation & Clarity (20%)**: Articulation duration fidelity and clarity on consonant onsets.
- **Emphasis & Expressiveness (15%)**: Dynamic contrast and spectral centroid shifts.

Composite overall score: 0 to 100, reproducible across identical inputs and configurations.

---

## 6. Google Gemini AI Interpretation & Coaching

- Integrated via official `google-genai` SDK (`from google import genai`).
- Dedicated system instruction prevents hallucination of measurements or altered timestamps.
- Structured Pydantic-validated output format:
  - Summary
  - Strengths
  - Flaw-by-flaw interpretations: Explanation, impact, actionable recommendations, practice drill, priority.
  - Overall practice priorities and analysis limitations.
- **Deterministic Fallback**: If `GEMINI_API_KEY` is not configured or offline, the system automatically falls back to deterministic rule-based coaching without crashing or blocking analysis.
