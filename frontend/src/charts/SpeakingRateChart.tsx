import React from 'react';

interface SpeakingRateChartProps {
  participantSeries: { start_seconds: number; end_seconds: number; text_segment: string; wpm: number }[];
  referenceSeries?: { start_seconds: number; end_seconds: number; text_segment: string; wpm: number }[];
  selectedTime?: number;
  onSelectSegment?: (start: number) => void;
}

export const SpeakingRateChart: React.FC<SpeakingRateChartProps> = ({
  participantSeries = [],
  referenceSeries = [],
  selectedTime,
  onSelectSegment,
}) => {
  if (participantSeries.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-xs italic">
        Speaking rate time-series data unavailable.
      </div>
    );
  }

  const maxWpm = Math.max(
    220,
    ...participantSeries.map((s) => s.wpm),
    ...referenceSeries.map((s) => s.wpm)
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-900" />
            Your Tempo (WPM)
          </span>
          {referenceSeries.length > 0 && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
              Reference Ideal (WPM)
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-500">Benchmark: 130–155 WPM target</span>
      </div>

      <div className="h-44 bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-end gap-1.5 overflow-x-auto">
        {participantSeries.map((seg, idx) => {
          const refSeg = referenceSeries[idx];
          const partHeight = (seg.wpm / maxWpm) * 100;
          const refHeight = refSeg ? (refSeg.wpm / maxWpm) * 100 : null;

          const isFast = seg.wpm > 175;
          const isSlow = seg.wpm < 110;

          return (
            <div
              key={idx}
              onClick={() => onSelectSegment && onSelectSegment(seg.start_seconds)}
              className="flex-1 min-w-[32px] h-full flex flex-col justify-end items-center cursor-pointer group relative"
            >
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute bottom-full mb-2 z-20 bg-slate-900 text-slate-100 text-[10px] p-2 rounded shadow-xl border border-slate-700 whitespace-nowrap">
                <div className="font-semibold text-white truncate max-w-[180px]">"{seg.text_segment}"</div>
                <div>Your Speed: <span className="font-mono text-blue-300 font-bold">{seg.wpm} WPM</span></div>
                {refSeg && <div>Reference: <span className="font-mono text-emerald-400 font-bold">{refSeg.wpm} WPM</span></div>}
                <div className="text-slate-400 font-mono text-[9px] mt-0.5">{seg.start_seconds.toFixed(1)}s – {seg.end_seconds.toFixed(1)}s</div>
              </div>

              {/* Bar comparison */}
              <div className="w-full flex items-end justify-center gap-0.5 h-full">
                {/* Participant Bar */}
                <div
                  className={`w-3.5 rounded-t transition-all ${
                    isFast
                      ? 'bg-rose-500 group-hover:bg-rose-600'
                      : isSlow
                      ? 'bg-amber-500 group-hover:bg-amber-600'
                      : 'bg-blue-900 group-hover:bg-blue-800'
                  }`}
                  style={{ height: `${Math.max(6, partHeight)}%` }}
                />
                {/* Reference Bar */}
                {refHeight !== null && (
                  <div
                    className="w-2 rounded-t bg-emerald-600/50 group-hover:bg-emerald-600/80 transition-all"
                    style={{ height: `${Math.max(6, refHeight)}%` }}
                  />
                )}
              </div>

              <div className="text-[9px] text-slate-500 font-mono mt-1 group-hover:text-slate-900 font-medium">
                {seg.start_seconds.toFixed(0)}s
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
