import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Sliders,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { validateModel } from '../services/api';
import { ValidationReport } from '../types';

export const ModelValidationPage: React.FC = () => {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [iouThreshold, setIouThreshold] = useState(0.30);

  const runValidation = async (thresh: number) => {
    try {
      setLoading(true);
      const data = await validateModel(thresh);
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runValidation(iouThreshold);
  }, []);

  const handleThresholdChange = (newVal: number) => {
    setIouThreshold(newVal);
    runValidation(newVal);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">Model Validation & Benchmarks</h1>
          <p className="text-xs text-slate-400">
            Calculates empirical precision, recall, F1, and temporal IoU overlap by comparing automated detections against human annotations.
          </p>
        </div>

        {/* IoU Threshold Slider Control */}
        <div className="flex items-center gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 shrink-0">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <div className="text-xs">
            <span className="text-slate-400 font-semibold mr-2">Temporal IoU Threshold:</span>
            <span className="font-mono font-bold text-white">{(iouThreshold * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.80"
            step="0.05"
            value={iouThreshold}
            onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
            className="w-24 accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs text-slate-400 font-medium">Computing temporal overlap metrics...</div>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Overall F1 Score</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {(report.overall_f1_score * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500">Harmonic mean of precision and recall</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Detection Precision</span>
              <div className="text-2xl font-bold font-mono text-indigo-400">
                {(report.overall_precision * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500">True positives / total predictions</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Detection Recall</span>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {(report.overall_recall * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500">True positives / ground-truth labels</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Mean Temporal IoU</span>
              <div className="text-2xl font-bold font-mono text-teal-400">
                {(report.mean_temporal_iou * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-500">Average interval intersection-over-union</p>
            </div>
          </div>

          {/* Per-Category Evaluation Breakdown */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" /> Performance by Flaw Category
            </h3>

            {report.category_metrics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Flaw Category</th>
                      <th className="py-2.5 px-3">Ground Truth</th>
                      <th className="py-2.5 px-3">Predicted</th>
                      <th className="py-2.5 px-3">TP</th>
                      <th className="py-2.5 px-3">FP</th>
                      <th className="py-2.5 px-3">FN</th>
                      <th className="py-2.5 px-3 font-mono">Precision</th>
                      <th className="py-2.5 px-3 font-mono">Recall</th>
                      <th className="py-2.5 px-3 font-mono">F1 Score</th>
                      <th className="py-2.5 px-3 font-mono">Mean IoU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {report.category_metrics.map((cm) => (
                      <tr key={cm.category} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-semibold text-slate-200 capitalize">
                          {cm.category.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">{cm.ground_truth_count}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{cm.predicted_count}</td>
                        <td className="py-3 px-3 font-mono text-emerald-400">{cm.true_positives}</td>
                        <td className="py-3 px-3 font-mono text-rose-400">{cm.false_positives}</td>
                        <td className="py-3 px-3 font-mono text-amber-400">{cm.false_negatives}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-200">
                          {(cm.precision * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-200">
                          {(cm.recall * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-400">
                          {(cm.f1_score * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono text-teal-400">
                          {(cm.mean_temporal_iou * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 italic">
                No human annotations available to evaluate.
              </div>
            )}
          </div>

          {/* Confusion Matrix Table */}
          {report.confusion_matrix && Object.keys(report.confusion_matrix).length > 0 && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">Detection Confusion Matrix</h3>
              <p className="text-xs text-slate-400">
                Rows indicate Ground-Truth human labels; columns indicate detector predictions.
              </p>

              <div className="overflow-x-auto pt-2">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 font-semibold">
                      <th className="text-left py-2 px-3">Actual \ Predicted</th>
                      {Object.keys(report.confusion_matrix).map((c) => (
                        <th key={c} className="py-2 px-2 capitalize max-w-[100px] truncate" title={c}>
                          {c.replace(/_/g, ' ')}
                        </th>
                      ))}
                      <th className="py-2 px-2 text-rose-400">Missed (None)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {Object.entries(report.confusion_matrix).map(([actualCat, row]) => (
                      <tr key={actualCat}>
                        <td className="text-left py-2 px-3 font-sans font-semibold text-slate-200 capitalize">
                          {actualCat.replace(/_/g, ' ')}
                        </td>
                        {Object.keys(report.confusion_matrix).map((predCat) => {
                          const val = row[predCat] || 0;
                          const isDiag = actualCat === predCat;
                          return (
                            <td
                              key={predCat}
                              className={`py-2 px-2 font-bold ${
                                isDiag && val > 0
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : val > 0
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'text-slate-600'
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                        <td className="py-2 px-2 text-rose-400 font-bold bg-rose-500/5">
                          {row['None'] || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-slate-500 italic">
          No validation report available.
        </div>
      )}
    </div>
  );
};
