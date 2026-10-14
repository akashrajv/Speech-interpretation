import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mic,
  Award,
  AlertTriangle,
  Play,
  TrendingUp,
  Database,
  ArrowRight,
  Sparkles,
  BarChart3,
  Calendar,
  FileAudio
} from 'lucide-react';
import { getDashboardSummary, loadSampleAnalysis } from '../services/api';
import { DashboardSummary } from '../types';

export const OverviewPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSample, setLoadingSample] = useState(false);
  const navigate = useNavigate();

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleRunSample = async (sampleKey: string) => {
    try {
      setLoadingSample(true);
      const res = await loadSampleAnalysis(sampleKey);
      navigate(`/analysis/${res.analysis_id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to load sample evaluation. Check backend connection.');
    } finally {
      setLoadingSample(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
        <div className="text-sm text-slate-500 font-medium">Loading Speech Analytics...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Speeches Evaluated',
      value: summary?.total_analyses || 0,
      icon: Mic,
      color: 'bg-white border-slate-200 text-blue-900',
      detail: `${summary?.completed_analyses || 0} completed successfully`,
    },
    {
      title: 'Average Delivery Score',
      value: summary?.average_delivery_score ? `${summary.average_delivery_score.toFixed(1)} / 100` : 'N/A',
      icon: Award,
      color: 'bg-white border-slate-200 text-emerald-600',
      detail: 'Across pacing, tone, and volume',
    },
    {
      title: 'Common Speech Issues',
      value: summary?.total_detected_flaws || 0,
      icon: AlertTriangle,
      color: 'bg-white border-slate-200 text-amber-600',
      detail: summary?.most_common_flaw_category ? `Top: ${summary.most_common_flaw_category.replace(/_/g, ' ')}` : 'None detected',
    },
    {
      title: 'Library Practice Speeches',
      value: summary?.dataset_sample_count || 0,
      icon: Database,
      color: 'bg-white border-slate-200 text-blue-900',
      detail: 'Standard reference benchmarks',
    },
  ];

  return (
    <div className="space-y-7">
      {/* Hero Welcome Banner in White with Dark Blue */}
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-40 bg-blue-50/80 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 text-center md:text-left relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Speech Coach & Analytics
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-blue-950 tracking-tight">
            Speech Delivery Feedback & Coach
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Compare your speech recording against an ideal reference model. Discover exactly where you speak too fast, pause awkwardly, sound monotone, or lose volume.
          </p>
        </div>

        {/* 1-Click Demo Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => handleRunSample('script_1')}
            disabled={loadingSample}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{loadingSample ? 'Analyzing...' : 'Try Sample: Hamlet'}</span>
          </button>
          <button
            onClick={() => handleRunSample('script_2')}
            disabled={loadingSample}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Try Sample: Persuasion</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`p-5 rounded-xl border ${card.color} space-y-3 transition shadow-xs hover:border-blue-400`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{card.title}</span>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-blue-950 font-mono tracking-tight">
                {card.value}
              </div>
              <div className="text-[11px] text-slate-500 font-medium truncate">
                {card.detail}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flaw Distribution Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-900" /> Detected Speech Issues Breakdown
            </h3>
            <span className="text-xs text-slate-500 font-medium">Occurrences</span>
          </div>

          {summary?.flaw_category_distribution && Object.keys(summary.flaw_category_distribution).length > 0 ? (
            <div className="space-y-3 pt-2">
              {Object.entries(summary.flaw_category_distribution).map(([cat, count]) => {
                const total = summary.total_detected_flaws || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium capitalize">
                        {cat.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-900 rounded-full"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-400 text-xs italic">
              No speech issues detected yet. Click a demo above to see results.
            </div>
          )}
        </div>

        {/* Score Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Score Distribution
          </h3>

          <div className="space-y-2.5 pt-2">
            {summary?.score_distribution &&
              Object.entries(summary.score_distribution).map(([bracket, count]) => (
                <div key={bracket} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-mono text-slate-700 font-medium">{bracket} pts</span>
                  <span className="font-bold text-blue-950 font-mono bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs">
                    {count} {count === 1 ? 'speech' : 'speeches'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Speech Analyses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-900" /> Recent Speech Evaluations
          </h3>
          <Link
            to="/history"
            className="text-xs text-blue-900 hover:text-blue-700 font-semibold flex items-center gap-1 transition"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {summary?.recent_analyses && summary.recent_analyses.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {summary.recent_analyses.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-blue-950 hover:text-blue-700 transition">
                      <Link to={`/analysis/${item.id}`}>{item.title}</Link>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.speech_category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span className="text-rose-600 font-medium">{item.flaw_count} issues found</span>
                    {item.has_reference && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 font-medium">Reference Matched</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <div className="text-lg font-bold font-mono text-blue-950">
                      {item.overall_score !== null && item.overall_score !== undefined ? `${item.overall_score.toFixed(1)}` : 'In Progress'}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Delivery Score</div>
                  </div>

                  <Link
                    to={`/analysis/${item.id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-900 text-blue-900 hover:text-white border border-blue-200 text-xs font-semibold transition"
                  >
                    View Report
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <FileAudio className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="text-sm text-slate-600 font-medium">No speech evaluations recorded yet.</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload recordings or click a sample speech above to see an instant evaluation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
