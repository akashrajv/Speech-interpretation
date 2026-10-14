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
      <div className="h-48 flex items-center justify-center text-slate-500 text-xs italic">
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
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
            Participant Tempo (WPM)
          </span>
          {referenceSeries.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              Reference Ideal (WPM)
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-500">Benchmark: 130–155 WPM target</span>
      </div>

      <div className="h-44 bg-slate-950/70 rounded-lg p-3 border border-slate-800 flex items-end gap-1.5 overflow-x-auto">
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
              <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute bottom-full mb-2 z-20 bg-slate-900 text-slate-200 text-[10px] p-2 rounded shadow-xl border border-slate-700 whitespace-nowrap">
                <div className="font-semibold text-white truncate max-w-[180px]">"{seg.text_segment}"</div>
                <div>Participant: <span className="font-mono text-indigo-400 font-bold">{seg.wpm} WPM</span></div>
                {refSeg && <div>Reference: <span className="font-mono text-emerald-400 font-bold">{refSeg.wpm} WPM</span></div>}
                <div className="text-slate-400 font-mono text-[9px] mt-0.5">{seg.start_seconds.toFixed(1)}s – {seg.end_seconds.toFixed(1)}s</div>
              </div>

              {/* Bar comparison */}
              <div className="w-full flex items-end justify-center gap-0.5 h-full">
                {/* Participant Bar */}
                <div
                  className={`w-3.5 rounded-t transition-all ${
                    isFast
                      ? 'bg-rose-500/80 group-hover:bg-rose-400'
                      : isSlow
                      ? 'bg-amber-500/80 group-hover:bg-amber-400'
                      : 'bg-indigo-500/80 group-hover:bg-indigo-400'
                  }`}
                  style={{ height: `${Math.max(6, partHeight)}%` }}
                />
                {/* Reference Bar */}
                {refHeight !== null && (
                  <div
                    className="w-2 rounded-t bg-emerald-500/40 group-hover:bg-emerald-400/70 transition-all"
                    style={{ height: `${Math.max(6, refHeight)}%` }}
                  />
                )}
              </div>

              <div className="text-[9px] text-slate-500 font-mono mt-1 group-hover:text-slate-300">
                {seg.start_seconds.toFixed(0)}s
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
