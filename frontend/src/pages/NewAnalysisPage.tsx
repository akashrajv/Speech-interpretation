import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Mic,
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { createAnalysis, autoTranscribeAudio } from '../services/api';

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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const partInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const txtInputRef = useRef<HTMLInputElement>(null);

  const handleAutoTranscribe = async () => {
    if (!participantFile) {
      setErrorMsg('Please select a speech audio recording first to auto-transcribe.');
      return;
    }
    try {
      setIsTranscribing(true);
      setErrorMsg(null);
      const res = await autoTranscribeAudio(participantFile, speechCategory);
      if (res.transcript) {
        setTranscriptText(res.transcript);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Automatic speech transcription failed. You can paste or type the transcript manually.');
    } finally {
      setIsTranscribing(false);
    }
  };

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
      setErrorMsg('Please upload your speech audio recording.');
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
      formData.append('title', title || 'Speech Evaluation');
      formData.append('speech_category', speechCategory);
      if (speakerId) formData.append('speaker_id', speakerId);
      formData.append('enable_gemini_interpret', String(enableGemini));

      const res = await createAnalysis(formData);
      navigate(`/analysis/${res.analysis_id}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to submit speech analysis. Check file format & backend connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-blue-950 tracking-tight">Evaluate a Speech Recording</h1>
        <p className="text-xs text-slate-500">
          Upload your audio to get feedback on speed, pauses, pitch variation, loudness, and word clarity.
        </p>
      </div>

      {/* Preset Quick Load Helper */}
      <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="text-xs text-slate-700">
            <span className="font-bold text-blue-950">Need a practice text?</span> Click below to automatically fill in sample speeches.
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleLoadPreset('script_1')}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold shadow-xs transition"
          >
            Hamlet Script
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('script_2')}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold shadow-xs transition"
          >
            Persuasion Script
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Audio Upload Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Participant Audio */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-blue-900" /> Your Speech Audio *
              </span>
              <span className="text-[10px] text-slate-500 font-mono">WAV, MP3, M4A</span>
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
                  ? 'border-blue-600 bg-blue-50/50'
                  : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/20'
              }`}
            >
              <Upload className="w-6 h-6 text-blue-900 mx-auto mb-2" />
              {participantFile ? (
                <div className="space-y-1">
                  <div className="text-xs font-bold text-blue-950 truncate max-w-xs mx-auto">
                    {participantFile.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {(participantFile.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-700">
                    Click to select your speech audio
                  </div>
                  <div className="text-[10px] text-slate-400">Up to 50MB, max 10 minutes</div>
                </div>
              )}
            </div>

            {partPreviewUrl && (
              <audio src={partPreviewUrl} controls className="w-full h-8 pt-1" />
            )}
          </div>

          {/* Reference Audio */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" /> Ideal Reference Audio (Optional)
              </span>
              <span className="text-[10px] text-emerald-700 font-mono font-semibold">Model Comparison</span>
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
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20'
              }`}
            >
              <Upload className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              {referenceFile ? (
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-xs mx-auto">
                    {referenceFile.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {(referenceFile.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-700">
                    Click to upload ideal model recording
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Optional: enables comparative speed & tone matching
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
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-900" /> Speech Transcript
              <span className="text-[10px] text-blue-900 font-mono font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                (optional — auto-generated from audio)
              </span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoTranscribe}
                disabled={isTranscribing || !participantFile}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[11px] font-semibold transition disabled:opacity-40"
                title="Transcribes the uploaded audio automatically"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{isTranscribing ? 'Transcribing...' : 'Auto-Transcribe from Audio'}</span>
              </button>

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
                className="text-[11px] text-slate-600 hover:text-blue-950 font-medium px-2 py-1"
              >
                Upload .txt
              </button>
            </div>
          </div>

          <textarea
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            rows={5}
            placeholder="Leave blank to automatically transcribe the speech from your audio file, or paste your spoken script here..."
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-900 focus:bg-white font-mono leading-relaxed"
          />
        </div>

        {/* Details & Config */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950">
            Speech Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Speech Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Shakespeare's Hamlet"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Category
              </label>
              <select
                value={speechCategory}
                onChange={(e) => setSpeechCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-900 focus:bg-white"
              >
                {SPEECH_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Speaker Name / ID (Optional)
              </label>
              <input
                type="text"
                value={speakerId}
                onChange={(e) => setSpeakerId(e.target.value)}
                placeholder="e.g. Speaker-1"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-900 focus:bg-white"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="gemini-toggle"
                checked={enableGemini}
                onChange={(e) => setEnableGemini(e.target.checked)}
                className="rounded border-slate-300 text-blue-900 focus:ring-0"
              />
              <label htmlFor="gemini-toggle" className="text-xs text-slate-700 font-medium cursor-pointer">
                Include AI Delivery Coaching & Speech Context Analysis
              </label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            <span>{submitting ? 'Analyzing Speech...' : 'Start Speech Evaluation'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
