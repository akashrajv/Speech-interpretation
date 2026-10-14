import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Mic,
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { createAnalysis, loadSampleAnalysis } from '../services/api';

const SPEECH_CATEGORIES = [
  'Persuasive Oratory',
  'Interpretive Reading',
  'Declamation',
  'Extemporaneous Speaking',
  'Debate',
  'Public Speaking Competitions',
  'Presentation Training',
];

export const NewAnalysisPage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [speechCategory, setSpeechCategory] = useState(SPEECH_CATEGORIES[0]);
  const [speakerId, setSpeakerId] = useState('');
  const [transcriptText, setTranscriptText] = useState('');
  const [enableGemini, setEnableGemini] = useState(true);

  const [participantFile, setParticipantFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);

  const [partPreviewUrl, setPartPreviewUrl] = useState<string | null>(null);
  const [refPreviewUrl, setRefPreviewUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const partInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const txtInputRef = useRef<HTMLInputElement>(null);

  const handleParticipantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setParticipantFile(file);
      setPartPreviewUrl(URL.createObjectURL(file));
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    }
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceFile(file);
      setRefPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setTranscriptText(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLoadPreset = (key: 'script_1' | 'script_2') => {
    if (key === 'script_1') {
      setTitle("Shakespeare's Hamlet - Soliloquy");
      setSpeechCategory('Interpretive Reading');
      setTranscriptText(
        "To be, or not to be, that is the question: " +
        "Whether 'tis nobler in the mind to suffer " +
        "The slings and arrows of outrageous fortune, " +
        "Or to take arms against a sea of troubles."
      );
      setSpeakerId('participant_hamlet_01');
    } else {
      setTitle('The Great Technological Crossroads');
      setSpeechCategory('Persuasive Oratory');
      setTranscriptText(
        "We stand today at a profound technological crossroads. " +
        "The algorithms we build will shape human democracy, " +
        "and our responsibility demands unwavering courage."
      );
      setSpeakerId('participant_oratory_02');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantFile) {
      setErrorMsg('Please upload a participant audio recording.');
      return;
    }
    if (!transcriptText.trim()) {
      setErrorMsg('Please provide the speech transcript text.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append('participant_audio', participantFile);
      if (referenceFile) {
        formData.append('reference_audio', referenceFile);
      }
      formData.append('transcript_text', transcriptText);
      formData.append('title', title || 'Competitive Speech Evaluation');
      formData.append('speech_category', speechCategory);
      if (speakerId) formData.append('speaker_id', speakerId);
      formData.append('enable_gemini_interpret', String(enableGemini));

      const res = await createAnalysis(formData);
      navigate(`/analysis/${res.analysis_id}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to submit speech analysis. Check file format & backend.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">New Speech Evaluation</h1>
        <p className="text-xs text-slate-400">
          Upload speech recordings and transcript for temporal flaw detection and rubric-based scoring.
        </p>
      </div>

      {/* Preset Quick Load Helper */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-white">Need sample data?</span> Click below to pre-populate competitive speech transcripts or run an instant preset benchmark.
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleLoadPreset('script_1')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            Load Hamlet Text
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('script_2')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            Load Oratory Text
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Audio Upload Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Participant Audio */}
          <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-indigo-400" /> Participant Audio *
              </span>
              <span className="text-[10px] text-slate-400 font-mono">WAV, MP3, M4A</span>
            </div>

            <input
              type="file"
              ref={partInputRef}
              onChange={handleParticipantChange}
              accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
              className="hidden"
            />

            <div
              onClick={() => partInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                participantFile
                  ? 'border-indigo-500/50 bg-indigo-500/5'
                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
              {participantFile ? (
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white truncate max-w-xs mx-auto">
                    {participantFile.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {(participantFile.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-300">
                    Click to select participant recording
                  </div>
                  <div className="text-[10px] text-slate-500">Max size 50MB, up to 10 minutes</div>
                </div>
              )}
            </div>

            {partPreviewUrl && (
              <audio src={partPreviewUrl} controls className="w-full h-8 pt-1" />
            )}
          </div>

          {/* Reference Audio */}
          <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" /> Reference Audio (Optional)
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Ideal Model</span>
            </div>

            <input
              type="file"
              ref={refInputRef}
              onChange={handleReferenceChange}
              accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
              className="hidden"
            />

            <div
              onClick={() => refInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                referenceFile
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <Upload className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              {referenceFile ? (
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white truncate max-w-xs mx-auto">
                    {referenceFile.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {(referenceFile.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-300">
                    Click to upload ideal comparison recording
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Optional: enables comparative tempo & pitch matching
                  </div>
                </div>
              )}
            </div>

            {refPreviewUrl && (
              <audio src={refPreviewUrl} controls className="w-full h-8 pt-1" />
            )}
          </div>
        </div>

        {/* Transcript Section */}
        <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" /> Speech Transcript *
            </span>
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={txtInputRef}
                onChange={handleTxtUpload}
                accept=".txt"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => txtInputRef.current?.click()}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Upload .txt file
              </button>
            </div>
          </div>

          <textarea
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            rows={5}
            placeholder="Paste the exact spoken script or transcript text here for forced alignment..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
            required
          />
        </div>

        {/* Metadata & Config Options */}
        <div className="bg-slate-900/70 p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Evaluation Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Speech Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. State Championship Final Round"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Category
              </label>
              <select
                value={speechCategory}
                onChange={(e) => setSpeechCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {SPEECH_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Speaker / Contestant Identifier
              </label>
              <input
                type="text"
                value={speakerId}
                onChange={(e) => setSpeakerId(e.target.value)}
                placeholder="e.g. Speaker-401 (Optional)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="gemini-toggle"
                checked={enableGemini}
                onChange={(e) => setEnableGemini(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
              />
              <label htmlFor="gemini-toggle" className="text-xs text-slate-300 font-medium cursor-pointer">
                Enable Gemini AI Coaching Interpretation (uses fallback if offline/no key)
              </label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            <span>{submitting ? 'Processing Audio & Features...' : 'Run Speech Analysis'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
