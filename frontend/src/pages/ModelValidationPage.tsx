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
          <h1 className="text-2xl font-bold text-blue-950 tracking-tight">Model Validation & Benchmarks</h1>
          <p className="text-xs text-slate-500">
            Calculates empirical precision, recall, F1, and temporal IoU overlap by comparing automated detections against human annotations.
          </p>
        </div>

        {/* IoU Threshold Slider Control */}
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shrink-0 shadow-xs">
          <Sliders className="w-4 h-4 text-blue-900" />
          <div className="text-xs">
            <span className="text-slate-500 font-semibold mr-2">Temporal IoU Threshold:</span>
            <span className="font-mono font-bold text-blue-950">{(iouThreshold * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.80"
            step="0.05"
            value={iouThreshold}
            onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
            className="w-24 accent-blue-900 cursor-pointer"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs text-slate-500 font-medium">Computing temporal overlap metrics...</div>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Overall F1 Score</span>
              <div className="text-2xl font-bold font-mono text-emerald-600">
                {(report.overall_f1_score * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-400">Harmonic mean of precision and recall</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Detection Precision</span>
              <div className="text-2xl font-bold font-mono text-blue-900">
                {(report.overall_precision * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-400">True positives / total predictions</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Detection Recall</span>
              <div className="text-2xl font-bold font-mono text-amber-600">
                {(report.overall_recall * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-400">True positives / ground-truth labels</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Mean Temporal IoU</span>
              <div className="text-2xl font-bold font-mono text-blue-950">
                {(report.mean_temporal_iou * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-400">Average interval intersection-over-union</p>
            </div>
          </div>

          {/* Per-Category Evaluation Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-900" /> Performance by Flaw Category
            </h3>

            {report.category_metrics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
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
                  <tbody className="divide-y divide-slate-200">
                    {report.category_metrics.map((cm) => (
                      <tr key={cm.category} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-semibold text-slate-800 capitalize">
                          {cm.category.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">{cm.ground_truth_count}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{cm.predicted_count}</td>
                        <td className="py-3 px-3 font-mono text-emerald-600 font-semibold">{cm.true_positives}</td>
                        <td className="py-3 px-3 font-mono text-rose-600 font-semibold">{cm.false_positives}</td>
                        <td className="py-3 px-3 font-mono text-amber-600 font-semibold">{cm.false_negatives}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {(cm.precision * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {(cm.recall * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-900">
                          {(cm.f1_score * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono text-blue-950 font-semibold">
                          {(cm.mean_temporal_iou * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 italic">
                No human annotations available to evaluate.
              </div>
            )}
          </div>

          {/* Confusion Matrix Table */}
          {report.confusion_matrix && Object.keys(report.confusion_matrix).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
              <h3 className="text-sm font-bold text-blue-950">Detection Confusion Matrix</h3>
              <p className="text-xs text-slate-500">
                Rows indicate Ground-Truth human labels; columns indicate detector predictions.
              </p>

              <div className="overflow-x-auto pt-2">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500 font-semibold">
                      <th className="text-left py-2 px-3">Actual \ Predicted</th>
                      {Object.keys(report.confusion_matrix).map((c) => (
                        <th key={c} className="py-2 px-2 capitalize max-w-[100px] truncate" title={c}>
                          {c.replace(/_/g, ' ')}
                        </th>
                      ))}
                      <th className="py-2 px-2 text-rose-600">Missed (None)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {Object.entries(report.confusion_matrix).map(([actualCat, row]) => (
                      <tr key={actualCat}>
                        <td className="text-left py-2 px-3 font-sans font-semibold text-slate-800 capitalize">
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
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : val > 0
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                        <td className="py-2 px-2 text-rose-600 font-bold bg-rose-50/50">
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
        <div className="p-12 text-center text-xs text-slate-400 italic">
          No validation report available.
        </div>
      )}
    </div>
  );
};
