import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
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
  CheckCircle,
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
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-sm text-slate-400 font-medium">Loading Speech Evaluation Analytics...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Analyses',
      value: summary?.total_analyses || 0,
      icon: Mic,
      color: 'from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/20',
      detail: `${summary?.completed_analyses || 0} completed successfully`,
    },
    {
      title: 'Average Delivery Score',
      value: summary?.average_delivery_score ? `${summary.average_delivery_score.toFixed(1)} / 100` : 'N/A',
      icon: Award,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20',
      detail: 'Reproducible rubric composite',
    },
    {
      title: 'Total Detected Flaws',
      value: summary?.total_detected_flaws || 0,
      icon: AlertTriangle,
      color: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/20',
      detail: summary?.most_common_flaw_category ? `Most common: ${summary.most_common_flaw_category.replace(/_/g, ' ')}` : 'None detected',
    },
    {
      title: 'Contrastive Dataset',
      value: summary?.dataset_sample_count || 0,
      icon: Database,
      color: 'from-violet-500/20 to-purple-500/10 text-violet-400 border-violet-500/20',
      detail: 'Paired reference & flawed samples',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-950 p-6 rounded-2xl border border-indigo-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Grounded Speech Intelligence
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Objective Speech Evaluation & Temporal Flaw Finding
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Counterpoint AI compares competitive speech deliveries with ideal reference recordings of the identical script, calculates mathematical acoustic evidence, and provides actionable coaching recommendations.
          </p>
        </div>

        {/* 1-Click Demo Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <button
            onClick={() => handleRunSample('script_1')}
            disabled={loadingSample}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{loadingSample ? 'Analyzing...' : 'Test Hamlet Soliloquy'}</span>
          </button>
          <button
            onClick={() => handleRunSample('script_2')}
            disabled={loadingSample}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Persuasive Speech</span>
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
              className={`p-5 rounded-xl border bg-gradient-to-br ${card.color} space-y-3 transition hover:translate-y-[-2px]`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{card.title}</span>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
                {card.value}
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate">
                {card.detail}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flaw Distribution Breakdown */}
        <div className="lg:col-span-2 bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" /> Detected Flaw Distribution
            </h3>
            <span className="text-xs text-slate-400">Temporal occurrences</span>
          </div>

          {summary?.flaw_category_distribution && Object.keys(summary.flaw_category_distribution).length > 0 ? (
            <div className="space-y-3 pt-2">
              {Object.entries(summary.flaw_category_distribution).map(([cat, count]) => {
                const total = summary.total_detected_flaws || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium capitalize">
                        {cat.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-500 text-xs italic">
              No flaws detected yet. Run an evaluation to see flaw distribution.
            </div>
          )}
        </div>

        {/* Score Distribution */}
        <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Score Distribution
          </h3>

          <div className="space-y-2.5 pt-2">
            {summary?.score_distribution &&
              Object.entries(summary.score_distribution).map(([bracket, count]) => (
                <div key={bracket} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                  <span className="font-mono text-slate-300 font-medium">{bracket} pts</span>
                  <span className="font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded">
                    {count} {count === 1 ? 'speech' : 'speeches'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Speech Analyses Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" /> Recent Speech Evaluations
          </h3>
          <Link
            to="/history"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {summary?.recent_analyses && summary.recent_analyses.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {summary.recent_analyses.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-800/40 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white hover:text-indigo-400 transition">
                      <Link to={`/analysis/${item.id}`}>{item.title}</Link>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {item.speech_category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span>{item.flaw_count} flaws detected</span>
                    {item.has_reference && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">Reference Matched</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <div className="text-lg font-bold font-mono text-white">
                      {item.overall_score !== null && item.overall_score !== undefined ? `${item.overall_score.toFixed(1)}` : 'In Progress'}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Delivery Score</div>
                  </div>

                  <Link
                    to={`/analysis/${item.id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition"
                  >
                    View Report
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <FileAudio className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm text-slate-400 font-medium">No speech analyses recorded yet.</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload recordings or click the Hamlet Soliloquy demo above to run an instant benchmark.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
