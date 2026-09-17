import React, { useState } from 'react';
import { AISettings } from '../types';
import { Settings, Key, Globe, Cpu, X, Save, Check, Zap, Loader2 } from 'lucide-react';
import { testConnection } from '../services/aiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (settings: AISettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [form, setForm] = useState<AISettings>(settings);
  const [saved, setSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleTestKey = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const msg = await testConnection(form);
      setTestResult({ success: true, message: msg });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: msg });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-lg">
            <Settings className="w-5 h-5 text-indigo-400" />
            AI 模型与 API 配置 (BYOK)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="text-xs text-slate-400 bg-indigo-500/10 border border-indigo-500/20 p-3.5 rounded-xl leading-relaxed">
            💡 默认无需填 Key 即可体验内置高数/力学考点 Demo。若需处理你的实际复习笔记，填入 <strong>DeepSeek</strong> 或 <strong>OpenAI</strong> API Key 即可。
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-400" /> 模型提供商
            </label>
            <select
              value={form.provider}
              onChange={(e) => {
                const prov = e.target.value as AISettings['provider'];
                if (prov === 'deepseek') {
                  setForm({
                    ...form,
                    provider: prov,
                    baseUrl: 'https://api.deepseek.com/v1',
                    model: 'deepseek-chat',
                  });
                } else if (prov === 'openai') {
                  setForm({
                    ...form,
                    provider: prov,
                    baseUrl: 'https://api.openai.com/v1',
                    model: 'gpt-4o-mini',
                  });
                } else {
                  setForm({ ...form, provider: prov });
                }
              }}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="deepseek">DeepSeek (官方直连推荐)</option>
              <option value="openai">OpenAI (官方)</option>
              <option value="custom">自定义兼容 OpenAI 接口 (OneAPI / 智谱 / 通义等)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-indigo-400" /> API Key
            </label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-400" /> API Base URL
            </label>
            <input
              type="text"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://api.deepseek.com/v1"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              模型名称 (Model)
            </label>
            <input
              type="text"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="deepseek-chat"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Test connection result display */}
          {testResult && (
            <div className={`p-3 rounded-xl text-xs ${testResult.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
              {testResult.message}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestKey}
              className="px-3.5 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
              {isTesting ? '正在测试连接...' : '测试 API 连通性'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
              >
                {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
                {saved ? '已保存！' : '保存设置'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
