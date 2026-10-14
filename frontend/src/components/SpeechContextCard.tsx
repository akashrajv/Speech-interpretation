import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Target,
  Mic,
  Award,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';
import { GeminiInterpretationResponse } from '../types';

interface SpeechContextCardProps {
  interpretation?: GeminiInterpretationResponse | null;
  speechCategory?: string;
  transcriptText?: string;
}

export const SpeechContextCard: React.FC<SpeechContextCardProps> = ({
  interpretation,
  speechCategory = 'Speech',
  transcriptText,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!interpretation) return null;

  const ctx = interpretation.speech_context;
  const isFallback = interpretation.is_deterministic_fallback;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden">
      {/* Background Subtle Accent */}
      <div className="absolute top-0 right-0 w-80 h-36 bg-blue-50/80 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-blue-950 tracking-wide">
                Speech Meaning & Delivery Context
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                  isFallback
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-blue-50 text-blue-900 border-blue-200'
                }`}
              >
                {isFallback ? 'Acoustic Coach' : 'Gemini AI Coach'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              How the meaning of your speech guides how you should speak it
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 transition"
        >
          <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Content Section */}
      {isExpanded && (
        <div className="mt-4 space-y-4 relative z-10">
          {/* Executive Summary */}
          {interpretation.summary && (
            <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-slate-800 leading-relaxed">
              <span className="font-bold text-blue-950">Overall Feedback: </span>
              {interpretation.summary}
            </div>
          )}

          {/* 3 Core Meaning & Context Cards */}
          {ctx && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: What this speech is about */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 hover:border-blue-300 transition">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                  <BookOpen className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                  <span>What This Speech is About</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {ctx.theme_and_intent || `Contextual background for ${speechCategory}.`}
                </p>
              </div>

              {/* Card 2: Why it matters */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 hover:border-blue-300 transition">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-950">
                  <Target className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                  <span>Why It Matters & Key Stakes</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {ctx.dramatic_or_rhetorical_stakes || 'The key message and emotional stakes required in your delivery.'}
                </p>
              </div>

              {/* Card 3: How to speak it */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 hover:border-blue-300 transition">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                  <Mic className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>How to Speak It</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {ctx.contextual_delivery_advice || 'Keep your speaking speed steady, vary your tone, and pause naturally.'}
                </p>
              </div>
            </div>
          )}

          {/* Strengths & Practice Priorities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Strengths */}
            {interpretation.strengths && interpretation.strengths.length > 0 && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Award className="w-3.5 h-3.5" /> What You Did Well
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {interpretation.strengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold shrink-0">✓</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {interpretation.overall_recommendations && interpretation.overall_recommendations.length > 0 && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Top Things to Practice
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {interpretation.overall_recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-blue-900 font-bold shrink-0">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
