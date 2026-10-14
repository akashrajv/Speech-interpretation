import React from 'react';

interface PauseTimelineChartProps {
  pauses: { start_seconds: number; end_seconds: number; duration_seconds: number; is_long_pause: boolean }[];
  totalDuration: number;
  onSelectTime?: (time: number) => void;
}

export const PauseTimelineChart: React.FC<PauseTimelineChartProps> = ({
  pauses = [],
  totalDuration,
  onSelectTime,
}) => {
  if (totalDuration <= 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-blue-900" />
            Natural Rhetorical Pause (&lt; 1.2s)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
            Prolonged / Awkward Silence (&ge; 1.2s)
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Total Pauses: {pauses.length}
        </span>
      </div>

      <div className="h-16 bg-slate-50 rounded-lg p-2 border border-slate-200 relative flex items-center">
        {/* Continuous baseline timeline */}
        <div className="w-full h-2 bg-slate-200 rounded relative overflow-hidden">
          {pauses.map((p, idx) => {
            const leftPct = (p.start_seconds / totalDuration) * 100;
            const widthPct = Math.max(1.0, (p.duration_seconds / totalDuration) * 100);

            return (
              <div
                key={idx}
                onClick={() => onSelectTime && onSelectTime(p.start_seconds)}
                className={`absolute top-0 bottom-0 cursor-pointer transition-all hover:scale-y-125 ${
                  p.is_long_pause
                    ? 'bg-rose-500 hover:bg-rose-600'
                    : 'bg-blue-900 hover:bg-blue-800'
                }`}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                title={`Pause at ${p.start_seconds.toFixed(2)}s: ${p.duration_seconds.toFixed(2)}s duration`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
