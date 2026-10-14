# Counterpoint AI — Speech Analytics & Temporal Flaw Finding

Counterpoint AI is a full-stack, research-grade speech evaluation platform. It evaluates competitive speech deliveries by comparing a participant's recording with an ideal reference recording of the exact same transcript. The system identifies delivery flaws, isolates start and end timestamps, explains the mathematical evidence behind each deviation, calculates reproducible rubric-based scores (0–100), and provides actionable coaching recommendations powered by Google's Gemini API with an automatic deterministic fallback.

---

## Key Features

1. **Dual Audio Signal Processing**:
   - Resamples and normalizes audio to 16 kHz mono WAV.
   - Extracts amplitude envelopes, short-time RMS energy (50ms window), and clipping metrics.
   - Estimates fundamental frequency ($F_0$) pitch contours using Librosa's YIN algorithm.
   - Computes STFT magnitude spectrograms, spectral centroid, rolloff, and bandwidth.
   - Extracts 13 Mel-Frequency Cepstral Coefficients (MFCCs) with delta coefficients and computes Dynamic Time Warping (DTW) acoustic distance.
   - Detects natural vs prolonged pauses and calculates speech-active Words Per Minute (WPM).

2. **Acoustically-Guided Forced Alignment**:
   - Tokenizes and cleans transcripts while preserving original punctuation anchors.
   - Accurately aligns words and phrases to speech intervals using vowel-cluster syllable weighting and pause bounds.

3. **Temporal Flaw Detection Engine**:
   - **Excessive Speaking Rate**: Rushed tempo (>25% faster than reference or >180 WPM).
   - **Unusually Slow Rate**: Sluggish pacing (>25% slower than reference or <100 WPM).
   - **Excessive Pauses**: Awkward silences ($\ge 1.6\text{s}$).
   - **Misplaced Pauses**: Mid-clause interruptions inside syntactic phrases.
   - **Inconsistent Loudness**: Trailing volume drop-offs at sentence conclusions.
   - **Flat Intonation**: Monotone delivery lacking vocal pitch inflection.
   - **Abrupt Pitch Breaks**: Involuntary vocal fractures (>55 Hz instantaneous jump).
   - **Articulation & Pronunciation Mismatches**: Severe duration compression (<28% of expected duration).
   - **Acoustic Outliers**: High spectral MFCC distance divergences.

4. **Reproducible 5-Dimension Rubric Scoring**:
   - **Pacing & Rhythm (25%)**
   - **Pitch & Intonation (20%)**
   - **Volume & Projection (20%)**
   - **Pronunciation & Clarity (20%)**
   - **Emphasis & Expressiveness (15%)**

5. **Google Gemini AI Coaching**:
   - Integrated via the official `google-genai` Python SDK.
   - Dedicated system prompt prevents hallucination of measurements or altered timestamps.
   - Pydantic-validated structured response with targeted practice exercises.
   - **Deterministic Fallback Engine**: Operates offline or without an API key without crashing.

6. **Interactive Visualizations**:
   - Synchronized dual WaveSurfer audio waveforms.
   - Flaw interval pins: clicking seeks audio, highlights regions, and inspects evidence.
   - Interactive charts: Speaking Rate bars, $F_0$ Pitch contours, RMS Loudness curves, Pause timelines, and Spectrogram heatmaps.
   - Word-level forced alignment transcript viewer.

7. **Contrastive Dataset & Model Validation**:
   - Paired reference and flawed sample repository with train/val/test splits.
   - Precision, Recall, F1 score, mean temporal Intersection-over-Union (IoU), and Confusion Matrix calculated against human annotations.

8. **Report Export**:
   - Download complete speech evaluation reports as structured JSON or formatted CSV.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, WaveSurfer.js, Axios, React Router.
- **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy, NumPy, SciPy, Librosa, SoundFile, scikit-learn, Pandas.
- **AI Integration**: Google Gemini API via official `google-genai` SDK.
- **Database**: SQLite (`counterpoint.db`).

---

## Windows 11 Installation & Execution Guide

Open **PowerShell** in the project root directory (`d:\Speech interpreter`):

### 1. Backend Setup

```powershell
# 1. Verify Python is installed (Python 3.11+ recommended)
python --version

# 2. Create and activate a virtual environment (optional but recommended)
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install backend dependencies
python -m pip install -r backend/requirements.txt

# 4. Configure environment variables
# Copy .env.example to .env
Copy-Item .env.example .env

# Optional: Add your Google Gemini API key in .env if you wish to use Gemini AI
# GEMINI_API_KEY=your_key_here
# ENABLE_GEMINI=true
```

### 2. Frontend Setup

```powershell
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node.js dependencies
npm install

# 3. Build production bundle (or start development server)
npm run build
cd ..
```

### 3. Running the Application

Open two PowerShell terminal windows:

#### Terminal 1 — Backend API Server:
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API Swagger Docs available at:* `http://127.0.0.1:8000/docs`

#### Terminal 2 — Frontend Application:
```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
*Web Application interface:* `http://127.0.0.1:5173/`

---

## Running Automated Tests

To run the complete automated test suite (audio processing, pitch estimation, pause detection, speaking rate, forced alignment, flaw detection, rubric reproducibility, IoU metrics, API endpoints, and report export):

```powershell
python -m pytest backend/tests -v
```

All 15 unit and integration tests pass with zero errors.

---

## Instant 1-Click Verification

To immediately evaluate speech without uploading external audio files:
1. Open `http://127.0.0.1:5173/` in your browser.
2. Click **"Test Hamlet Soliloquy"** or **"Test Persuasive Speech"** in the top hero banner.
3. The platform will automatically run the audio processing pipeline and load the complete evaluation results page with waveforms, rubric gauge, flaw chips, and acoustic feature charts.

---

## Troubleshooting

- **FFmpeg not found**: Librosa and SoundFile use native `libsndfile` and SciPy decoders for uncompressed WAV, FLAC, and OGG. For standard formats, FFmpeg is not strictly required.
- **Gemini Quota or Missing Key**: The application automatically switches to the deterministic coaching engine if no key is present or if network errors occur. The core audio analysis and scoring are completely independent of Gemini.
- **Port Conflicts**: Backend port can be changed in `.env` (`APP_PORT=8000`). If port 5173 is in use, Vite will automatically select an available port or configure `--port 5174`.
