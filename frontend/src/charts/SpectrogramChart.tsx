import React from 'react';

interface SpectrogramChartProps {
  spectrogram?: {
    z: number[][]; // [freq_bins, time_bins] in dB
    x: number[];   // times
    y: number[];   // freqs
  };
}

export const SpectrogramChart: React.FC<SpectrogramChartProps> = ({ spectrogram }) => {
  if (!spectrogram || !spectrogram.z || spectrogram.z.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-slate-500 text-xs italic">
        Spectrogram data unavailable.
      </div>
    );
  }

  const { z, x, y } = spectrogram;
  const numFreqs = z.length;
  const numTimes = z[0]?.length || 0;

  // Find min and max dB for color normalization
  let minDb = 0;
  let maxDb = -100;
  for (let r = 0; r < numFreqs; r++) {
    for (let c = 0; c < numTimes; c++) {
      const val = z[r][c];
      if (val < minDb) minDb = val;
      if (val > maxDb) maxDb = val;
    }
  }

  // Convert dB to viridis / magma color gradient
  const getColor = (db: number) => {
    const norm = Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb || 1)));
    // Heatmap gradient: dark blue -> purple -> orange -> yellow
    if (norm < 0.25) {
      const t = norm / 0.25;
      return `rgb(${Math.round(15 + t * 40)}, ${Math.round(20 + t * 30)}, ${Math.round(60 + t * 80)})`;
    } else if (norm < 0.6) {
      const t = (norm - 0.25) / 0.35;
      return `rgb(${Math.round(55 + t * 140)}, ${Math.round(50 + t * 30)}, ${Math.round(140 - t * 40)})`;
    } else if (norm < 0.85) {
      const t = (norm - 0.6) / 0.25;
      return `rgb(${Math.round(195 + t * 50)}, ${Math.round(80 + t * 100)}, ${Math.round(100 - t * 70)})`;
    } else {
      const t = (norm - 0.85) / 0.15;
      return `rgb(${Math.round(245 + t * 10)}, ${Math.round(180 + t * 70)}, ${Math.round(30 + t * 150)})`;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-medium text-slate-300">STFT Magnitude Spectrogram</span>
        <span className="text-[11px] text-slate-500 font-mono">
          0 Hz – {y[y.length - 1] ? `${Math.round(y[y.length - 1])} Hz` : '8000 Hz'} (Time vs Frequency Energy)
        </span>
      </div>

      <div className="h-44 bg-slate-950/80 rounded-lg p-2 border border-slate-800 relative flex flex-col justify-between">
        {/* Spectrogram Grid */}
        <div className="w-full h-full flex flex-col-reverse rounded overflow-hidden">
          {z.map((row, rIdx) => (
            <div key={rIdx} className="flex-1 w-full flex">
              {row.map((val, cIdx) => (
                <div
                  key={cIdx}
                  className="flex-1 h-full"
                  style={{ backgroundColor: getColor(val) }}
                  title={`Freq: ${Math.round(y[rIdx] || 0)}Hz, Time: ${(x[cIdx] || 0).toFixed(2)}s, Power: ${val.toFixed(1)} dB`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Axis Labels */}
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mt-1">
          <span>0.0s</span>
          <span>Time &rarr;</span>
          <span>{x[x.length - 1] ? `${x[x.length - 1].toFixed(1)}s` : ''}</span>
        </div>
      </div>
    </div>
  );
};
