# Contrastive Dataset & Annotation Guide

Counterpoint AI relies on paired ideal reference recordings and flawed participant recordings of the exact same script. This document outlines the schema, annotation methodology, and evaluation criteria.

---

## 1. Directory Structure

```
data/
  raw/                 # Original user audio uploads
  processed/           # Normalized 16 kHz mono WAV files
  samples/             # Pre-synthesized reference & flawed audio presets
  annotations/         # Ground-truth human annotations
```

---

## 2. Sample Data Schema

Each dataset sample contains:
- `sample_id`: Unique identifier (e.g., `sample_hamlet_01`)
- `script_id`: Identifies the shared script (e.g., `script_hamlet_soliloquy`)
- `title`: Human-readable title
- `speech_category`: Speech discipline (e.g., `Interpretive Reading`, `Persuasive Oratory`)
- `speaker_id`: Pseudonymous speaker ID
- `role`: `reference` (ideal model) or `participant` (competitor delivery)
- `audio_path`: Path to local audio recording
- `transcript_text`: Exact text of the speech
- `flaw_categories`: Array of targeted flaw labels
- `split`: Dataset partition (`train`, `val`, `test`)
- `is_synthetic`: Boolean indicating whether perturbation was applied

---

## 3. Human Ground-Truth Annotation Guidelines

When an expert judge annotates delivery flaws:
1. **Flaw Category**: Choose from the standardized taxonomy (`excessive_speaking_rate`, `unusually_slow_rate`, `excessive_pause`, `misplaced_pause`, `flat_intonation`, `inconsistent_loudness`).
2. **Start & End Timestamps**: Mark the precise interval in seconds where the deviation occurs.
3. **Text Segment**: Note the phrase or words spoken during that interval.
4. **Severity**: Assign `low`, `medium`, or `high`.
5. **Explanation**: Provide judge commentary describing the pedagogical impact.

---

## 4. Evaluation Metrics & Matching Criteria

Model predictions are matched to ground-truth annotations using **1D Temporal Intersection-over-Union (IoU)**:

$$\text{IoU} = \frac{\text{Intersection}(A_{\text{pred}}, A_{\text{gt}})}{\text{Union}(A_{\text{pred}}, A_{\text{gt}})}$$

- A prediction is counted as a **True Positive (TP)** if its category matches the ground truth and $\text{IoU} \ge \theta$ (default $\theta = 0.30$).
- If no ground truth matches the prediction with $\text{IoU} \ge \theta$, it is counted as a **False Positive (FP)**.
- If a ground truth annotation has no matching prediction with $\text{IoU} \ge \theta$, it is counted as a **False Negative (FN)**.

Metrics computed:
- **Precision**: $\frac{\text{TP}}{\text{TP} + \text{FP}}$
- **Recall**: $\frac{\text{TP}}{\text{TP} + \text{FN}}$
- **F1 Score**: $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$
- **Mean Temporal IoU**: Average overlap of all matched predictions.
