import React from 'react';

interface PitchContourChartProps {
  participantTimes: number[];
  participantContour: (number | null)[];
  referenceTimes?: number[];
  referenceContour?: (number | null)[];
}

export const PitchContourChart: React.FC<PitchContourChartProps> = ({
  participantTimes = [],
  participantContour = [],
  referenceTimes = [],
  referenceContour = [],
}) => {
  if (participantContour.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-slate-500 text-xs italic">
        Pitch contour data unavailable.
      </div>
    );
  }

  // Find min and max F0 for scaling
  const voicedPart = participantContour.filter((v): v is number => v !== null && v > 50);
  const voicedRef = referenceContour.filter((v): v is number => v !== null && v > 50);
  const allVoiced = [...voicedPart, ...voicedRef];

  const minF0 = allVoiced.length > 0 ? Math.max(60, Math.min(...allVoiced) - 15) : 80;
  const maxF0 = allVoiced.length > 0 ? Math.min(450, Math.max(...allVoiced) + 20) : 300;
  const maxTime = participantTimes.length > 0 ? participantTimes[participantTimes.length - 1] : 10;

  // Build SVG path strings
  const buildSvgPath = (times: number[], contour: (number | null)[]) => {
    let path = '';
    let inSubpath = false;

    for (let i = 0; i < contour.length; i++) {
      const val = contour[i];
      const t = times[i];
      if (val !== null && t !== undefined) {
        const x = (t / maxTime) * 1000;
        const y = 180 - ((val - minF0) / (maxF0 - minF0)) * 160;

        if (!inSubpath) {
          path += `M ${x.toFixed(1)} ${y.toFixed(1)} `;
          inSubpath = true;
        } else {
          path += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
        }
      } else {
        inSubpath = false;
      }
    }
    return path;
  };

  const partPath = buildSvgPath(participantTimes, participantContour);
  const refPath = buildSvgPath(referenceTimes, referenceContour);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-indigo-400 rounded" />
            Participant F0 (Hz)
          </span>
          {referenceContour.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-400 rounded" />
              Reference F0 (Hz)
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Range: {minF0.toFixed(0)}Hz – {maxF0.toFixed(0)}Hz (YIN estimated)
        </span>
      </div>

      <div className="h-44 bg-slate-950/70 rounded-lg p-3 border border-slate-800 relative">
        <svg viewBox="0 0 1000 180" className="w-full h-full overflow-visible">
          {/* Horizontal gridlines */}
          <line x1="0" y1="30" x2="1000" y2="30" stroke="#1e293b" strokeDasharray="3,3" />
          <line x1="0" y1="90" x2="1000" y2="90" stroke="#1e293b" strokeDasharray="3,3" />
          <line x1="0" y1="150" x2="1000" y2="150" stroke="#1e293b" strokeDasharray="3,3" />

          {/* Reference path */}
          {refPath && (
            <path
              d={refPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeOpacity="0.55"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Participant path */}
          {partPath && (
            <path
              d={partPath}
              fill="none"
              stroke="#818cf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* Axis labels */}
        <div className="absolute left-3 top-3 text-[9px] font-mono text-slate-500">
          {maxF0.toFixed(0)} Hz
        </div>
        <div className="absolute left-3 bottom-3 text-[9px] font-mono text-slate-500">
          {minF0.toFixed(0)} Hz
        </div>
        <div className="absolute right-3 bottom-3 text-[9px] font-mono text-slate-500">
          {maxTime.toFixed(1)}s
        </div>
      </div>
    </div>
  );
};
