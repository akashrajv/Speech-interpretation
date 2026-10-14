import React from 'react';
import { WordAlignmentItem, FlawItem } from '../types';

interface WordAlignmentViewerProps {
  alignments: WordAlignmentItem[];
  flaws?: FlawItem[];
  currentTime?: number;
  onSelectWord?: (startTime: number) => void;
}

export const WordAlignmentViewer: React.FC<WordAlignmentViewerProps> = ({
  alignments = [],
  flaws = [],
  currentTime = 0,
  onSelectWord,
}) => {
  if (alignments.length === 0) {
    return (
      <div className="text-slate-400 text-xs italic p-4 text-center">
        Transcript word alignment unavailable.
      </div>
    );
  }

  // Helper to determine if a word falls within any detected flaw range
  const getWordFlaw = (start: number, end: number): FlawItem | undefined => {
    return flaws.find((f) => {
      const overlap = Math.min(end, f.end_seconds) - Math.max(start, f.start_seconds);
      return overlap > 0.05;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span className="font-semibold text-blue-950">Word-Level Forced Alignment</span>
        <span className="text-[11px] text-slate-500">
          Click any word to seek audio to that exact timestamp
        </span>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-1.5 leading-relaxed max-h-56 overflow-y-auto">
        {alignments.map((w, idx) => {
          const isCurrent = currentTime >= w.start_seconds && currentTime <= w.end_seconds;
          const flaw = getWordFlaw(w.start_seconds, w.end_seconds);

          let badgeStyle = 'text-slate-700 hover:bg-slate-200 hover:text-blue-950';
          if (isCurrent) {
            badgeStyle = 'bg-blue-900 text-white font-bold ring-2 ring-blue-500 scale-105';
          } else if (flaw) {
            badgeStyle =
              flaw.severity === 'high'
                ? 'bg-rose-100 text-rose-800 border-b-2 border-rose-500 hover:bg-rose-200'
                : 'bg-amber-100 text-amber-800 border-b-2 border-amber-500 hover:bg-amber-200';
          }

          return (
            <span
              key={idx}
              onClick={() => onSelectWord && onSelectWord(w.start_seconds)}
              className={`px-1.5 py-0.5 rounded cursor-pointer text-xs font-medium transition-all group relative ${badgeStyle}`}
            >
              {w.word}

              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-slate-100 text-[10px] px-2 py-1 rounded shadow-xl border border-slate-700 whitespace-nowrap">
                <span className="font-mono text-blue-300 font-semibold">{w.start_seconds.toFixed(2)}s – {w.end_seconds.toFixed(2)}s</span>
                <span className="text-slate-300 ml-1.5">({(w.confidence * 100).toFixed(0)}% align)</span>
                {flaw && (
                  <div className="text-amber-400 font-semibold text-[9px] mt-0.5">
                    Flaw: {flaw.category.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            </span>
          );
        })}
      </div>
    </div>
  );
};
