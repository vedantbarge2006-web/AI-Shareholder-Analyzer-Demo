import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Cpu,
  Lock,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Server,
} from 'lucide-react';
import { useFinancialData } from '../context/FinancialDataContext';

export const AiSettings: React.FC = () => {
  const { aiStatus, isAiConfigured, saveAiKey, removeAiKey, refreshAiStatus } = useFinancialData();

  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a valid Gemini API key.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    const res = await saveAiKey(inputKey);
    setIsSaving(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Gemini API key validated and securely configured!' });
      setInputKey('');
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to validate API key.' });
    }
  };

  const handleTestExisting = async () => {
    setIsTesting(true);
    setFeedback(null);
    await refreshAiStatus();
    setIsTesting(false);
    if (isAiConfigured) {
      setFeedback({ type: 'success', message: 'Gemini AI service connection is operational and ready.' });
    } else {
      setFeedback({ type: 'error', message: 'Gemini API key is not configured.' });
    }
  };

  const handleRemove = async () => {
    if (window.confirm('Are you sure you want to remove the saved Gemini API key from the backend?')) {
      await removeAiKey();
      setFeedback({ type: 'success', message: 'Gemini API key removed successfully.' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Copilot Architecture
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Google GenAI SDK v3.6
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Gemini AI Analyst & Security Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure Google Gemini to enable board-level shareholder value commentary, risk diagnostics, and strategic chat.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTestExisting}
          disabled={isTesting}
          className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 self-start md:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isTesting ? 'animate-spin' : ''}`} />
          <span>Test AI Status</span>
        </button>
      </div>

      {/* Live AI Status Banner */}
      <div
        className={`p-5 rounded-xl border transition-all ${
          isAiConfigured
            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/60 border-amber-200 text-amber-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isAiConfigured ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}
            >
              {isAiConfigured ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">
                  {isAiConfigured ? 'Gemini AI Analyst Active' : 'Gemini AI Analyst Not Configured'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isAiConfigured
                      ? 'bg-emerald-200/80 text-emerald-900'
                      : 'bg-amber-200/80 text-amber-900'
                  }`}
                >
                  {aiStatus?.service_status || 'Unconfigured'}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {isAiConfigured
                  ? `Authenticated with backend-stored credentials. Active Model: ${aiStatus?.model || 'gemini-2.5-flash'}`
                  : 'Add your Google Gemini API key below to unlock AI Insights, Copilot Chat, and Scenario Interpretation.'}
              </p>
              {aiStatus?.masked_key && (
                <div className="mt-2 text-xs font-mono font-medium flex items-center gap-2 text-slate-700">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-sans font-semibold">
                    Saved Key:
                  </span>
                  <span className="bg-white/80 px-2 py-0.5 rounded border border-slate-300">
                    {aiStatus.masked_key}
                  </span>
                </div>
              )}
            </div>
          </div>

          {isAiConfigured && (
            <button
              onClick={handleRemove}
              className="px-3 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shrink-0 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Key</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* API Key Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {isAiConfigured ? 'Update Gemini API Key' : 'Enter Gemini API Key'}
            </h3>
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
          >
            <span>Get Gemini API Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder={isAiConfigured ? 'Enter new API key to replace current key...' : 'AIzaSy...'}
                className="w-full px-4 py-2.5 pr-10 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400 placeholder:font-sans"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Toggle password visibility"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports Gemini API keys (starts with <code className="font-mono text-slate-600">AIzaSy</code>). Keys are validated against Google API before being stored.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving || !inputKey.trim()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating Key with Google...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Save & Activate Gemini</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Reliability Architecture Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Backend-Only Key Storage</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            API keys are saved exclusively in local backend storage (<code className="font-mono text-slate-700">.gemini_key</code>). Keys are never sent to browser storage or returned in API responses.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span>Zero Calculation Drift</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Gemini never calculates or invents financial figures. All metrics (EVA, ROIC, ROE, Spread) are calculated deterministically by the Python Financial Engine first.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Company Data Isolation</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            AI queries enforce strict context boundaries. The AI analyst is restricted to the active corporate profile and cannot cross-contaminate data between companies.
          </p>
        </div>
      </div>
    </div>
  );
};
