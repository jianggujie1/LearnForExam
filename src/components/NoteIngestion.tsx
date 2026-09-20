import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UploadCloud, Sparkles, Loader2, BookOpen, ArrowRight, Clock, Terminal, Wand2, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ShieldCheck, Trash2 } from 'lucide-react';
import { inspectMarkdown, fixMarkdownIssues } from '../utils/markdownInspector';

interface NoteIngestionProps {
  onGenerate: (title: string, noteText: string, onStreamChunk?: (chunk: string) => void) => Promise<void>;
  isLoading: boolean;
}

export const NoteIngestion: React.FC<NoteIngestionProps> = ({
  onGenerate,
  isLoading,
}) => {
  const [title, setTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [streamLog, setStreamLog] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [fixToast, setFixToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamLogRef = useRef<HTMLDivElement>(null);

  const inspection = useMemo(() => {
    return inspectMarkdown(noteText);
  }, [noteText]);

  const handleAutoFix = () => {
    const { fixedText, fixedCount } = fixMarkdownIssues(noteText);
    setNoteText(fixedText);
    setFixToast(`已自动规范化并修复 ${fixedCount} 处格式隐患！`);
    setTimeout(() => setFixToast(null), 4000);
  };
  // Timer for loading state
  useEffect(() => {
    let timer: any;
    if (isLoading) {
      setElapsedSeconds(0);
      setStreamLog('');
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isLoading]);

  // Auto scroll to bottom of stream log
  useEffect(() => {
    if (streamLogRef.current) {
      streamLogRef.current.scrollTop = streamLogRef.current.scrollHeight;
    }
  }, [streamLog]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setNoteText(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearNote = () => {
    setNoteText('');
    setTitle('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || isLoading) return;
    onGenerate(title.trim() || '期末复习专题', noteText, (chunk) => {
      setStreamLog((prev) => prev + chunk);
    });
  };

  const handleLoadSample = () => {
    setTitle('高等数学期末核心定理与极限复习');
    setNoteText(`# 高等数学期末复习重点笔记

## 1. 极限与连续
- 第一重要极限：lim(x->0) sin(x)/x = 1，必须牢记几何推导与正弦性质。
- 常见等价无穷小（x -> 0 时）：
  - sin(x) ~ x
  - tan(x) ~ x
  - e^x - 1 ~ x
  - 1 - cos(x) ~ 1/2 x^2 (极高频考点，容易漏掉 1/2)
- 洛必达法则前提条件：必须属于 0/0 型或 inf/inf 型未定式！若分母不趋向于零则不能乱用导数比值。

## 2. 经典力学基本定律
- 牛顿第二定律：物体加速度与合外力成正比，方向一致，公式为 F = ma。
- 动量守恒定律：系统受到的合外力为零时，总动量守恒。内力无论多大都不改变总动量。
- 机械能守恒条件：只有保守内力（重力、弹性力）做功，非保守力不做功。
`);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center justify-center gap-3 mb-3">
          <Sparkles className="w-8 h-8 text-indigo-400" />
          <span>期末笔记</span>
          <ArrowRight className="w-6 h-6 text-indigo-400" />
          <span>考点聚合与刷题通关</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
          把繁杂散乱的课堂笔记直接粘贴进来，AI 自动帮你归纳为 3~6 个核心主题模块，并生成考点闪卡与自测题库。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            课程或笔记名称
          </label>
          <input
            type="text"
            value={title}
            disabled={isLoading}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：高等数学下 / 操作系统 / 宏观经济学"
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              粘贴笔记全文 (支持 Markdown / 纯文本 / LaTeX 公式)
            </label>
            <div className="flex items-center gap-3">
              {noteText.trim().length > 0 && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleClearNote}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 清空笔记内容
                </button>
              )}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleLoadSample}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" /> 填入示例高数笔记
              </button>
            </div>
          </div>
          <textarea
            value={noteText}
            rows={8}
            disabled={isLoading}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="在此处粘贴你的期末复习笔记、划重点内容、定理公式或例题..."
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm font-mono leading-relaxed disabled:opacity-50"
          />
        </div>

        {/* File upload prompt */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors py-1.5 px-3 rounded-lg hover:bg-indigo-500/10 border border-indigo-500/20 disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            <span>点击导入本地 .md / .txt 笔记文件</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.markdown"
            onChange={handleFileUpload}
            className="hidden"
          />

          <span className="text-xs text-slate-500 font-mono">
            {noteText.length} 字
          </span>
        </div>
        {/* Markdown Import Inspection & Normalization Panel */}
        {noteText.trim().length > 0 && (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-3 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                {inspection.status === 'clean' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    格式规范优良 (100分) · 适合精准引用锚定
                  </span>
                ) : inspection.status === 'warning' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    健康分: {inspection.score} · 发现 {inspection.totalFixableCount} 处格式隐患
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    健康分: {inspection.score} · 存在破坏渲染与引用的格式缺陷
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {inspection.canAutoFix && (
                  <button
                    type="button"
                    onClick={handleAutoFix}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    一键规范化与修复
                  </button>
                )}

                {inspection.issues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDetails((prev) => !prev)}
                    className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
                  >
                    <span>详情</span>
                    {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono pt-0.5 border-t border-slate-800/40">
              <span>字数: <strong className="text-slate-200">{inspection.stats.charCount}</strong></span>
              <span>标题: <strong className="text-slate-200">{inspection.stats.headingCount}</strong> 个</span>
              <span>列表: <strong className="text-slate-200">{inspection.stats.listCount}</strong> 项</span>
              <span>公式: <strong className="text-slate-200">{inspection.stats.mathBlockCount}</strong> 处</span>
              <span>代码块: <strong className="text-slate-200">{inspection.stats.codeBlockCount}</strong> 个</span>
            </div>

            {/* Success toast after fix */}
            {fixToast && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{fixToast}</span>
              </div>
            )}

            {/* Collapsible Issue list */}
            {showDetails && inspection.issues.length > 0 && (
              <div className="space-y-2 pt-1">
                {inspection.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        {issue.severity === 'error' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">
                            渲染风险
                          </span>
                        ) : issue.severity === 'warning' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                            引用失效风险
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400">
                            格式优化
                          </span>
                        )}
                        {issue.title}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {issue.count} 处
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {issue.description}
                    </p>
                    {issue.examples.length > 0 && (
                      <div className="mt-1 p-1.5 bg-slate-950 rounded font-mono text-[10px] text-slate-300 overflow-x-auto space-y-0.5">
                        {issue.examples.map((ex, idx) => (
                          <div key={idx} className="truncate">
                            • {ex}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Streaming Real-time output terminal view */}
        {isLoading && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs text-indigo-300 font-medium gap-3">
              <span className="flex items-center gap-1.5 truncate min-w-0">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                <span className="truncate">AI 正在实时提炼生成知识点与考题中...</span>
              </span>
              <span className="flex items-center gap-1 text-slate-400 shrink-0 font-mono">
                <Clock className="w-3.5 h-3.5" /> 已耗时 {elapsedSeconds} 秒
              </span>
            </div>

            <div 
              ref={streamLogRef}
              className="w-full h-44 p-3.5 bg-slate-950 border border-indigo-500/30 rounded-xl font-mono text-[11px] text-slate-300 overflow-y-auto leading-relaxed whitespace-pre-wrap select-text shadow-inner"
            >
              {streamLog ? (
                <span>{streamLog}</span>
              ) : (
                <span className="text-slate-600 italic flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5" /> 等待 AI 首个字符返回...
                </span>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!noteText.trim() || isLoading}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 text-base transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              正在实时生成题库中...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              一键开始分类聚合与生成复习题
            </>
          )}
        </button>
      </form>
    </div>
  );
};
