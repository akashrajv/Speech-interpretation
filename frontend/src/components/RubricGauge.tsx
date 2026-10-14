import React from 'react';
import { RubricScoreBreakdown } from '../types';
import { Award, Clock, Music, Volume2, Mic, Sparkles } from 'lucide-react';

interface RubricGaugeProps {
  rubric: RubricScoreBreakdown;
}

export const RubricGauge: React.FC<RubricGaugeProps> = ({ rubric }) => {
  const { overall_score, dimensions = [] } = rubric;

  const getScoreVerdict = (score: number) => {
    if (score >= 85) return { text: 'Excellent Delivery', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 75) return { text: 'Good Delivery • Minor Polish Needed', color: 'text-blue-900 bg-blue-50 border-blue-200' };
    if (score >= 60) return { text: 'Fair • Needs Practice on Pacing & Tone', color: 'text-amber-800 bg-amber-50 border-amber-200' };
    return { text: 'Needs Improvement • Follow Drills Below', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const getStrokeColor = (score: number) => {
    if (score >= 85) return '#059669';
    if (score >= 75) return '#1e40af'; // Dark Blue
    if (score >= 60) return '#d97706';
    return '#e11d48';
  };

  const getFriendlyDimensionMeta = (dimName: string) => {
    const lower = dimName.toLowerCase();
    if (lower.includes('pacing')) {
      return {
        title: 'Pacing & Speed',
        desc: 'Speaking tempo and natural pauses',
        icon: Clock,
      };
    }
    if (lower.includes('pitch')) {
      return {
        title: 'Tone Variation',
        desc: 'Lively melody vs. flat monotone',
        icon: Music,
      };
    }
    if (lower.includes('volume')) {
      return {
        title: 'Volume & Power',
        desc: 'Clear loudness without trailing off',
        icon: Volume2,
      };
    }
    if (lower.includes('pronunciation')) {
      return {
        title: 'Word Clarity',
        desc: 'Crisp articulation of words',
        icon: Mic,
      };
    }
    return {
      title: 'Emotion & Emphasis',
      desc: 'Highlighting important message points',
      icon: Sparkles,
    };
  };

  const verdict = getScoreVerdict(overall_score);
  const circumference = 2 * Math.PI * 46;
  const strokeDashoffset = circumference - (overall_score / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-xs">
      {/* Top Header & Gauge */}
      <div className="flex flex-col sm:flex-row items-center gap-6 justify-between border-b border-slate-200 pb-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center justify-center sm:justify-start gap-1.5">
            <Award className="w-4 h-4 text-blue-900" /> Overall Speech Score
          </div>
          <h3 className="text-xl font-bold text-blue-950">Speech Delivery Performance</h3>
          <p className="text-xs text-slate-600 max-w-sm">
            Composite score across speed, vocal pitch, loudness, clear words, and expressive emphasis.
          </p>
          <div className="pt-1">
            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${verdict.color}`}>
              {verdict.text}
            </span>
          </div>
        </div>

        {/* Circular Gauge */}
        <div className="relative flex items-center justify-center w-28 h-28 shrink-0">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="46"
              strokeWidth="9"
              stroke="#e2e8f0"
              fill="transparent"
            />
            <circle
              cx="56"
              cy="56"
              r="46"
              stroke={getStrokeColor(overall_score)}
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-blue-950 font-mono">
              {overall_score.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">/ 100</span>
          </div>
        </div>
      </div>

      {/* 5 Dimensions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {dimensions.map((dim) => {
          const meta = getFriendlyDimensionMeta(dim.dimension);
          const Icon = meta.icon;
          return (
            <div
              key={dim.dimension}
              className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 flex flex-col justify-between hover:border-blue-400 hover:bg-blue-50/20 transition"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Icon className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                    <span className="truncate">{meta.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{(dim.weight * 100).toFixed(0)}%</span>
                </div>
                <div className="text-xl font-bold text-blue-950 font-mono flex items-baseline gap-1">
                  {dim.score.toFixed(1)}
                  <span className="text-[10px] text-slate-500 font-normal">/100</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${dim.score}%`,
                    backgroundColor: getStrokeColor(dim.score),
                  }}
                />
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] text-slate-500 font-medium">{meta.desc}</div>
                <p className="text-[11px] text-slate-700 line-clamp-2" title={dim.justification}>
                  {dim.justification}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
