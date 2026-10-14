import os
import json
import logging
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert speech forensics adjudicator and evidence-grounded delivery coach. You analyze speeches by combining deep rhetorical/literary context analysis with empirical acoustic measurements.

Your responsibilities:
1. Analyze the RHETORICAL CONTEXT, dramatic stakes, and thematic intent of the speech transcript (e.g., Hamlet's existential crisis in Shakespeare, the moral urgency of technological democracy in Persuasive Oratory, or civic defense in Declamation).
2. Explain how this specific speech context dictates how the speech SHOULD be delivered (vocal weight, pacing control, pause placement, dynamic inflection).
3. Ground every detected acoustic flaw in its SPEECH CONTEXT: Explain precisely how the measured temporal deviation (e.g., rushed WPM, awkward pause, trailing volume) damages the meaning, emotional resonance, and dramatic effect of those specific words.
4. Provide specific, practical exercises tailored to this context and speech category.

Preserve every supplied flaw ID and timestamp exactly. Do not invent measurements or psychological diagnoses.

Return ONLY valid JSON matching this schema:
{
  "summary": "Evidence-grounded performance summary integrating acoustic findings with speech context",
  "speech_context": {
    "theme_and_intent": "Deep analysis of the speech's rhetorical context, speaker objective, and thematic stakes",
    "dramatic_or_rhetorical_stakes": "The emotional, philosophical, or argumentative stakes that demand specific vocal choices",
    "contextual_delivery_advice": "How the speaker must modulate tempo, pitch, and pauses to serve this specific text"
  },
  "strengths": ["Identified delivery strength based on measurements and contextual appropriateness"],
  "interpretations": [
    {
      "flaw_id": "exact_matching_flaw_id",
      "explanation": "Interpretation of measured acoustic evidence",
      "impact": "Potential effect on delivery and audience reception",
      "contextual_significance": "Deep explanation of how this flaw specifically damages the meaning and rhetorical context of this passage",
      "recommendations": ["Actionable tactical recommendation"],
      "practice_exercise": "Specific vocal exercise to correct this pattern",
      "priority": "high"
    }
  ],
  "overall_recommendations": ["High-level priority practice steps tailored to this speech context"],
  "limitations": ["Technical or acoustic measurement boundaries"]
}
"""

def generate_deterministic_coaching(
    speech_category: str,
    overall_score: float,
    flaws: List[Dict[str, Any]],
    rubric_score: Dict[str, Any],
    transcript_text: str = ""
) -> Dict[str, Any]:
    """
    High-quality deterministic coaching incorporating speech context and rhetorical intent.
    """
    interpretations = []
    strengths = []
    overall_recs = []

    # 1. Determine Speech Context based on text content & category
    lower_t = transcript_text.lower()
    if "hamlet" in lower_t or "to be, or not to be" in lower_t or "question" in lower_t:
        context_analysis = {
            "theme_and_intent": "Shakespeare's Hamlet (Act 3, Scene 1): An iconic philosophical soliloquy contemplating existence, mortal suffering, and the daunting fear of the unknown after death. The speaker's intent is internal, introspective, and heavily laden with existential dread.",
            "dramatic_or_rhetorical_stakes": "The stakes are life versus suicide. Every phrase contains heavy antithetical paradoxes ('to be, or not to be', 'nobler in the mind to suffer' vs 'take arms'). Rushing or delivering this monotonically trivializes a profound moral crisis.",
            "contextual_delivery_advice": "Requires contemplative pacing (115–130 WPM), resonant diaphragmatic breath support, and intentional pauses between clauses to let the philosophical paradoxes settle with the audience."
        }
    elif "technological" in lower_t or "crossroads" in lower_t or "democracy" in lower_t:
        context_analysis = {
            "theme_and_intent": "Persuasive Oratory on Technology and Ethics: An urgent civic argument addressing how automated systems shape human freedom. The speaker's goal is to convince the audience of their immediate responsibility.",
            "dramatic_or_rhetorical_stakes": "High civic stakes where clarity and moral conviction are paramount. The audience must perceive the speaker as authoritative, ethical, and grounded.",
            "contextual_delivery_advice": "Demands steady, commanding forward tempo, resonant terminal word projection, and decisive vocal cadence that conveys unwavering conviction."
        }
    elif "declamation" in speech_category.lower() or "freedom" in lower_t or "liberty" in lower_t:
        context_analysis = {
            "theme_and_intent": "Competitive Declamation: Re-delivering a historic speech with authentic civic passion and rhetorical grandeur to inspire defense of democratic ideals.",
            "dramatic_or_rhetorical_stakes": "Historical and emotional urgency where every assertion serves as a rallying call.",
            "contextual_delivery_advice": "Requires expansive pitch modulation, elevated dynamic contrast, and crisp consonant articulation on key verbs."
        }
    else:
        context_analysis = {
            "theme_and_intent": f"{speech_category} Address: A formal presentation aimed at engaging listeners through coherent thematic exposition and persuasive delivery.",
            "dramatic_or_rhetorical_stakes": "Establishing credibility (ethos) and emotional rapport (pathos) while maintaining intellectual clarity (logos).",
            "contextual_delivery_advice": "Focus on deliberate phrasing, natural breath pauses at punctuation markers, and sustained vocal projection through phrase endings."
        }

    # 2. Derive strengths
    dimensions = rubric_score.get("dimensions", [])
    for d in sorted(dimensions, key=lambda x: x.get("score", 0), reverse=True):
        if d.get("score", 0) >= 80:
            strengths.append(f"Strong performance in {d['dimension']} ({d['score']}/100): {d['justification']}")

    if not strengths:
        strengths.append(f"Solid vocal resonance in {speech_category} with clear baseline presence.")

    # 3. Flaw interpretations with Contextual Significance
    for f in flaws:
        cat = f.get("category", "")
        f_id = f.get("flaw_id", "")
        text = f.get("text_segment", "")
        explanation = f.get("explanation", "")
        priority = f.get("severity", "medium")

        if "rate" in cat:
            impact = "Accelerated tempo reduces listener comprehension and diminishes the rhetorical weight of key assertions."
            context_sig = f"In this rhetorical context, delivering '{text}' at accelerated tempo prevents the audience from absorbing the underlying idea, reducing solemn contemplation to hurried recitation."
            recs = [
                f"Practice phrase '{text}' with a metronome set at 125 WPM.",
                "Insert deliberate micro-pauses at punctuation marks to reset breathing."
            ]
            exercise = "Pacing Drill: Read the passage while tapping your palm on stressed syllables to establish an even, controlled cadence."
        elif "pause" in cat:
            impact = "Unplanned silence or misplaced hesitations interrupt the natural syntax and weaken oratorical flow."
            context_sig = f"Dividing the thought in '{text}' with an awkward silence fractures the speaker's line of reasoning, giving the impression of momentary memory lapse or lack of conviction."
            recs = [
                "Map your breath marks onto the printed script before speaking.",
                "Avoid mid-clause pauses by taking deeper diaphragmatic breaths at sentence boundaries."
            ]
            exercise = "Syntax-Pause Drill: Mark phrase units with slashes ('/') and only pause at marked boundaries for exactly 0.5–0.7 seconds."
        elif "pitch" in cat or "intonation" in cat:
            impact = "Monotone pitch reduces expressiveness and can cause listeners to disengage during argumentative discourse."
            context_sig = f"The dramatic stakes of '{text}' demand emotional color; maintaining a flat pitch line strips the passage of pathos and rhetorical contrast."
            recs = [
                "Elevate vocal pitch slightly when introducing new concepts or questions.",
                "Conclude declarations with a firm, falling pitch contour to signal authority."
            ]
            exercise = "Pitch Glide Drill: Practice gliding your vocal range up a fifth on stressed nouns, then step down firmly at full stops."
        elif "loudness" in cat:
            impact = "Terminal volume decay makes word endings inaudible, eroding sentence impact."
            context_sig = f"Dropping volume on the final words of '{text}' causes the thesis conclusion to dissipate without force, failing to establish authority with competitive judges."
            recs = [
                "Engage core abdominal support through the final syllable of each sentence.",
                "Avoid trailing off into vocal fry at clause conclusions."
            ]
            exercise = "Projection Anchor Drill: Speak the final three words of each sentence with 10% more vocal energy than the opening words."
        else:
            impact = "Acoustic divergence from the reference suggests clarity or articulation variations."
            context_sig = f"Clarity variations on '{text}' blur the intellectual precision demanded by this speech text."
            recs = [
                f"Articulate dental and stop consonants crisply on '{text}'.",
                "Ensure microphone placement remains stable."
            ]
            exercise = "Diction Workout: Exaggerate consonant articulation at half-speed before delivering at full performance tempo."

        interpretations.append({
            "flaw_id": f_id,
            "explanation": explanation,
            "impact": impact,
            "contextual_significance": context_sig,
            "recommendations": recs,
            "practice_exercise": exercise,
            "priority": priority
        })

    if flaws:
        overall_recs.append("Prioritize cadence control: synchronize pause placement with syntactic clause structure.")
        overall_recs.append("Maintain forward vocal resonance through sentence conclusions to prevent trailing off.")
        overall_recs.append("Conduct timed practice repetitions while monitoring pacing and inflection metrics.")
    else:
        overall_recs.append("Excellent execution! Focus on nuanced emotional color and dynamic contrast for competition readiness.")

    summary = (
        f"Contextual analysis for {speech_category}: Evaluated delivery with an overall delivery score of {overall_score:.1f}/100. "
        f"The engine identified {len(flaws)} temporal deviation(s). {context_analysis['theme_and_intent']}"
    )

    limitations = [
        "Acoustic measurements are extracted from audio without calibrated SPL sound pressure levels.",
        "Speech context analysis is grounded in text semantics and speech forensics competition standards.",
        "Deterministic coaching mode active (no external LLM API credentials required)."
    ]

    return {
        "model_used": "deterministic-rules-engine",
        "is_deterministic_fallback": True,
        "summary": summary,
        "speech_context": context_analysis,
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
    Calls Google Gemini via official google-genai SDK to analyze speech context
    and generate evidence-grounded coaching.
    """
    api_key = os.getenv("GEMINI_API_KEY", settings.GEMINI_API_KEY)
    enable_gemini = os.getenv("ENABLE_GEMINI", str(settings.ENABLE_GEMINI)).lower() in ("true", "1", "yes")

    if not enable_gemini or not api_key:
        logger.info("Gemini AI is disabled or GEMINI_API_KEY is not set. Using deterministic coaching engine.")
        return generate_deterministic_coaching(speech_category, overall_score, flaws, rubric_score, transcript_text)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        model_name = os.getenv("GEMINI_MODEL", settings.GEMINI_MODEL) or "gemini-3.5-flash-lite"

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

        user_prompt = (
            f"Analyze the speech context, rhetorical intent, and temporal flaws for this delivery:\n\n"
            f"{json.dumps(evidence_payload, indent=2)}"
        )

        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(
                client.models.generate_content,
                model=model_name,
                contents=[user_prompt],
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )
            response = future.result(timeout=25)

        response_text = response.text.strip()
        data = json.loads(response_text)

        # Validate response schema
        return {
            "model_used": model_name,
            "is_deterministic_fallback": False,
            "summary": data.get("summary", "Performance evaluation generated by Gemini."),
            "speech_context": data.get("speech_context", {
                "theme_and_intent": f"Contextual analysis for {speech_category}.",
                "dramatic_or_rhetorical_stakes": "Competitive speech evaluation.",
                "contextual_delivery_advice": "Maintain steady cadence and vocal resonance."
            }),
            "strengths": data.get("strengths", []),
            "interpretations": data.get("interpretations", []),
            "overall_recommendations": data.get("overall_recommendations", []),
            "limitations": data.get("limitations", [
                "Measurements are acoustically extracted from uncalibrated audio.",
                "AI interpretations provide coaching guidance grounded in speech semantics and acoustics."
            ])
        }

    except Exception as e:
        logger.warning(f"Gemini API request failed ({str(e)}). Falling back to deterministic coaching engine.")
        fallback = generate_deterministic_coaching(speech_category, overall_score, flaws, rubric_score, transcript_text)
        fallback["limitations"].append(f"Gemini API fallback triggered: {type(e).__name__}")
        return fallback
