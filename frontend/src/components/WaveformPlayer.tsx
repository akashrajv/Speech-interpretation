import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, RotateCcw } from 'lucide-react';
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

    // Create WaveSurfer instance with white & dark blue styling
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: role === 'participant' ? '#93c5fd' : '#a7f3d0',
      progressColor: role === 'participant' ? '#1e3a8a' : '#047857',
      cursorColor: '#0f172a',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 68,
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
    const remainder = (secs % 60).toFixed(1);
    return `${mins}:${remainder.padStart(4, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
      {/* Player Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              role === 'participant' ? 'bg-blue-900' : 'bg-emerald-600'
            }`}
          />
          <span className="text-xs font-semibold text-slate-800">
            {role === 'participant' ? 'Your Speech Recording' : 'Ideal Reference Audio'}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={restart}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Restart from beginning"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!isReady}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white shadow-sm transition ${
              role === 'participant'
                ? 'bg-blue-900 hover:bg-blue-800'
                : 'bg-emerald-700 hover:bg-emerald-600'
            } disabled:opacity-50`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
            <span>{isPlaying ? 'Pause' : 'Play Audio'}</span>
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
                      ? 'bg-rose-500/80 hover:bg-rose-600'
                      : flaw.severity === 'medium'
                      ? 'bg-amber-500/80 hover:bg-amber-600'
                      : 'bg-blue-500/80 hover:bg-blue-600'
                  } ${isSelected ? 'ring-2 ring-blue-900 h-3 -top-0.5 z-10' : ''}`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  title={`${flaw.category}: "${flaw.text_segment}"`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
