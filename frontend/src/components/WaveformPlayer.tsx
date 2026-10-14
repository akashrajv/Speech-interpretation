import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, RotateCcw, Volume2, Maximize2 } from 'lucide-react';
import { FlawItem } from '../types';

interface WaveformPlayerProps {
  audioUrl: string;
  role: 'participant' | 'reference';
  duration: number;
  flaws?: FlawItem[];
  selectedFlaw?: FlawItem | null;
  onTimeUpdate?: (time: number) => void;
  onFlawClick?: (flaw: FlawItem) => void;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  audioUrl,
  role,
  duration,
  flaws = [],
  selectedFlaw,
  onTimeUpdate,
  onFlawClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create WaveSurfer instance
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: role === 'participant' ? '#4f46e5' : '#10b981',
      progressColor: role === 'participant' ? '#818cf8' : '#34d399',
      cursorColor: '#f8fafc',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 72,
      normalize: true,
      url: audioUrl,
    });

    ws.on('ready', () => {
      setIsReady(true);
    });

    ws.on('audioprocess', (time: number) => {
      setCurrentTime(time);
      if (onTimeUpdate) onTimeUpdate(time);
    });

    ws.on('seeking', (time: number) => {
      setCurrentTime(time);
      if (onTimeUpdate) onTimeUpdate(time);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioUrl, role]);

  // Seek when selectedFlaw changes
  useEffect(() => {
    if (selectedFlaw && wavesurferRef.current && isReady && duration > 0) {
      const targetTime = selectedFlaw.start_seconds;
      wavesurferRef.current.setTime(targetTime);
      setCurrentTime(targetTime);
      wavesurferRef.current.play();
    }
  }, [selectedFlaw, isReady, duration]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const restart = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setTime(0);
      wavesurferRef.current.play();
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = (secs % 60).toFixed(2);
    return `${mins.toString().padStart(2, '0')}:${remainder.padStart(5, '0')}`;
  };

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
      {/* Player Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              role === 'participant' ? 'bg-indigo-500' : 'bg-emerald-500'
            }`}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {role === 'participant' ? 'Participant Audio' : 'Reference Model Audio'}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={restart}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Restart playback"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!isReady}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white shadow-sm transition ${
              role === 'participant'
                ? 'bg-indigo-600 hover:bg-indigo-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            } disabled:opacity-50`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
        </div>
      </div>

      {/* Waveform Canvas Container */}
      <div className="relative">
        <div ref={containerRef} className="cursor-pointer" />

        {/* Flaw Overlay Timeline Pins */}
        {role === 'participant' && duration > 0 && flaws.length > 0 && (
          <div className="absolute top-0 left-0 right-0 h-2 flex pointer-events-none">
            {flaws.map((flaw) => {
              const leftPct = (flaw.start_seconds / duration) * 100;
              const widthPct = Math.max(0.8, ((flaw.end_seconds - flaw.start_seconds) / duration) * 100);
              const isSelected = selectedFlaw?.flaw_id === flaw.flaw_id;

              return (
                <div
                  key={flaw.flaw_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onFlawClick) onFlawClick(flaw);
                  }}
                  className={`absolute top-0 h-full rounded pointer-events-auto cursor-pointer transition-all ${
                    flaw.severity === 'high'
                      ? 'bg-rose-500/70 hover:bg-rose-400'
                      : flaw.severity === 'medium'
                      ? 'bg-amber-500/70 hover:bg-amber-400'
                      : 'bg-indigo-400/60 hover:bg-indigo-300'
                  } ${isSelected ? 'ring-2 ring-white h-3 -top-0.5 z-10' : ''}`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  title={`${flaw.category}: ${flaw.text_segment} (${flaw.start_seconds.toFixed(1)}s - ${flaw.end_seconds.toFixed(1)}s)`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
