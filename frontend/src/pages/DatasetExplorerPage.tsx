import React, { useEffect, useState } from 'react';
import {
  Database,
  PlusCircle,
  Tag,
  CheckCircle2,
  Layers,
  FileText,
  Search,
  Sliders,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { listDatasetSamples, createDatasetSample, addHumanAnnotation, getDatasetSummary } from '../services/api';
import { DatasetSample } from '../types';

export const DatasetExplorerPage: React.FC = () => {
  const [samples, setSamples] = useState<DatasetSample[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSplit, setSelectedSplit] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAnnotateModal, setShowAnnotateModal] = useState<DatasetSample | null>(null);

  // New Sample Form
  const [scriptId, setScriptId] = useState('script_declamation_01');
  const [title, setTitle] = useState('Declamation Competition Benchmark');
  const [speechCategory, setSpeechCategory] = useState('Declamation');
  const [transcript, setTranscript] = useState('Freedom and justice require continuous vigilance and principled rhetoric.');
  const [split, setSplit] = useState('train');
  const [flawCategory, setFlawCategory] = useState('excessive_speaking_rate');

  // Annotation Form
  const [annoCategory, setAnnoCategory] = useState('excessive_speaking_rate');
  const [annoStart, setAnnoStart] = useState('0.5');
  const [annoEnd, setAnnoEnd] = useState('2.0');
  const [annoText, setAnnoText] = useState('Freedom and justice');
  const [annoExplanation, setAnnoExplanation] = useState('Rushed opening phrase.');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sData, sumData] = await Promise.all([
        listDatasetSamples(),
        getDatasetSummary()
      ]);
      setSamples(sData);
      setSummary(sumData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSample = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDatasetSample({
        script_id: scriptId,
        title,
        speech_category: speechCategory,
        transcript_text: transcript,
        flaw_categories: [flawCategory],
        split,
        severity: 'medium',
        notes: 'Added via Dataset Explorer UI'
      });
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to add dataset sample');
    }
  };

  const handleAddAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAnnotateModal) return;

    try {
      await addHumanAnnotation({
        dataset_sample_id: showAnnotateModal.id,
        reviewer_id: 'expert_reviewer_1',
        flaw_category: annoCategory,
        start_seconds: parseFloat(annoStart),
        end_seconds: parseFloat(annoEnd),
        text_segment: annoText,
        severity: 'medium',
        explanation: annoExplanation
      });
      setShowAnnotateModal(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to add annotation');
    }
  };

  const filteredSamples = samples.filter((s) => selectedSplit === 'all' || s.split === selectedSplit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-blue-950 tracking-tight">Speech Library & Practice Speeches</h1>
          <p className="text-xs text-slate-500">
            Inspect paired reference speeches, ground-truth annotations, and speech library categories.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Add Practice Speech</span>
        </button>
      </div>

      {/* Dataset Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Speeches</div>
          <div className="text-2xl font-bold font-mono text-blue-950">{summary?.total_samples || 0}</div>
          <div className="text-[11px] text-slate-400">Standard practice models</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Human Benchmark Labels</div>
          <div className="text-2xl font-bold font-mono text-emerald-600">{summary?.total_annotations || 0}</div>
          <div className="text-[11px] text-slate-400">Timestamped expert annotations</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Split Breakdown</div>
          <div className="text-xs font-mono text-slate-700 flex items-center gap-2 pt-1">
            <span className="text-blue-900 font-bold">{summary?.split_distribution?.train || 0} Train</span>
            <span>•</span>
            <span className="text-amber-600 font-bold">{summary?.split_distribution?.val || 0} Val</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">{summary?.split_distribution?.test || 0} Test</span>
          </div>
          <div className="text-[11px] text-slate-400">Balanced training benchmarks</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {['all', 'train', 'val', 'test'].map((sp) => (
          <button
            key={sp}
            onClick={() => setSelectedSplit(sp)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
              selectedSplit === sp
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-blue-950 hover:bg-blue-50/70'
            }`}
          >
            {sp === 'all' ? 'All Practice Speeches' : `${sp} Set`}
          </button>
        ))}
      </div>

      {/* Samples List */}
      <div className="space-y-3">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredSamples.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSamples.map((sample) => (
              <div
                key={sample.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-blue-50 text-blue-900 border border-blue-200">
                      {sample.split} split
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ID: {sample.script_id}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-blue-950">{sample.title}</h3>
                  <p className="text-xs text-slate-700 font-mono italic bg-slate-50 p-2.5 rounded border border-slate-200 line-clamp-3">
                    "{sample.transcript_text}"
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {sample.flaw_categories?.map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-mono"
                      >
                        {cat.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {sample.annotations_count} benchmark notes
                  </span>

                  <button
                    onClick={() => setShowAnnotateModal(sample)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-900 text-blue-900 hover:text-white border border-blue-200 text-xs font-semibold transition"
                  >
                    Annotate Issue
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400 shadow-xs">
            No practice speeches found in this category.
          </div>
        )}
      </div>

      {/* Add Sample Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-blue-950">Add Practice Speech</h3>

            <form onSubmit={handleCreateSample} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Script ID</label>
                <input
                  type="text"
                  value={scriptId}
                  onChange={(e) => setScriptId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-900 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-900 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Transcript Text</label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-900 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Split</label>
                  <select
                    value={split}
                    onChange={(e) => setSplit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-900 focus:bg-white"
                  >
                    <option value="train">Train</option>
                    <option value="val">Validation</option>
                    <option value="test">Test</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Target Issue Category</label>
                  <select
                    value={flawCategory}
                    onChange={(e) => setFlawCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-900 focus:bg-white"
                  >
                    <option value="excessive_speaking_rate">Speaking Too Fast</option>
                    <option value="unusually_slow_rate">Speaking Too Slow</option>
                    <option value="excessive_pause">Unnatural Long Pause</option>
                    <option value="flat_intonation">Monotone / Flat Tone</option>
                    <option value="inconsistent_loudness">Volume Fading Away</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-900 hover:bg-blue-800 text-white font-semibold shadow-xs"
                >
                  Create Sample
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Annotate Flaw Modal */}
      {showAnnotateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-blue-950">Add Human Expert Annotation</h3>
            <p className="text-xs text-slate-500">
              Annotating: <span className="text-blue-950 font-semibold">{showAnnotateModal.title}</span>
            </p>

            <form onSubmit={handleAddAnnotation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Issue Category</label>
                <select
                  value={annoCategory}
                  onChange={(e) => setAnnoCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-900 focus:bg-white"
                >
                  <option value="excessive_speaking_rate">Speaking Too Fast</option>
                  <option value="unusually_slow_rate">Speaking Too Slow</option>
                  <option value="excessive_pause">Unnatural Long Pause</option>
                  <option value="flat_intonation">Monotone / Flat Tone</option>
                  <option value="inconsistent_loudness">Volume Fading Away</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Start Timestamp (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={annoStart}
                    onChange={(e) => setAnnoStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-900 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">End Timestamp (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={annoEnd}
                    onChange={(e) => setAnnoEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-900 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Text Segment</label>
                <input
                  type="text"
                  value={annoText}
                  onChange={(e) => setAnnoText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-900 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Judge Explanation</label>
                <textarea
                  value={annoExplanation}
                  onChange={(e) => setAnnoExplanation(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAnnotateModal(null)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-900 hover:bg-blue-800 text-white font-semibold shadow-xs"
                >
                  Save Annotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
