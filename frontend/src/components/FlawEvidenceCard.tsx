import React from 'react';
import { FlawItem, FlawInterpretation } from '../types';
import { Play, CheckCircle, Sparkles, BookOpen, HelpCircle } from 'lucide-react';

interface FlawEvidenceCardProps {
  flaw: FlawItem;
  geminiInterpretation?: FlawInterpretation | null;
  onPlayFlaw?: (flaw: FlawItem) => void;
  onClose?: () => void;
}

export const FlawEvidenceCard: React.FC<FlawEvidenceCardProps> = ({
  flaw,
  geminiInterpretation,
  onPlayFlaw,
  onClose,
}) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-900 border-blue-200';
    }
  };

  const getFriendlyTitle = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes('rate') || lower.includes('fast')) return 'Speaking Too Fast';
    if (lower.includes('pause') || lower.includes('silence')) return 'Unnatural Long Pause';
    if (lower.includes('intonation') || lower.includes('pitch')) return 'Monotone / Flat Tone';
    if (lower.includes('loudness') || lower.includes('volume')) return 'Volume Fading or Inconsistent';
    if (lower.includes('pronunciation') || lower.includes('slur')) return 'Word Articulation Issue';
    return cat.replace(/_/g, ' ');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 relative overflow-hidden">
      {/* Subtle Blue Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/80 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider font-mono ${getSeverityBadge(
                flaw.severity
              )}`}
            >
              {flaw.severity} Priority
            </span>
            <span className="text-xs text-slate-500 font-mono">
              At: {flaw.start_seconds.toFixed(2)}s – {flaw.end_seconds.toFixed(2)}s (Duration: {(flaw.end_seconds - flaw.start_seconds).toFixed(2)}s)
            </span>
          </div>

          <h3 className="text-lg font-bold text-blue-950 capitalize">
            {getFriendlyTitle(flaw.category)}
          </h3>
          <p className="text-xs text-blue-900 font-medium italic mt-0.5">
            "{flaw.text_segment}"
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onPlayFlaw && (
            <button
              onClick={() => onPlayFlaw(flaw)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Listen to Segment</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800 text-sm px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Comparison Grid in White & Dark Blue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 relative z-10">
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Target Ideal (Model)</div>
          <div className="text-base font-bold text-emerald-700 font-mono">
            {flaw.reference_value !== null && flaw.reference_value !== undefined
              ? `${flaw.reference_value} ${flaw.unit.replace(/_/g, ' ')}`
              : 'Target Baseline'}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Your Delivery</div>
          <div className="text-base font-bold text-rose-700 font-mono">
            {flaw.participant_value !== null && flaw.participant_value !== undefined
              ? `${flaw.participant_value} ${flaw.unit.replace(/_/g, ' ')}`
              : 'Measured Deviation'}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Difference</div>
          <div className="text-base font-bold text-blue-900 font-mono">
            {flaw.deviation_percent !== null && flaw.deviation_percent !== undefined
              ? `${flaw.deviation_percent > 0 ? '+' : ''}${flaw.deviation_percent}%`
              : 'Deviation'}
          </div>
        </div>
      </div>

      {/* Why This Happened (Simple explanation) */}
      <div className="space-y-1.5 relative z-10">
        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-blue-900" /> What Was Detected
        </div>
        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
          {flaw.explanation}
        </p>
      </div>

      {/* AI Coaching & Meaning Impact */}
      <div className="space-y-2 bg-blue-50/70 border border-blue-200 p-4 rounded-lg relative z-10">
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>How to Fix This & Improve Meaning</span>
        </div>

        {geminiInterpretation ? (
          <div className="space-y-2.5 text-xs text-slate-800">
            {geminiInterpretation.contextual_significance && (
              <div className="p-3 rounded bg-white border border-blue-200 text-slate-800 text-xs leading-relaxed space-y-1 shadow-xs">
                <div className="font-semibold text-amber-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Speech Context & Impact on Listeners
                </div>
                <p className="text-slate-700">{geminiInterpretation.contextual_significance}</p>
              </div>
            )}

            <p className="text-slate-700">{geminiInterpretation.impact}</p>

            {geminiInterpretation.recommendations?.map((rec, i) => (
              <div key={i} className="flex items-start gap-1.5 text-slate-700">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </div>
            ))}

            {geminiInterpretation.practice_exercise && (
              <div className="mt-2 pt-2 border-t border-blue-200 text-xs">
                <span className="font-bold text-blue-950 flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-blue-900" /> Quick Practice Drill:
                </span>
                <span className="text-slate-700 mt-0.5 block">{geminiInterpretation.practice_exercise}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-700 leading-relaxed">
            {flaw.recommendation}
          </p>
        )}
      </div>
    </div>
  );
};
