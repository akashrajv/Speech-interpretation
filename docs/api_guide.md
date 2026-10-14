# Counterpoint AI — REST API Documentation

Base URL: `http://127.0.0.1:8000/api`

Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`

---

## 1. System & Health

### `GET /health`
Returns system status, database connectivity, and installed audio decoders.

### `GET /health/models`
Returns status of local signal processing estimators (VAD, YIN Pitch, Syllable Aligner) and Gemini AI.

### `GET /dashboard/summary`
Returns aggregate analytics across all recorded analyses, flaw distributions, and score brackets.

---

## 2. Speech Analysis

### `POST /analyses`
Creates and enqueues a new speech evaluation job.
- **Form Data**:
  - `participant_audio`: Audio file (WAV, MP3, M4A, etc.)
  - `reference_audio`: (Optional) Ideal comparison recording
  - `transcript_text`: Transcript string
  - `title`: Speech title
  - `speech_category`: Speech discipline
  - `enable_gemini_interpret`: boolean flag

### `POST /analyses/sample?sample_key=script_1`
Immediately executes an end-to-end evaluation benchmark using pre-synthesized audio fixtures (`script_1` for Hamlet, `script_2` for Oratory).

### `GET /analyses`
Lists all evaluations with optional filtering by `category` and `status`.

### `GET /analyses/{analysis_id}`
Returns full evaluation details, including acoustic feature summaries, word alignments, detected flaws, rubric breakdown, and Gemini coaching.

### `GET /analyses/{analysis_id}/report?format=json|csv`
Exports complete analysis report as downloadable JSON or CSV file.

### `GET /analyses/{analysis_id}/audio/{role}`
Streams normalized WAV audio file for playback (`role=participant` or `role=reference`).

### `DELETE /analyses/{analysis_id}`
Deletes an evaluation, its database records, and associated local audio files.

---

## 3. Dataset & Model Validation

### `GET /dataset/samples`
Lists contrastive dataset samples by split (`train`, `val`, `test`).

### `POST /dataset/samples`
Adds a new sample with metadata.

### `POST /dataset/annotations`
Adds expert human ground-truth flaw annotations.

### `POST /evaluation/validate?iou_threshold=0.30`
Evaluates automated flaw detections against ground truth human annotations, returning Precision, Recall, F1, mean IoU, and confusion matrix.

---

## 4. Settings

### `GET /settings`
Fetches current Gemini settings and rubric weights.

### `POST /settings`
Updates Gemini API credentials, selected model, and rubric dimension weights.
