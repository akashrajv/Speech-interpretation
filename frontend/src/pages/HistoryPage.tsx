import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Calendar,
  Award,
  AlertTriangle,
  Play
} from 'lucide-react';
import { listAnalyses, deleteAnalysis } from '../services/api';
import { AnalysisListItem } from '../types';

export const HistoryPage: React.FC = () => {
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchList = async () => {
    try {
      setLoading(true);
      const data = await listAnalyses();
      setAnalyses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this speech evaluation and its local audio recordings?')) {
      return;
    }
    try {
      await deleteAnalysis(id);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete analysis');
    }
  };

  const filtered = analyses.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.speaker_id && a.speaker_id.toLowerCase().includes(search.toLowerCase())) ||
      a.speech_category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || a.speech_category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(analyses.map((a) => a.speech_category)))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">Speech Analysis History</h1>
          <p className="text-xs text-slate-400">
            Browse, search, and manage previously recorded speech evaluations.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, speaker, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'All Speech Categories' : c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-800/40 transition"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/analysis/${item.id}`}
                    className="font-bold text-sm text-white hover:text-indigo-400 transition"
                  >
                    {item.title}
                  </Link>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {item.speech_category}
                  </span>
                  {item.has_reference && (
                    <span className="text-[10px] text-emerald-400 font-mono font-medium">
                      Matched
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <span>•</span>
                  <span>{item.flaw_count} flaws detected</span>
                  {item.speaker_id && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{item.speaker_id}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-white">
                    {item.overall_score !== null && item.overall_score !== undefined ? `${item.overall_score.toFixed(1)} / 100` : 'In Progress'}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Delivery Score</div>
                </div>

                <Link
                  to={`/analysis/${item.id}`}
                  className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition"
                  title="View Report"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Delete speech evaluation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
          <HistoryIcon className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="font-semibold text-slate-300">No evaluations matched your filters.</div>
          <p className="text-slate-500">Try adjusting your search query or speech category.</p>
        </div>
      )}
    </div>
  );
};
