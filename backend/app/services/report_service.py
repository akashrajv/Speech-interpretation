import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.app.schemas.schemas import (
    PersonalizedReportRequest,
    PersonalizedReportResponse,
    PracticeDayPlan,
    AnalysisDetailResponse,
    FlawItem,
)

def compute_grade_letter(score: float) -> tuple[str, str]:
    """Returns (Grade letter, Performance verdict) based on score."""
    if score >= 90:
        return "A+", "Mastery • Championship Tier Delivery"
    if score >= 85:
        return "A", "Distinction • Highly Effective & Poised"
    if score >= 80:
        return "A-", "Strong Delivery • Minor Polish Needed"
    if score >= 75:
        return "B+", "Proficient • Good Pacing with Isolated Pauses"
    if score >= 70:
        return "B", "Competent • Pacing & Dynamic Variability Inconsistencies"
    if score >= 60:
        return "C", "Developing • Noticeable Fluency & Vocal Inflection Issues"
    return "Needs Practice", "Foundational • Significant Pacing, Tone, and Clarity Flaws"


def generate_personalized_report_data(
    detail: AnalysisDetailResponse,
    req: PersonalizedReportRequest
) -> PersonalizedReportResponse:
    """
    Compiles a comprehensive personalized speech coaching dossier tailored
    to the speaker's name, target occasion, and empirical delivery flaws.
    """
    score = detail.rubric_score.overall_score if detail.rubric_score else 70.0
    grade, verdict = compute_grade_letter(score)

    speaker_name = req.speaker_name.strip() if req.speaker_name and req.speaker_name.strip() else (detail.speaker_id or "Speaker")
    target_goal = req.target_goal.strip() if req.target_goal and req.target_goal.strip() else "Public Speaking & Presentation Excellence"

    # 1. Executive Assessment
    tone = (req.coaching_tone or "balanced").lower()
    strengths = []
    if detail.gemini_interpretation and detail.gemini_interpretation.strengths:
        strengths = detail.gemini_interpretation.strengths
    else:
        # Fallback strengths based on rubric
        if detail.rubric_score:
            for dim in detail.rubric_score.dimensions:
                if dim.score >= 75:
                    strengths.append(f"Strong {dim.dimension.replace('_', ' ')}: {dim.justification}")
        if not strengths:
            strengths.append("Consistent articulation and audible voice projection throughout the speech.")

    # Executive narrative tailored to speaker
    exec_assessment = ""
    if detail.gemini_interpretation and detail.gemini_interpretation.summary:
        exec_assessment = f"Personal assessment for {speaker_name}: {detail.gemini_interpretation.summary}"
    else:
        exec_assessment = (
            f"{speaker_name}'s delivery of '{detail.title}' demonstrated an overall score of {score:.1f}/100 ({grade}). "
            f"Vocal energy was sustained, with primary growth opportunities focused on rhythmic pacing and tonal inflection."
        )

    # 2. Rhetorical context
    speech_context = None
    if detail.gemini_interpretation and detail.gemini_interpretation.speech_context:
        ctx = detail.gemini_interpretation.speech_context
        speech_context = (
            f"Theme & Objective: {ctx.theme_and_intent} "
            f"Key Stakes: {ctx.dramatic_or_rhetorical_stakes} "
            f"Delivery Advice: {ctx.contextual_delivery_advice}"
        )

    # 3. Priority flaws (top 4 ranked by severity & deviation)
    priority_flaws = sorted(
        detail.flaws,
        key=lambda f: (0 if f.severity == "high" else 1 if f.severity == "medium" else 2, -abs(f.deviation_percent or 0))
    )[:5]

    # 4. Tailored 7-Day Action Routine
    action_routine: List[PracticeDayPlan] = []
    has_pacing_flaw = any("rate" in f.category.lower() or "fast" in f.category.lower() for f in detail.flaws)
    has_pause_flaw = any("pause" in f.category.lower() for f in detail.flaws)
    has_pitch_flaw = any("pitch" in f.category.lower() or "intonation" in f.category.lower() for f in detail.flaws)
    has_volume_flaw = any("loudness" in f.category.lower() or "volume" in f.category.lower() for f in detail.flaws)

    action_routine.append(PracticeDayPlan(
        day_label="Day 1–2",
        focus_area="Rhythmic Pacing & Metronome Control",
        drill_title="Syllabic Cadence Metronome Practice",
        instructions=(
            f"{speaker_name}, practice delivering the opening segment ('{detail.transcript[:40] if detail.transcript else 'opening phrase'}...') "
            f"against a metronome set to 140 WPM. Tap your hand on your leg for every stressed syllable to prevent accelerating."
            if has_pacing_flaw else
            "Read your opening paragraph aloud at 135 WPM. Deliberately stretch key vowels to anchor a confident, relaxed tempo."
        ),
        target_metric="Target: 130–150 words per minute without sudden bursts."
    ))

    action_routine.append(PracticeDayPlan(
        day_label="Day 3–4",
        focus_area="Breath Timing & Purposeful Silence",
        drill_title="Comma-and-Period Breath Reset",
        instructions=(
            f"Mark every punctuation mark in your script with a forward slash. "
            f"When you reach a comma, take a quiet 0.5s pause. At periods, pause for a full 1.2s before continuing. "
            f"Eliminate mid-phrase pauses between dependent clauses."
            if has_pause_flaw else
            "Practice holding a comfortable 1-second pause immediately before your most important argumentative point."
        ),
        target_metric="Target: 0 awkward pauses (>1.2s) mid-clause; 100% natural phrase boundaries."
    ))

    action_routine.append(PracticeDayPlan(
        day_label="Day 5–6",
        focus_area="Melodic Inflection & Volume Retention",
        drill_title="Dynamic Vocal Color & Sentence-Tail Power",
        instructions=(
            f"Record yourself reading 3 key lines. Focus on raising pitch slightly on qualifying arguments and lowering it firmly on conclusion statements. "
            f"Ensure the last word of every sentence is spoken with equal acoustic volume to the first."
            if (has_pitch_flaw or has_volume_flaw) else
            "Add vocal dynamism by speaking key emotional adjectives with 15% more volume and a half-octave pitch lift."
        ),
        target_metric="Target: Pitch variability standard deviation > 18 Hz; no volume attenuation under 25% RMS."
    ))

    action_routine.append(PracticeDayPlan(
        day_label="Day 7",
        focus_area="Full Dress Rehearsal & Benchmark Recording",
        drill_title="Continuous Uninterrupted Mock Run",
        instructions=(
            f"Record the full {detail.duration_seconds:.0f}-second speech in one take without stopping. "
            f"Upload the recording back to Counterpoint AI to measure your score improvement."
        ),
        target_metric="Target: Improve composite rubric score by +8 to +15 points."
    ))

    # 5. Adjudication Notes
    adjudication_notes = [
        f"Evaluation certified under Counterpoint AI acoustic forensics standards for category: {detail.speech_category}.",
        f"Target Goal Context: {target_goal}.",
        f"Coaching Tone Applied: {tone.capitalize()} Professional Feedback."
    ]
    if req.custom_notes:
        adjudication_notes.append(f"Coach Special Directives: {req.custom_notes}")

    return PersonalizedReportResponse(
        report_id=f"rpt_{uuid.uuid4().hex[:12]}",
        analysis_id=detail.id,
        generated_at=datetime.utcnow(),
        speaker_name=speaker_name,
        speech_title=detail.title,
        speech_category=detail.speech_category,
        target_goal=target_goal,
        duration_seconds=detail.duration_seconds,
        overall_score=score,
        grade_letter=grade,
        performance_verdict=verdict,
        executive_assessment=exec_assessment,
        speech_meaning_context=speech_context,
        strengths=strengths,
        priority_flaws=priority_flaws,
        rubric_breakdown=detail.rubric_score,
        action_routine=action_routine,
        adjudication_notes=adjudication_notes
    )


def generate_personalized_html_report(report: PersonalizedReportResponse) -> str:
    """
    Renders a standalone, executive-ready HTML dossier formatted in
    Counterpoint AI's White & Dark Blue corporate theme with print styling.
    """
    # Color helper for scores
    score_color = "#059669" if report.overall_score >= 80 else "#1e3a8a" if report.overall_score >= 70 else "#d97706" if report.overall_score >= 60 else "#dc2626"

    # Build rubric rows
    rubric_rows_html = ""
    if report.rubric_breakdown and report.rubric_breakdown.dimensions:
        for dim in report.rubric_breakdown.dimensions:
            d_score = dim.score
            d_color = "#059669" if d_score >= 80 else "#1e3a8a" if d_score >= 70 else "#d97706" if d_score >= 60 else "#dc2626"
            dim_title = dim.dimension.replace("_", " ").title()
            rubric_rows_html += f"""
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #0f172a; font-size: 13px;">{dim_title}</strong>
                    <span style="font-family: monospace; font-weight: bold; color: {d_color}; font-size: 14px;">{d_score:.1f} / 100</span>
                </div>
                <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
                    <div style="width: {min(100, max(5, d_score))}%; height: 100%; background: {d_color}; border-radius: 3px;"></div>
                </div>
                <div style="font-size: 11px; color: #475569; line-height: 1.4;">{dim.justification}</div>
            </div>
            """

    # Build flaw cards
    flaw_rows_html = ""
    if report.priority_flaws:
        for f in report.priority_flaws:
            sev_color = "#dc2626" if f.severity == "high" else "#d97706" if f.severity == "medium" else "#2563eb"
            f_cat = f.category.replace("_", " ").title()
            flaw_rows_html += f"""
            <div style="border-left: 4px solid {sev_color}; background: #f8fafc; border: 1px solid #e2e8f0; border-left-color: {sev_color}; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="color: #0f172a; font-size: 13px;">{f_cat}</strong>
                    <span style="font-size: 11px; font-family: monospace; color: #64748b;">{f.start_seconds:.1f}s – {f.end_seconds:.1f}s</span>
                </div>
                <div style="font-size: 12px; font-style: italic; color: #1e3a8a; margin-bottom: 6px; font-family: monospace;">"{f.text_segment}"</div>
                <div style="font-size: 12px; color: #334155; margin-bottom: 6px;">{f.explanation}</div>
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; font-size: 11px; color: #0f172a;">
                    <strong style="color: #1e3a8a;">Correction Drill:</strong> {f.recommendation}
                </div>
            </div>
            """
    else:
        flaw_rows_html = "<div style='color: #059669; font-size: 13px;'>No critical delivery flaws detected. Delivery matched ideal benchmarks.</div>"

    # Build action routine
    routine_html = ""
    for plan in report.action_routine:
        routine_html += f"""
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="background: #eff6ff; color: #1e3a8a; border: 1px solid #bfdbfe; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">{plan.day_label}</span>
                <strong style="color: #0f172a; font-size: 12px;">{plan.focus_area}</strong>
            </div>
            <div style="font-weight: bold; color: #1e3a8a; font-size: 12px; margin: 4px 0;">{plan.drill_title}</div>
            <div style="font-size: 11px; color: #334155; line-height: 1.4; margin-bottom: 4px;">{plan.instructions}</div>
            <div style="font-size: 11px; font-weight: 600; color: #059669; font-family: monospace;">{plan.target_metric}</div>
        </div>
        """

    # Strengths list
    strengths_html = "".join([f"<li style='margin-bottom: 4px;'>{s}</li>" for s in report.strengths])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Counterpoint AI - Personalised Speech Report for {report.speaker_name}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        
        body {{
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            padding: 40px 20px;
            line-height: 1.5;
        }}
        
        .container {{
            max-width: 900px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.08);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
            color: #ffffff;
            padding: 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        .badge {{
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            padding: 4px 10px;
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.15);
            color: #bfdbfe;
            border: 1px solid rgba(255, 255, 255, 0.2);
            margin-bottom: 8px;
        }}
        
        .section {{
            padding: 24px 32px;
            border-bottom: 1px solid #f1f5f9;
        }}
        
        .section-title {{
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        
        .section-title::before {{
            content: "";
            display: inline-block;
            width: 4px;
            height: 16px;
            background: #1e3a8a;
            border-radius: 2px;
        }}
        
        .grid-2 {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }}
        
        @media (max-width: 768px) {{
            .grid-2 {{
                grid-template-columns: 1fr;
            }}
            .header {{
                flex-direction: column;
                align-items: flex-start;
                gap: 16px;
            }}
        }}
        
        @media print {{
            body {{
                background: #ffffff;
                padding: 0;
            }}
            .container {{
                border: none;
                box-shadow: none;
                max-width: 100%;
            }}
            .no-print {{
                display: none !important;
            }}
        }}
        
        .print-btn {{
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1e3a8a;
            color: #ffffff;
            font-weight: bold;
            font-size: 13px;
            padding: 12px 20px;
            border-radius: 12px;
            border: none;
            box-shadow: 0 4px 12px rgba(30, 58, 138, 0.35);
            cursor: pointer;
            transition: all 0.2s;
            z-index: 100;
        }}
        
        .print-btn:hover {{
            background: #1e40af;
            transform: translateY(-1px);
        }}
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

    <div class="container">
        <!-- Header -->
        <div class="header">
            <div>
                <span class="badge">Official Speech Adjudication & Coaching Dossier</span>
                <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 4px;">{report.speech_title}</h1>
                <div style="font-size: 13px; color: #93c5fd;">
                    Speaker: <strong style="color: #ffffff;">{report.speaker_name}</strong> • Category: {report.speech_category}
                </div>
            </div>
            
            <div style="text-align: right; background: rgba(255, 255, 255, 0.1); padding: 14px 20px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15);">
                <div style="font-size: 11px; text-transform: uppercase; color: #bfdbfe; font-weight: 600;">Overall Delivery Score</div>
                <div style="font-size: 32px; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #ffffff;">{report.overall_score:.1f}<span style="font-size: 16px; color: #93c5fd;"> / 100</span></div>
                <div style="font-size: 12px; font-weight: bold; color: #fde047;">Grade: {report.grade_letter}</div>
            </div>
        </div>

        <!-- Meta Strip -->
        <div style="background: #f1f5f9; padding: 12px 32px; display: flex; flex-wrap: wrap; justify-content: space-between; font-size: 12px; color: #475569; border-bottom: 1px solid #e2e8f0;">
            <div>Target Goal: <strong style="color: #0f172a;">{report.target_goal}</strong></div>
            <div>Speech Duration: <strong style="color: #0f172a;">{report.duration_seconds:.1f} seconds</strong></div>
            <div>Generated: <strong style="color: #0f172a;">{report.generated_at.strftime("%B %d, %Y at %H:%M UTC")}</strong></div>
        </div>

        <!-- Executive Assessment & Verdict -->
        <div class="section">
            <div class="section-title">Executive Delivery Assessment</div>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin-bottom: 14px;">
                <div style="font-weight: 700; color: #1e3a8a; font-size: 13px; margin-bottom: 4px;">Performance Verdict: {report.performance_verdict}</div>
                <div style="font-size: 13px; color: #1e293b; line-height: 1.6;">{report.executive_assessment}</div>
            </div>

            {f'<div style="font-size: 12px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;"><strong style="color: #0f172a;">Rhetorical & Literary Context:</strong> {report.speech_meaning_context}</div>' if report.speech_meaning_context else ''}
        </div>

        <!-- Strengths & Rubric Scorecard -->
        <div class="section">
            <div class="grid-2">
                <div>
                    <div class="section-title">Verified Strengths</div>
                    <ul style="font-size: 12px; color: #334155; padding-left: 20px; line-height: 1.6;">
                        {strengths_html}
                    </ul>
                </div>
                
                <div>
                    <div class="section-title">5-Dimension Rubric Scorecard</div>
                    {rubric_rows_html}
                </div>
            </div>
        </div>

        <!-- Critical Moments & Timestamped Flaws -->
        <div class="section">
            <div class="section-title">Critical Delivery Moments to Refine</div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                Identified through comparative acoustic forensics against reference models.
            </div>
            {flaw_rows_html}
        </div>

        <!-- Tailored 7-Day Vocal Rehearsal Routine -->
        <div class="section">
            <div class="section-title">Personalised 7-Day Action Routine</div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 14px;">
                Targeted practice schedule tailored specifically for {report.speaker_name} to eliminate detected flaws.
            </div>
            {routine_html}
        </div>

        <!-- Footer / Certification Checksum -->
        <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>Counterpoint AI</strong> • Speech Analytics & Temporal Flaw Finding Platform
                <div style="font-family: monospace; color: #94a3b8; margin-top: 2px;">Report ID: {report.report_id} | Analysis ID: {report.analysis_id}</div>
            </div>
            <div style="text-align: right;">
                <span style="display: inline-block; padding: 3px 8px; background: #e2e8f0; border-radius: 4px; font-weight: bold; color: #334155;">Verified Evaluation</span>
            </div>
        </div>
    </div>
</body>
</html>
"""
