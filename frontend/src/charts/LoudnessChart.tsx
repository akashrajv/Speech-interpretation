import React from 'react';

interface LoudnessChartProps {
  participantTimes: number[];
  participantRms: number[];
  referenceTimes?: number[];
  referenceRms?: number[];
}

export const LoudnessChart: React.FC<LoudnessChartProps> = ({
  participantTimes = [],
  participantRms = [],
  referenceTimes = [],
  referenceRms = [],
}) => {
  if (participantRms.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-slate-400 text-xs italic">
        Loudness RMS data unavailable.
      </div>
    );
  }

  const maxRms = Math.max(0.05, ...participantRms, ...referenceRms);
  const maxTime = participantTimes.length > 0 ? participantTimes[participantTimes.length - 1] : 10;

  const buildPath = (times: number[], vals: number[]) => {
    let p = '';
    for (let i = 0; i < vals.length; i++) {
      const t = times[i];
      const v = vals[i];
      if (t !== undefined && v !== undefined) {
        const x = (t / maxTime) * 1000;
        const y = 170 - (v / maxRms) * 150;
        p += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)} ` : `L ${x.toFixed(1)} ${y.toFixed(1)} `;
      }
    }
    return p;
  };

  const partPath = buildPath(participantTimes, participantRms);
  const refPath = buildPath(referenceTimes, referenceRms);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-0.5 bg-blue-900 rounded" />
            Your Loudness & Volume
          </span>
          {referenceRms.length > 0 && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-0.5 bg-emerald-600 rounded" />
              Reference Loudness
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Short-time window: 50ms (Normalized Amplitude)
        </span>
      </div>

      <div className="h-44 bg-slate-50 rounded-lg p-3 border border-slate-200 relative">
        <svg viewBox="0 0 1000 180" className="w-full h-full overflow-visible">
          <line x1="0" y1="40" x2="1000" y2="40" stroke="#cbd5e1" strokeDasharray="3,3" />
          <line x1="0" y1="100" x2="1000" y2="100" stroke="#cbd5e1" strokeDasharray="3,3" />
          <line x1="0" y1="160" x2="1000" y2="160" stroke="#94a3b8" />

          {refPath && (
            <path
              d={refPath}
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeOpacity="0.65"
            />
          )}

          {partPath && (
            <path
              d={partPath}
              fill="none"
              stroke="#1e3a8a"
              strokeWidth="2.5"
            />
          )}
        </svg>

        <div className="absolute left-3 top-3 text-[9px] font-mono text-slate-500">
          Peak: {maxRms.toFixed(2)}
        </div>
        <div className="absolute right-3 bottom-3 text-[9px] font-mono text-slate-500">
          {maxTime.toFixed(1)}s
        </div>
      </div>
    </div>
  );
};
