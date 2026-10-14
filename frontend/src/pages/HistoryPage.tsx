import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  Search,
  Trash2,
  ExternalLink,
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
    if (!window.confirm('Are you sure you want to delete this speech evaluation and its audio recordings?')) {
      return;
    }
    try {
      await deleteAnalysis(id);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete speech evaluation');
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
          <h1 className="text-2xl font-bold text-blue-950 tracking-tight">Speech Evaluation History</h1>
          <p className="text-xs text-slate-500">
            Browse and review your previous speech evaluations and scores.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by speech title or speaker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-900 shadow-xs"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-900 w-full sm:w-auto shadow-xs"
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
          <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-200 shadow-xs">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/analysis/${item.id}`}
                    className="font-bold text-sm text-blue-950 hover:text-blue-700 transition"
                  >
                    {item.title}
                  </Link>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {item.speech_category}
                  </span>
                  {item.has_reference && (
                    <span className="text-[10px] text-emerald-600 font-mono font-medium">
                      Matched
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-3">
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <span>•</span>
                  <span className="text-rose-600 font-medium">{item.flaw_count} issues found</span>
                  {item.speaker_id && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-slate-600">{item.speaker_id}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-blue-950">
                    {item.overall_score !== null && item.overall_score !== undefined ? `${item.overall_score.toFixed(1)} / 100` : 'In Progress'}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Delivery Score</div>
                </div>

                <Link
                  to={`/analysis/${item.id}`}
                  className="p-2 rounded-lg bg-blue-50 hover:bg-blue-900 text-blue-900 hover:text-white border border-blue-200 text-xs font-semibold transition"
                  title="View Report"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Delete speech evaluation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2 shadow-xs">
          <HistoryIcon className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="font-semibold text-slate-700">No evaluations matched your search.</div>
          <p className="text-slate-500">Try adjusting your search query or speech category.</p>
        </div>
      )}
    </div>
  );
};
