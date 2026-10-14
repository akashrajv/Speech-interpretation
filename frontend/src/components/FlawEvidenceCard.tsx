import React from 'react';
import { FlawItem, FlawInterpretation } from '../types';
import { AlertCircle, ArrowRight, Play, CheckCircle, Sparkles, BookOpen, Layers } from 'lucide-react';

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
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    }
  };

  return (
    <div className="bg-slate-900 border border-indigo-500/40 rounded-xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
      {/* Decorative gradient flare */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider font-mono ${getSeverityBadge(
                flaw.severity
              )}`}
            >
              {flaw.severity} Severity
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Timestamp: {flaw.start_seconds.toFixed(2)}s – {flaw.end_seconds.toFixed(2)}s ({(flaw.end_seconds - flaw.start_seconds).toFixed(2)}s)
            </span>
            <span className="text-xs text-slate-500">
              Confidence: {(flaw.confidence * 100).toFixed(0)}%
            </span>
          </div>

          <h3 className="text-lg font-bold text-white capitalize">
            {flaw.category.replace(/_/g, ' ')}
          </h3>
          <p className="text-xs text-indigo-300 font-medium italic mt-0.5">
            "{flaw.text_segment}"
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onPlayFlaw && (
            <button
              onClick={() => onPlayFlaw(flaw)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play Region</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Acoustic Evidence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Reference Metric</div>
          <div className="text-base font-bold text-emerald-400 font-mono">
            {flaw.reference_value !== null && flaw.reference_value !== undefined
              ? `${flaw.reference_value} ${flaw.unit}`
              : 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Participant Measured</div>
          <div className="text-base font-bold text-rose-400 font-mono">
            {flaw.participant_value !== null && flaw.participant_value !== undefined
              ? `${flaw.participant_value} ${flaw.unit}`
              : 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Temporal Deviation</div>
          <div className="text-base font-bold text-indigo-400 font-mono">
            {flaw.deviation_percent !== null && flaw.deviation_percent !== undefined
              ? `${flaw.deviation_percent > 0 ? '+' : ''}${flaw.deviation_percent}%`
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Mathematical Evidence & Explanation */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400" /> Mathematical Evidence & Detection Logic
        </div>
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
          {flaw.explanation}
        </p>
      </div>

      {/* AI Interpretation & Actionable Recommendation */}
      <div className="space-y-2 bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-lg">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{geminiInterpretation ? 'Gemini AI Delivery Coaching' : 'Actionable Coaching Recommendation'}</span>
        </div>

        {geminiInterpretation ? (
          <div className="space-y-2 text-xs text-slate-200">
            <p className="text-slate-300">{geminiInterpretation.impact}</p>
            {geminiInterpretation.recommendations?.map((rec, i) => (
              <div key={i} className="flex items-start gap-1.5 text-slate-300">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </div>
            ))}
            {geminiInterpretation.practice_exercise && (
              <div className="mt-2 pt-2 border-t border-indigo-500/20 text-xs">
                <span className="font-semibold text-indigo-300 flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-indigo-400" /> Suggested Drill:
                </span>
                <span className="text-slate-300 mt-0.5 block">{geminiInterpretation.practice_exercise}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-300 leading-relaxed">
            {flaw.recommendation}
          </p>
        )}
      </div>
    </div>
  );
};
