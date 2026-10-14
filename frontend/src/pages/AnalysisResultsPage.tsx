import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Download,
  AlertTriangle,
  Play,
  Share2,
  CheckCircle,
  Clock,
  Mic,
  Award,
  Layers,
  Sparkles,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { getAnalysisDetail, getExportUrl, getAudioStreamUrl } from '../services/api';
import { AnalysisDetail, FlawItem } from '../types';
import { WaveformPlayer } from '../components/WaveformPlayer';
import { RubricGauge } from '../components/RubricGauge';
import { FlawEvidenceCard } from '../components/FlawEvidenceCard';
import { WordAlignmentViewer } from '../components/WordAlignmentViewer';
import { SpeakingRateChart } from '../charts/SpeakingRateChart';
import { PitchContourChart } from '../charts/PitchContourChart';
import { LoudnessChart } from '../charts/LoudnessChart';
import { PauseTimelineChart } from '../charts/PauseTimelineChart';
import { SpectrogramChart } from '../charts/SpectrogramChart';
import { SpeechContextCard } from '../components/SpeechContextCard';

export const AnalysisResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlaw, setSelectedFlaw] = useState<FlawItem | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'flaws' | 'charts' | 'transcript'>('flaws');

  useEffect(() => {
    if (!id) return;

    let intervalId: any = null;

    const fetchAnalysis = async () => {
      try {
        const data = await getAnalysisDetail(id);
        setAnalysis(data);

        if (data.status === 'completed' || data.status === 'failed') {
          setLoading(false);
          if (intervalId) clearInterval(intervalId);
          if (data.flaws.length > 0 && !selectedFlaw) {
            setSelectedFlaw(data.flaws[0]);
          }
        } else {
          // Keep polling while queued or processing
          setLoading(true);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchAnalysis();
    intervalId = setInterval(fetchAnalysis, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [id]);

  if (loading && (!analysis || analysis.status !== 'completed')) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-blue-900 border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <div className="text-base font-bold text-blue-950">
            {analysis?.status === 'processing' ? 'Extracting Acoustic Features & Temporal Flaws...' : 'Evaluating Speech Recording...'}
          </div>
          <p className="text-xs text-slate-500">
            Running VAD, YIN pitch estimation, forced syllable alignment, and rubric scoring.
          </p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-8 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <div className="text-blue-950 font-bold">Analysis Not Found</div>
        <Link to="/" className="text-xs text-blue-900 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const partAudioUrl = getAudioStreamUrl(analysis.id, 'participant');
  const refAudioUrl = getAudioStreamUrl(analysis.id, 'reference');

  const partSeries = analysis.feature_series_participant;
  const refSeries = analysis.feature_series_reference;

  return (
    <div className="space-y-6">
      {/* Top Header & Export Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/history"
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-950 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-blue-950 tracking-tight">{analysis.title}</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-900 border border-blue-200 font-mono">
              {analysis.speech_category}
            </span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-3">
            <span>Evaluated: {new Date(analysis.created_at).toLocaleString()}</span>
            <span>•</span>
            <span>Duration: {analysis.duration_seconds.toFixed(1)}s</span>
            <span>•</span>
            <span className="font-semibold text-rose-600">{analysis.flaws.length} Flaws Detected</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={getExportUrl(analysis.id, 'json')}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </a>
          <a
            href={getExportUrl(analysis.id, 'csv')}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Rubric Gauge Section */}
      {analysis.rubric_score && <RubricGauge rubric={analysis.rubric_score} />}

      {/* Gemini Rhetorical Context & Speech Intent Analysis */}
      {analysis.gemini_interpretation && (
        <SpeechContextCard
          interpretation={analysis.gemini_interpretation}
          speechCategory={analysis.speech_category}
          transcriptText={analysis.transcript}
        />
      )}

      {/* Synchronized Dual Audio Waveforms */}
      <div className="space-y-3">
        <WaveformPlayer
          audioUrl={partAudioUrl}
          role="participant"
          duration={analysis.duration_seconds}
          flaws={analysis.flaws}
          selectedFlaw={selectedFlaw}
          onTimeUpdate={setCurrentTime}
          onFlawClick={setSelectedFlaw}
        />

        {analysis.has_reference && (
          <WaveformPlayer
            audioUrl={refAudioUrl}
            role="reference"
            duration={analysis.reference_features?.duration_seconds || analysis.duration_seconds}
          />
        )}
      </div>

      {/* Selected Flaw Deep-Dive Card */}
      {selectedFlaw && (
        <FlawEvidenceCard
          flaw={selectedFlaw}
          geminiInterpretation={
            analysis.gemini_interpretation?.interpretations?.find(
              (i) => i.flaw_id === selectedFlaw.flaw_id
            )
          }
          onClose={() => setSelectedFlaw(null)}
        />
      )}

      {/* Analysis Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('flaws')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'flaws'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-blue-950 hover:bg-blue-50/70'
            }`}
          >
            Speech Issues to Fix ({analysis.flaws.length})
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'charts'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-blue-950 hover:bg-blue-50/70'
            }`}
          >
            Voice Charts (Speed, Pitch, Volume)
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'transcript'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-blue-950 hover:bg-blue-50/70'
            }`}
          >
            Words & Timing
          </button>
        </div>

        {/* Tab 1: Flaws List */}
        {activeTab === 'flaws' && (
          <div className="space-y-3">
            {analysis.flaws.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.flaws.map((flaw) => {
                  const isSelected = selectedFlaw?.flaw_id === flaw.flaw_id;
                  const flawInterp = analysis.gemini_interpretation?.interpretations?.find(
                    (i) => i.flaw_id === flaw.flaw_id
                  );

                  const getFriendlyName = (cat: string) => {
                    const l = cat.toLowerCase();
                    if (l.includes('rate') || l.includes('fast')) return 'Speaking Too Fast';
                    if (l.includes('pause') || l.includes('silence')) return 'Unnatural Long Pause';
                    if (l.includes('intonation') || l.includes('pitch')) return 'Monotone / Flat Tone';
                    if (l.includes('loudness') || l.includes('volume')) return 'Volume Fading Away';
                    if (l.includes('pronunciation')) return 'Word Articulation Issue';
                    return cat.replace(/_/g, ' ');
                  };

                  return (
                    <div
                      key={flaw.flaw_id}
                      onClick={() => setSelectedFlaw(flaw)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/60 border-blue-600 shadow-sm ring-1 ring-blue-600'
                          : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50/60 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-semibold font-mono uppercase px-2 py-0.5 rounded border ${
                            flaw.severity === 'high'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : flaw.severity === 'medium'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-900 border-blue-200'
                          }`}
                        >
                          {flaw.severity} Priority
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {flaw.start_seconds.toFixed(1)}s – {flaw.end_seconds.toFixed(1)}s
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-blue-950 capitalize mb-1">
                        {getFriendlyName(flaw.category)}
                      </h4>
                      <p className="text-xs text-blue-900 font-mono italic truncate mb-2">
                        "{flaw.text_segment}"
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {flaw.explanation}
                      </p>

                      {flawInterp?.contextual_significance && (
                        <div className="mt-2.5 p-2 rounded bg-blue-50/60 border border-blue-200 text-[11px] text-slate-800 flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            <strong className="text-blue-950">Context Impact: </strong>
                            {flawInterp.contextual_significance}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500 shadow-xs">
                <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                No delivery issues detected! Speech execution matched ideal rubric thresholds.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Acoustic Charts */}
        {activeTab === 'charts' && (
          <div className="space-y-6">
            {/* Speaking Rate Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <SpeakingRateChart
                participantSeries={partSeries?.speaking_rate_series || []}
                referenceSeries={refSeries?.speaking_rate_series || []}
              />
            </div>

            {/* Pitch Contour F0 Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <PitchContourChart
                participantTimes={partSeries?.time_stamps || []}
                participantContour={partSeries?.pitch_contour || []}
                referenceTimes={refSeries?.time_stamps || []}
                referenceContour={refSeries?.pitch_contour || []}
              />
            </div>

            {/* Loudness RMS Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <LoudnessChart
                participantTimes={partSeries?.time_stamps || []}
                participantRms={partSeries?.rms_envelope || []}
                referenceTimes={refSeries?.time_stamps || []}
                referenceRms={refSeries?.rms_envelope || []}
              />
            </div>

            {/* Pause Timeline */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <PauseTimelineChart
                pauses={partSeries?.pauses || []}
                totalDuration={analysis.duration_seconds}
              />
            </div>

            {/* Spectrogram */}
            {partSeries?.spectrogram_summary && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <SpectrogramChart spectrogram={partSeries.spectrogram_summary} />
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Word Alignment & Transcript */}
        {activeTab === 'transcript' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <WordAlignmentViewer
                alignments={analysis.alignments_participant}
                flaws={analysis.flaws}
                currentTime={currentTime}
                onSelectWord={(t) => setCurrentTime(t)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
