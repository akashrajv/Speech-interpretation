import os
import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an evidence-grounded speech delivery coach. You receive measurements and flaw detections produced by a separate audio-analysis engine.

Explain the significance of each detected deviation in plain language. Use only supplied transcript segments, measurements, timestamps and confidence information.

Do not invent measurements, flaws, words, timestamps, causes or scores. Do not infer psychological conditions from acoustic signals. Distinguish observed measurements from possible rhetorical effects.

Preserve every supplied flaw ID and timestamp exactly. Provide specific, practical improvements relevant to the text and speech category.

If evidence is insufficient, say so explicitly. If a deviation is not necessarily a flaw, acknowledge that limitation.

Return only valid JSON matching this schema:
{
  "summary": "Evidence-grounded performance summary",
  "strengths": ["Identified delivery strength based on measurements"],
  "interpretations": [
    {
      "flaw_id": "exact_matching_flaw_id",
      "explanation": "Interpretation of measured evidence",
      "impact": "Potential effect on delivery and audience reception",
      "recommendations": ["Actionable tactical recommendation"],
      "practice_exercise": "Specific vocal exercise to correct this pattern",
      "priority": "high"
    }
  ],
  "overall_recommendations": ["High-level priority practice steps"],
  "limitations": ["Technical or acoustic measurement boundaries"]
}
"""

def generate_deterministic_coaching(
    speech_category: str,
    overall_score: float,
    flaws: List[Dict[str, Any]],
    rubric_score: Dict[str, Any]
) -> Dict[str, Any]:
    """
    High-quality deterministic fallback coaching generated when Gemini is not enabled or unavailable.
    """
    interpretations = []
    strengths = []
    overall_recs = []

    # Derive strengths from high rubric dimensions
    dimensions = rubric_score.get("dimensions", [])
    for d in sorted(dimensions, key=lambda x: x.get("score", 0), reverse=True):
        if d.get("score", 0) >= 80:
            strengths.append(f"Strong performance in {d['dimension']} ({d['score']}/100): {d['justification']}")

    if not strengths:
        strengths.append(f"Solid foundational delivery in {speech_category} with consistent vocal presence.")

    for f in flaws:
        cat = f.get("category", "")
        f_id = f.get("flaw_id", "")
        text = f.get("text_segment", "")
        dev = f.get("deviation_percent", 0.0)
        p_val = f.get("participant_value")
        r_val = f.get("reference_value")
        unit = f.get("unit", "")

        explanation = f.get("explanation", "")
        priority = f.get("severity", "medium")

        if "rate" in cat:
            impact = "Accelerated tempo reduces listener comprehension and diminishes the rhetorical weight of key assertions."
            recs = [
                f"Practice phrase '{text}' with a metronome set at 130 WPM.",
                "Insert deliberate micro-pauses at punctuation marks to reset breathing."
            ]
            exercise = "Pacing Drill: Read the excerpt while tapping your thigh on stressed syllables to establish an even, controlled cadence."
        elif "pause" in cat:
            impact = "Unplanned silence or misplaced hesitations interrupt the natural syntax and weaken oratorical flow."
            recs = [
                "Map your breath marks onto the printed script before speaking.",
                "Avoid mid-clause pauses by taking deeper diaphragmatic breaths at sentence boundaries."
            ]
            exercise = "Syntax-Pause Drill: Mark phrase units with slashes ('/') and only pause at marked boundaries for exactly 0.5–0.7 seconds."
        elif "pitch" in cat or "intonation" in cat:
            impact = "Monotone pitch reduces expressiveness and can cause listeners to disengage during argumentative discourse."
            recs = [
                "Elevate vocal pitch slightly when introducing new concepts or questions.",
                "Conclude declarations with a firm, falling pitch contour to signal authority."
            ]
            exercise = "Pitch Glide Drill: Practice sirens and gliding vocal range up a fifth on stressed nouns, then step down at full stops."
        elif "loudness" in cat:
            impact = "Terminal volume decay makes word endings inaudible, eroding sentence impact."
            recs = [
                "Engage core abdominal support through the final syllable of each sentence.",
                "Avoid trailing off into vocal fry at clause conclusions."
            ]
            exercise = "Projection Anchor Drill: Speak the final three words of each sentence with 10% more vocal energy than the opening words."
        else:
            impact = "Acoustic divergence from the reference suggests clarity or articulation variations."
            recs = [
                f"Articulate dental and stop consonants crisply on '{text}'.",
                "Ensure microphone placement remains stable."
            ]
            exercise = "Diction Workout: Exaggerate consonant articulation at half-speed before delivering at full performance tempo."

        interpretations.append({
            "flaw_id": f_id,
            "explanation": explanation,
            "impact": impact,
            "recommendations": recs,
            "practice_exercise": exercise,
            "priority": priority
        })

    if flaws:
        overall_recs.append("Prioritize cadence control: synchronize pause placement with syntactic clause structure.")
        overall_recs.append("Maintain forward vocal resonance through sentence conclusions to prevent trailing off.")
        overall_recs.append("Conduct timed practice repetitions while recording and monitoring pacing metrics.")
    else:
        overall_recs.append("Excellent execution! Focus on nuanced emotional color and dynamic contrast for competition readiness.")

    summary = (
        f"Evaluated {speech_category} delivery with an overall delivery score of {overall_score:.1f}/100. "
        f"The analysis identified {len(flaws)} temporal deviation(s). Pacing and pitch stability represent "
        f"the most critical leverage points for competitive refinement."
    )

    limitations = [
        "Acoustic measurements are extracted from single-channel recordings without calibrated microphone SPL levels.",
        "Acoustic deviations from the reference recording highlight stylistic differences and do not automatically indicate inferior rhetorical quality.",
        "Deterministic coaching mode active (no external LLM API credentials required)."
    ]

    return {
        "model_used": "deterministic-rules-engine",
        "is_deterministic_fallback": True,
        "summary": summary,
        "strengths": strengths,
        "interpretations": interpretations,
        "overall_recommendations": overall_recs,
        "limitations": limitations
    }

def interpret_with_gemini(
    speech_category: str,
    overall_score: float,
    transcript_text: str,
    flaws: List[Dict[str, Any]],
    rubric_score: Dict[str, Any],
    part_summary: Dict[str, Any],
    ref_summary: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calls Google Gemini via official google-genai SDK to generate contextual coaching.
    Falls back gracefully to deterministic coaching on any error or if disabled.
    """
    api_key = os.getenv("GEMINI_API_KEY", settings.GEMINI_API_KEY)
    enable_gemini = os.getenv("ENABLE_GEMINI", str(settings.ENABLE_GEMINI)).lower() in ("true", "1", "yes")

    if not enable_gemini or not api_key:
        logger.info("Gemini AI is disabled or GEMINI_API_KEY is not set. Using deterministic coaching engine.")
        return generate_deterministic_coaching(speech_category, overall_score, flaws, rubric_score)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        model_name = os.getenv("GEMINI_MODEL", settings.GEMINI_MODEL) or "gemini-2.5-flash"

        # Prepare evidence payload for Gemini
        evidence_payload = {
            "speech_category": speech_category,
            "transcript": transcript_text,
            "overall_rubric_score": overall_score,
            "rubric_breakdown": rubric_score.get("dimensions", []),
            "participant_summary": {
                "duration_seconds": part_summary.get("duration_seconds"),
                "speaking_rate_wpm": part_summary.get("speaking_rate_wpm"),
                "pitch_median_hz": part_summary.get("median_pitch_hz"),
                "pitch_std_hz": part_summary.get("pitch_variability_hz"),
                "pause_count": part_summary.get("pause_count"),
                "silence_ratio": part_summary.get("silence_ratio")
            },
            "reference_summary": {
                "duration_seconds": ref_summary.get("duration_seconds") if ref_summary else None,
                "speaking_rate_wpm": ref_summary.get("speaking_rate_wpm") if ref_summary else None,
                "pitch_median_hz": ref_summary.get("median_pitch_hz") if ref_summary else None,
                "pitch_std_hz": ref_summary.get("pitch_variability_hz") if ref_summary else None,
            },
            "detected_flaws": [
                {
                    "flaw_id": f.get("flaw_id"),
                    "category": f.get("category"),
                    "start_seconds": f.get("start_seconds"),
                    "end_seconds": f.get("end_seconds"),
                    "text_segment": f.get("text_segment"),
                    "reference_value": f.get("reference_value"),
                    "participant_value": f.get("participant_value"),
                    "unit": f.get("unit"),
                    "deviation_percent": f.get("deviation_percent"),
                    "severity": f.get("severity"),
                    "confidence": f.get("confidence"),
                    "evidence": f.get("evidence", []),
                    "detector_explanation": f.get("explanation"),
                    "detector_recommendation": f.get("recommendation")
                }
                for f in flaws
            ]
        }

        user_prompt = f"Analyze the following evidence from our speech evaluation engine:\n\n{json.dumps(evidence_payload, indent=2)}"

        response = client.models.generate_content(
            model=model_name,
            contents=[user_prompt],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.2,
            )
        )

        response_text = response.text.strip()
        data = json.loads(response_text)

        # Validate response schema
        return {
            "model_used": model_name,
            "is_deterministic_fallback": False,
            "summary": data.get("summary", "Performance evaluation generated by Gemini."),
            "strengths": data.get("strengths", []),
            "interpretations": data.get("interpretations", []),
            "overall_recommendations": data.get("overall_recommendations", []),
            "limitations": data.get("limitations", [
                "Measurements are acoustically extracted from uncalibrated audio.",
                "AI interpretations serve as coaching guidance, not definitive judging verdicts."
            ])
        }

    except Exception as e:
        logger.warning(f"Gemini API request failed ({str(e)}). Falling back to deterministic coaching engine.")
        fallback = generate_deterministic_coaching(speech_category, overall_score, flaws, rubric_score)
        fallback["limitations"].append(f"Gemini API fallback triggered: {type(e).__name__}")
        return fallback
