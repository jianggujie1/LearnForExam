import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { FormattedMathText } from './FormattedMathText';
import { renderRichMarkdownAndLatex } from '../utils/latexHelper';
import { BookOpen, Search, Copy, Check, FileText, Code } from 'lucide-react';

interface NoteSplitViewerProps {
  rawNote: string;
  highlightQuote?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export const NoteSplitViewer: React.FC<NoteSplitViewerProps> = ({
  rawNote,
  highlightQuote,
  isOpen,
  onToggle,
}) => {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Split raw notes into paragraphs / semantic blocks
  const paragraphs = useMemo(() => {
    return rawNote.split(/\n\n+/).filter((p) => p.trim().length > 0);
  }, [rawNote]);

  const target = (highlightQuote || searchTerm || '').trim();

  // Find index of the matched paragraph
  const matchedIdx = useMemo(() => {
    if (!target) return -1;
    const cleanTarget = target.replace(/[\$\*\#\`\s\\]/g, '').toLowerCase();
    if (!cleanTarget) return -1;

    // 1. Direct includes
    let idx = paragraphs.findIndex((p) => p.toLowerCase().includes(target.toLowerCase()));
    if (idx !== -1) return idx;

    // 2. Normalized check
    idx = paragraphs.findIndex((p) => {
      const cleanP = p.replace(/[\$\*\#\`\s\\]/g, '').toLowerCase();
      return cleanP.includes(cleanTarget) || (cleanP.length > 5 && cleanTarget.includes(cleanP));
    });
    if (idx !== -1) return idx;

    // 3. Keyword check
    if (cleanTarget.length >= 6) {
      const prefix = cleanTarget.slice(0, 6);
      idx = paragraphs.findIndex((p) => p.replace(/[\$\*\#\`\s\\]/g, '').toLowerCase().includes(prefix));
      if (idx !== -1) return idx;
    }

    return -1;
  }, [paragraphs, target]);

  // Smooth scroll to highlight
  useEffect(() => {
    if (matchedIdx !== -1 && isOpen && scrollContainerRef.current) {
      setTimeout(() => {
        const markElem = scrollContainerRef.current?.querySelector(`[data-p-idx="${matchedIdx}"]`);
        if (markElem) {
          markElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [matchedIdx, isOpen, viewMode]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-40 bg-slate-900/95 hover:bg-slate-800 text-indigo-300 border border-indigo-500/40 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-xl flex items-center gap-2 text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
      >
        <BookOpen className="w-4 h-4 text-indigo-400" />
        <span>展开原笔记分栏对照</span>
      </button>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(rawNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <aside className="w-[460px] border-l border-slate-800/80 bg-slate-900/80 backdrop-blur-2xl flex flex-col h-full shrink-0 shadow-2xl relative z-30 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span>原始笔记对照</span>
        </div>

        {/* Toggle View */}
        <div className="flex items-center gap-1.5">
          <div className="bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex items-center text-[10px]">
            <button
              type="button"
              onClick={() => setViewMode('rendered')}
              className={`px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                viewMode === 'rendered' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3 h-3" /> 渲染排版
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                viewMode === 'raw' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3 h-3" /> 源码
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            title="复制笔记全文"
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            收起
          </button>
        </div>
      </div>

      {/* Target Quote Highlight Alert */}
      {highlightQuote && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-300">
          <div className="font-semibold mb-0.5 flex items-center gap-1">
            📍 当前题目原笔记出处锚定：
          </div>
          <div className="italic text-amber-200/90 text-[11px] line-clamp-2">
            <FormattedMathText content={highlightQuote} />
          </div>
        </div>
      )}

      {/* Search in note */}
      <div className="p-3 border-b border-slate-800/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="在原笔记中快速查找..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Clean Markdown & LaTeX Document Viewer without raw symbols */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 p-5 overflow-y-auto text-xs text-slate-200 select-text leading-relaxed space-y-2.5"
      >
        {viewMode === 'rendered' ? (
          paragraphs.map((para, idx) => {
            const isMatched = idx === matchedIdx;
            const htmlContent = renderRichMarkdownAndLatex(para);

            return (
              <div
                key={idx}
                data-p-idx={idx}
                className={`rounded-xl transition-all duration-300 p-3 ${
                  isMatched
                    ? 'bg-amber-400/20 border-l-4 border-amber-400 text-amber-100 shadow-xl ring-1 ring-amber-400/30'
                    : 'hover:bg-slate-800/30'
                }`}
              >
                <div
                  className="leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            );
          })
        ) : (
          <pre className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
            {rawNote}
          </pre>
        )}
      </div>
    </aside>
  );
};
