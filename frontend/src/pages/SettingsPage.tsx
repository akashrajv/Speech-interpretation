import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Sparkles,
  Sliders,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Save,
  Key,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { getSettings, updateSettings, getModelStatus } from '../services/api';
import { SettingsData, ModelStatus } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  // Form states
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [enableGemini, setEnableGemini] = useState(false);

  // Rubric weights
  const [wPacing, setWPacing] = useState(0.25);
  const [wPitch, setWPitch] = useState(0.20);
  const [wVolume, setWVolume] = useState(0.20);
  const [wPron, setWPron] = useState(0.20);
  const [wEmp, setWEmp] = useState(0.15);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sData, mData] = await Promise.all([
        getSettings(),
        getModelStatus(),
      ]);
      setSettings(sData);
      setModelStatus(mData);

      setEnableGemini(sData.gemini_enabled);
      setSelectedModel(sData.gemini_model || 'gemini-2.5-flash');
      setWPacing(sData.weight_pacing);
      setWPitch(sData.weight_pitch);
      setWVolume(sData.weight_volume);
      setWPron(sData.weight_pronunciation);
      setWEmp(sData.weight_emphasis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = {
        gemini_model: selectedModel,
        enable_gemini: enableGemini,
        weight_pacing: wPacing,
        weight_pitch: wPitch,
        weight_volume: wVolume,
        weight_pronunciation: wPron,
        weight_emphasis: wEmp,
      };
      if (geminiKeyInput.trim()) {
        payload.gemini_api_key = geminiKeyInput.trim();
      }

      const res = await updateSettings(payload);
      setSettings(res);
      setGeminiKeyInput('');
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const weightSum = wPacing + wPitch + wVolume + wPron + wEmp;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">System & AI Configuration</h1>
        <p className="text-xs text-slate-400">
          Manage Google Gemini credentials, acoustic detection thresholds, and rubric weights.
        </p>
      </div>

      {savedMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Configuration updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Gemini AI Settings Card */}
        <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Google Gemini API Integration
            </h3>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                settings?.gemini_configured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {settings?.gemini_configured ? 'API Key Configured' : 'No Key (Deterministic Fallback)'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            When enabled, Google Gemini provides evidence-grounded coaching interpretations and vocal exercises based solely on the mathematically extracted acoustic evidence. Audio stays local by default.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enable-gemini"
                checked={enableGemini}
                onChange={(e) => setEnableGemini(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <label htmlFor="enable-gemini" className="text-xs font-semibold text-slate-200 cursor-pointer">
                Enable Gemini AI Coaching Interpretation
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Gemini API Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder={settings?.gemini_configured ? '••••••••••••••••••••••••' : 'AIzaSy...'}
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Keys are stored securely in environment variables and never exposed to the client.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Gemini Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Rubric Weights Configuration */}
        <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" /> Rubric Dimension Weights
            </h3>
            <span
              className={`text-xs font-mono font-semibold ${
                Math.abs(weightSum - 1.0) < 0.01 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              Total Sum: {(weightSum * 100).toFixed(0)}%
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Customize the relative weights for composite speech scoring. Dimension scores are calculated from acoustic evidence and normalized to 100%.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Pacing ({(wPacing * 100).toFixed(0)}%)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={wPacing}
                onChange={(e) => setWPacing(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Pitch ({(wPitch * 100).toFixed(0)}%)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={wPitch}
                onChange={(e) => setWPitch(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Volume ({(wVolume * 100).toFixed(0)}%)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={wVolume}
                onChange={(e) => setWVolume(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Pronunciation ({(wPron * 100).toFixed(0)}%)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={wPron}
                onChange={(e) => setWPron(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Emphasis ({(wEmp * 100).toFixed(0)}%)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={wEmp}
                onChange={(e) => setWEmp(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Model & System Health Checks */}
        <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Model Availability & Health Checks
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold">Voice Activity Detection</span>
              <div className="text-slate-200 font-mono">{modelStatus?.vad_status}</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold">Pitch Contour Estimator</span>
              <div className="text-slate-200 font-mono">{modelStatus?.pitch_estimator}</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold">Forced Syllable Aligner</span>
              <div className="text-slate-200 font-mono">{modelStatus?.forced_aligner}</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold">Gemini AI Coach</span>
              <div className="text-slate-200 font-mono">{modelStatus?.gemini_status}</div>
            </div>
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
