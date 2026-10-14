import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Printer,
  Copy,
  Check,
  X,
  Award,
  Calendar,
  User,
  Target,
  Clock,
  BookOpen,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { generatePersonalizedReport, getPersonalizedReportExportUrl } from '../services/api';
import { AnalysisDetail, PersonalizedReportResponse } from '../types';

interface PersonalizedReportModalProps {
  analysis: AnalysisDetail;
  isOpen: boolean;
  onClose: () => void;
}

const GOAL_PRESETS = [
  'Speech Competition Adjudication',
  'Keynote & TEDx Presentation',
  'Executive Pitch & Leadership Briefing',
  'Academic / University Oral Defense',
  'Debate & Extemporaneous Speaking',
  'General Vocal & Fluency Polish',
];

export const PersonalizedReportModal: React.FC<PersonalizedReportModalProps> = ({
  analysis,
  isOpen,
  onClose,
}) => {
  const [speakerName, setSpeakerName] = useState(analysis.speaker_id || 'Speaker');
  const [targetGoal, setTargetGoal] = useState(GOAL_PRESETS[0]);
  const [coachingTone, setCoachingTone] = useState<'balanced' | 'competition' | 'executive'>('balanced');
  const [customNotes, setCustomNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PersonalizedReportResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const res = await generatePersonalizedReport(analysis.id, {
        speaker_name: speakerName,
        target_goal: targetGoal,
        coaching_tone: coachingTone,
        custom_notes: customNotes,
      });
      setReport(res);
    } catch (err) {
      console.error(err);
      alert('Failed to generate personalized report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleGenerate();
    }
  }, [isOpen, analysis.id]);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    if (!report) return;
    const summaryText = `--- COUNTERPOINT AI: SPEECH REPORT ---
Speaker: ${report.speaker_name}
Speech Title: ${report.speech_title} (${report.speech_category})
Score: ${report.overall_score.toFixed(1)}/100 (Grade: ${report.grade_letter})
Verdict: ${report.performance_verdict}

Executive Assessment:
${report.executive_assessment}

Key Strengths:
${report.strengths.map((s) => `• ${s}`).join('\n')}

Top Action Drills:
${report.action_routine.map((a) => `[${a.day_label}] ${a.focus_area}: ${a.drill_title}\n  ${a.instructions}\n  ${a.target_metric}`).join('\n\n')}

Certified by Counterpoint AI Forensic Forensics.`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const exportHtmlUrl = getPersonalizedReportExportUrl(analysis.id, {
    speakerName,
    targetGoal,
    coachingTone,
    format: 'html',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full my-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-900 text-white shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
                Personalised Speech Coaching Dossier
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 uppercase">
                  AI Forensic Certified
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Tailored delivery score, critical timestamps, and 7-day personalized vocal drill routine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Customization Controls Strip */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-blue-900" /> Personalize Report Settings
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Speaker Full Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={speakerName}
                    onChange={(e) => setSpeakerName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-900 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Target Occasion / Goal
                </label>
                <select
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-900 shadow-xs"
                >
                  {GOAL_PRESETS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Coaching Tone
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={coachingTone}
                    onChange={(e) => setCoachingTone(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-900 shadow-xs"
                  >
                    <option value="balanced">Balanced & Constructive</option>
                    <option value="competition">Competition Adjudicator</option>
                    <option value="executive">Concise Executive</option>
                  </select>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shrink-0 transition disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dossier Body Preview */}
          {loading && !report ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
              <div className="text-xs text-slate-500 font-medium">
                Compiling personalized speech forensics & customized action plan...
              </div>
            </div>
          ) : report ? (
            <div className="space-y-6 printable-report">
              {/* Report Header Card */}
              <div className="bg-gradient-to-r from-blue-950 to-blue-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/10 text-blue-200 border border-white/20">
                    Official Speech Report
                  </span>
                  <h3 className="text-2xl font-extrabold text-white">{report.speech_title}</h3>
                  <div className="text-xs text-blue-200 flex flex-wrap items-center gap-3">
                    <span>
                      Speaker: <strong className="text-white">{report.speaker_name}</strong>
                    </span>
                    <span>•</span>
                    <span>Category: {report.speech_category}</span>
                    <span>•</span>
                    <span>Duration: {report.duration_seconds.toFixed(1)}s</span>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center shrink-0 min-w-[140px]">
                  <div className="text-[10px] text-blue-200 uppercase font-semibold">Delivery Score</div>
                  <div className="text-3xl font-extrabold font-mono text-white">
                    {report.overall_score.toFixed(1)}
                    <span className="text-xs text-blue-200"> /100</span>
                  </div>
                  <div className="text-xs font-bold text-amber-300 mt-0.5">Grade: {report.grade_letter}</div>
                </div>
              </div>

              {/* Executive Assessment */}
              <div className="bg-blue-50/70 border border-blue-200 p-5 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-950 uppercase tracking-wider">
                  <Award className="w-4 h-4 text-blue-900" />
                  <span>Performance Verdict: {report.performance_verdict}</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {report.executive_assessment}
                </p>
                {report.speech_meaning_context && (
                  <p className="text-xs text-slate-600 pt-1 border-t border-blue-200/80">
                    <strong className="text-blue-950">Rhetorical Context: </strong>
                    {report.speech_meaning_context}
                  </p>
                )}
              </div>

              {/* 5-Dimension Scorecard & Strengths */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Scorecard */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-900" /> 5-Dimension Scorecard
                  </div>
                  <div className="space-y-2 pt-1">
                    {report.rubric_breakdown?.dimensions.map((dim) => (
                      <div key={dim.dimension} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 capitalize">
                            {dim.dimension.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono font-bold text-blue-950">
                            {dim.score.toFixed(1)} / 100
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-900 rounded-full"
                            style={{ width: `${dim.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Verified Delivery Strengths
                  </div>
                  <ul className="space-y-2 pt-1 text-xs text-slate-700">
                    {report.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold shrink-0">✓</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Priority Flaws / Moments to Fix */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
                <div className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center justify-between">
                  <span>Critical Delivery Moments to Refine</span>
                  <span className="text-slate-400 font-normal font-mono text-[11px]">
                    Top {report.priority_flaws.length} detected flaws
                  </span>
                </div>

                <div className="space-y-2.5">
                  {report.priority_flaws.map((flaw) => (
                    <div
                      key={flaw.flaw_id}
                      className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-950 capitalize">
                          {flaw.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {flaw.start_seconds.toFixed(1)}s – {flaw.end_seconds.toFixed(1)}s
                        </span>
                      </div>
                      <div className="text-xs font-mono italic text-blue-900">
                        "{flaw.text_segment}"
                      </div>
                      <p className="text-xs text-slate-700">{flaw.explanation}</p>
                      <div className="mt-1 pt-1.5 border-t border-slate-200 text-xs text-slate-800">
                        <strong className="text-blue-900">Coach Drill: </strong>
                        {flaw.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tailored 7-Day Routine */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
                <div className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center justify-between">
                  <span>Personalised 7-Day Vocal Rehearsal Routine</span>
                  <span className="text-blue-900 font-semibold text-[11px]">
                    Tailored for {report.speaker_name}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {report.action_routine.map((plan) => (
                    <div
                      key={plan.day_label}
                      className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 uppercase">
                          {plan.day_label}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{plan.focus_area}</span>
                      </div>
                      <div className="text-xs font-bold text-blue-900">{plan.drill_title}</div>
                      <p className="text-xs text-slate-600 leading-relaxed">{plan.instructions}</p>
                      <div className="text-[11px] font-mono font-semibold text-emerald-700 pt-1">
                        {plan.target_metric}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certification Stamp */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-700">Counterpoint AI Certified Adjudication</div>
                  <div className="font-mono text-[10px]">
                    Report ID: {report.report_id} • Target: {report.target_goal}
                  </div>
                </div>
                <div className="text-right font-mono text-[10px]">
                  {new Date(report.generated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Summary!' : 'Copy Summary'}</span>
            </button>

            <a
              href={exportHtmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Standalone HTML Dossier</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
