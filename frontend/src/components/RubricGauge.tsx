import React from 'react';
import { RubricScoreBreakdown } from '../types';
import { Award, Gauge, Zap, TrendingUp, Volume2, Mic } from 'lucide-react';

interface RubricGaugeProps {
  rubric: RubricScoreBreakdown;
}

export const RubricGauge: React.FC<RubricGaugeProps> = ({ rubric }) => {
  const { overall_score, dimensions = [], weights = {} } = rubric;

  const getScoreColor = (score: number) => {
    if (score >= 88) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 75) return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getStrokeColor = (score: number) => {
    if (score >= 88) return '#10b981';
    if (score >= 75) return '#6366f1';
    if (score >= 60) return '#f59e0b';
    return '#f43f5e';
  };

  const circumference = 2 * Math.PI * 46;
  const strokeDashoffset = circumference - (overall_score / 100) * circumference;

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-6 space-y-6">
      {/* Top Header & Gauge */}
      <div className="flex flex-col sm:flex-row items-center gap-6 justify-between border-b border-slate-800/80 pb-6">
        <div className="space-y-1 text-center sm:text-left">
          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center justify-center sm:justify-start gap-1.5">
            <Award className="w-4 h-4 text-indigo-400" /> Rubric Evaluation
          </div>
          <h3 className="text-xl font-bold text-white">Overall Delivery Score</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Weighted composite score based on 5 competitive speech delivery dimensions.
          </p>
        </div>

        {/* Circular Gauge */}
        <div className="relative flex items-center justify-center w-28 h-28">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="46"
              className="text-slate-800"
              strokeWidth="9"
              stroke="currentColor"
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
            <span className="text-2xl font-extrabold text-white font-mono">
              {overall_score.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">/ 100</span>
          </div>
        </div>
      </div>

      {/* Dimensions Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {dimensions.map((dim) => {
          return (
            <div
              key={dim.dimension}
              className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-200 truncate">{dim.dimension}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{(dim.weight * 100).toFixed(0)}%</span>
                </div>
                <div className="text-xl font-bold text-white font-mono flex items-baseline gap-1">
                  {dim.score.toFixed(1)}
                  <span className="text-[10px] text-slate-500 font-normal">/100</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${dim.score}%`,
                    backgroundColor: getStrokeColor(dim.score),
                  }}
                />
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2" title={dim.justification}>
                {dim.justification}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
