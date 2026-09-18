import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { FormattedMathText } from './FormattedMathText';
import { normalizeMarkdownAndMath } from '../utils/latexHelper';
import { BookOpen, Search, Copy, Check, FileText, Code } from 'lucide-react';

interface NoteSplitViewerProps {
  rawNote: string;
  highlightQuote?: string;
  isOpen: boolean;
  onToggle: () => void;
}

interface HastTextNode {
  type: 'text';
  value: string;
}

interface HastParentNode {
  children: unknown[];
}

function isHastTextNode(node: unknown): node is HastTextNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    node.type === 'text' &&
    'value' in node &&
    typeof node.value === 'string'
  );
}

function isHastParentNode(node: unknown): node is HastParentNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    'children' in node &&
    Array.isArray(node.children)
  );
}

/**
 * Recursively extracts plain text from an AST node (including KaTeX formulas and table cells).
 */
export function getNodeText(node: unknown): string {
  if (!node) return '';
  if (isHastTextNode(node)) {
    return node.value;
  }
  if (isHastParentNode(node)) {
    return node.children.map(getNodeText).join('');
  }
  return '';
}
/**
 * Checks if an AST node's text matches the highlight/search target.
 * Supports direct match, punctuation/space stripped comparison, and keyword prefix matching.
 */
export function isNodeMatched(node: unknown, target: string): boolean {
  if (!target || !node) return false;
  const rawTarget = target.trim();
  if (!rawTarget) return false;

  const nodeText = getNodeText(node);
  if (!nodeText) return false;

  // 1. Direct case-insensitive match
  if (nodeText.toLowerCase().includes(rawTarget.toLowerCase())) {
    return true;
  }

  // 2. Normalized match (stripping markdown/latex characters, spaces, and punctuation)
  const cleanTarget = rawTarget
    .replace(/[\$\*\#\`\s\\.,;:!?，。！？（）()[\]{}"'\u201c\u201d\u2018\u2019]/g, '')
    .toLowerCase();
  const cleanNode = nodeText
    .replace(/[\$\*\#\`\s\\.,;:!?，。！？（）()[\]{}"'\u201c\u201d\u2018\u2019]/g, '')
    .toLowerCase();

  if (!cleanTarget) return false;

  if (cleanNode.includes(cleanTarget)) {
    return true;
  }

  // 3. Bidirectional and prefix match for longer targets
  if (cleanTarget.length > 5 && cleanNode.length > 5) {
    if (cleanTarget.includes(cleanNode)) return true;
    const prefix = cleanTarget.slice(0, Math.min(8, cleanTarget.length));
    if (cleanNode.includes(prefix)) return true;
  }

  // 4. Ellipsis match for quoted excerpts (e.g. "Vite ... 迅速")
  if (rawTarget.includes('...') || rawTarget.includes('…')) {
    const parts = rawTarget
      .split(/\.{2,}|…/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 2);
    if (parts.length >= 2 && parts.every((p) => nodeText.toLowerCase().includes(p.toLowerCase()))) {
      return true;
    }
  }

  // 5. Multi-word space-separated keyword match (e.g. "React Vite")
  const words = rawTarget.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length >= 2 && words.every((w) => nodeText.toLowerCase().includes(w.toLowerCase()))) {
    return true;
  }
  return false;
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

  const target = (highlightQuote || searchTerm || '').trim();

  // Normalize note content (cleaning escapes, standardizing LaTeX delimiters)
  const normalizedNote = normalizeMarkdownAndMath(rawNote || '');

  // Smooth scroll to highlight target
  useEffect(() => {
    if (!target || !isOpen || viewMode !== 'rendered') return;

    const timer = setTimeout(() => {
      const targetElem = scrollContainerRef.current?.querySelector('.highlight-target');
      if (targetElem) {
        targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [target, isOpen, viewMode, normalizedNote]);

  const components = useMemo<Components>(() => {
    const highlightCls =
      'highlight-target bg-amber-400/20 border-l-4 border-amber-400 pl-3 py-1 text-amber-100 shadow-lg ring-1 ring-amber-400/30 rounded-r-lg';

    return {
      // Headings
      h1: ({ node, children, className = '', ...props }) => {
        const isMatched = isNodeMatched(node, target);
        return (
          <h1
            {...props}
            className={`text-lg font-black text-white mt-5 mb-2.5 pb-1.5 border-b border-slate-700/80 ${
              isMatched ? highlightCls : ''
            } ${className}`}
          >
            {children}
          </h1>
        );
      },
      h2: ({ node, children, className = '', ...props }) => {
        const isMatched = isNodeMatched(node, target);
        return (
          <h2
            {...props}
            className={`text-base font-bold text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-800/80 ${
              isMatched ? highlightCls : ''
            } ${className}`}
          >
            {children}
          </h2>
        );
      },
      h3: ({ node, children, className = '', ...props }) => {
        const isMatched = isNodeMatched(node, target);
        return (
          <h3
            {...props}
            className={`text-sm font-bold text-indigo-300 mt-3.5 mb-1.5 ${
              isMatched ? highlightCls : ''
            } ${className}`}
          >
            {children}
          </h3>
        );
      },
      h4: ({ node, children, className = '', ...props }) => {
        const isMatched = isNodeMatched(node, target);
        return (
          <h4
            {...props}
            className={`text-xs font-semibold text-indigo-400/90 mt-3 mb-1 ${
              isMatched ? highlightCls : ''
            } ${className}`}
          >
            {children}
          </h4>
        );
      },
      h5: ({ node, children, className = '', ...props }) => {
        const isMatched = isNodeMatched(node, target);
        return (
          <h5
            {...props}
            className={`text-xs font-medium text-slate-300 mt-2.5 mb-1 ${
              isMatched ? highlightCls : ''
            } ${className}`}
          >
            {children}
          </h5>
        );
      },
      h6: ({ node, children, className = '', ...props }) => {
        const isMatched = isNodeMatched(node, target);
        return (
          <h6
            {...props}
            className={`text-[11px] font-medium text-slate-400 mt-2 mb-1 ${
              isMatched ? highlightCls : ''
            } ${className}`}
          >
            {children}
          </h6>
        );
      },

      // Paragraphs & Quotes
      p: ({ node, children, className = '', ...props }) => {
        const isMatched = isNodeMatched(node, target);
        return (
          <p
            {...props}
            className={`my-2 leading-relaxed text-slate-300 text-xs ${
              isMatched ? highlightCls : ''
            } ${className}`}
          >
            {children}
          </p>
        );
      },
      blockquote: ({ node, children, className = '', ...props }) => {
        const isMatched = isNodeMatched(node, target);
        return (
          <blockquote
            {...props}
            className={`my-3 pl-3.5 border-l-2 border-indigo-500/60 text-slate-400 italic bg-slate-950/40 py-1 rounded-r-lg ${
              isMatched ? highlightCls : ''
            } ${className}`}
          >
            {children}
          </blockquote>
        );
      },

      // Lists
      ul: ({ node, children, className = '', ...props }) => (
        <ul {...props} className={`list-disc list-inside my-2 space-y-1 text-slate-300 pl-1 ${className}`}>
          {children}
        </ul>
      ),
      ol: ({ node, children, className = '', ...props }) => (
        <ol {...props} className={`list-decimal list-inside my-2 space-y-1 text-slate-300 pl-1 ${className}`}>
          {children}
        </ol>
      ),
      li: ({ node, children, className = '', ...props }) => {
        const isMatched = isNodeMatched(node, target);
        return (
          <li
            {...props}
            className={`my-0.5 leading-relaxed ${
              isMatched
                ? 'highlight-target bg-amber-400/20 border-l-4 border-amber-400 pl-2.5 py-0.5 text-amber-100 shadow-lg ring-1 ring-amber-400/30 rounded-r-lg'
                : ''
            } ${className}`}
          >
            {children}
          </li>
        );
      },

      // GFM Tables
      table: ({ node, children, className = '', ...props }) => (
        <div className="overflow-x-auto my-3 rounded-xl border border-slate-800 shadow-md">
          <table {...props} className={`w-full text-left border-collapse text-xs ${className}`}>
            {children}
          </table>
        </div>
      ),
      thead: ({ node, children, className = '', ...props }) => (
        <thead {...props} className={`bg-slate-950/80 text-slate-200 border-b border-slate-800 font-semibold ${className}`}>
          {children}
        </thead>
      ),
      tbody: ({ node, children, className = '', ...props }) => (
        <tbody {...props} className={`divide-y divide-slate-800/60 bg-slate-900/40 ${className}`}>
          {children}
        </tbody>
      ),
      tr: ({ node, children, className = '', ...props }) => {
        const isMatched = isNodeMatched(node, target);
        return (
          <tr
            {...props}
            className={`transition-colors ${
              isMatched
                ? 'highlight-target bg-amber-400/25 text-amber-100 ring-1 ring-amber-400/40'
                : 'hover:bg-slate-800/40'
            } ${className}`}
          >
            {children}
          </tr>
        );
      },
      th: ({ node, children, className = '', ...props }) => (
        <th {...props} className={`px-3 py-2 text-slate-300 font-medium text-[11px] ${className}`}>
          {children}
        </th>
      ),
      td: ({ node, children, className = '', ...props }) => (
        <td {...props} className={`px-3 py-2 text-slate-300 text-xs ${className}`}>
          {children}
        </td>
      ),

      // Code blocks & inline code
      pre: ({ node, children, className = '', ...props }) => {
        const isMatched = isNodeMatched(node, target);
        return (
          <pre
            {...props}
            className={`p-3.5 border rounded-xl font-mono text-[11px] overflow-x-auto my-3 transition-all ${
              isMatched
                ? 'highlight-target bg-amber-400/20 border-amber-400 text-amber-100 shadow-lg ring-1 ring-amber-400/30'
                : 'bg-slate-950 border-slate-800 text-slate-200'
            } ${className}`}
          >
            {children}
          </pre>
        );
      },
      code: ({ node, className = '', children, ...props }) => {
        const isInline = !className?.includes('language-') && !String(children).includes('\n');
        if (isInline) {
          return (
            <code
              {...props}
              className={`px-1.5 py-0.5 bg-slate-950 text-indigo-300 rounded font-mono text-[11px] border border-slate-800 ${className}`}
            >
              {children}
            </code>
          );
        }
        return (
          <code {...props} className={className}>
            {children}
          </code>
        );
      },

      // Typography
      strong: ({ node, children, className = '', ...props }) => (
        <strong {...props} className={`font-bold text-amber-200 ${className}`}>
          {children}
        </strong>
      ),
      em: ({ node, children, className = '', ...props }) => (
        <em {...props} className={`italic text-slate-200 ${className}`}>
          {children}
        </em>
      ),
      a: ({ node, children, className = '', ...props }) => (
        <a
          {...props}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-indigo-400 hover:text-indigo-300 underline underline-offset-2 ${className}`}
        >
          {children}
        </a>
      ),
      hr: ({ node, className = '', ...props }) => (
        <hr {...props} className={`my-4 border-slate-800 ${className}`} />
      ),
      // Math display container highlight support
      span: ({ node, children, className = '', ...props }) => {
        const classStr = Array.isArray(className) ? className.join(' ') : String(className || '');
        const isDisplay = classStr.includes('katex-display');
        const isMatched = isDisplay ? isNodeMatched(node, target) : false;
        return (
          <span
            {...props}
            className={`${classStr} ${
              isMatched
                ? 'highlight-target block my-2 p-2 bg-amber-400/20 border-l-4 border-amber-400 text-amber-100 shadow-lg ring-1 ring-amber-400/30 rounded-r-lg'
                : ''
            }`.trim()}
          >
            {children}
          </span>
        );
      },
      div: ({ node, children, className = '', ...props }) => {
        const classStr = Array.isArray(className) ? className.join(' ') : String(className || '');
        const isDisplay = classStr.includes('math-display') || classStr.includes('katex-display');
        const isMatched = isDisplay ? isNodeMatched(node, target) : false;
        return (
          <div
            {...props}
            className={`${classStr} ${
              isMatched
                ? 'highlight-target block my-2 p-2 bg-amber-400/20 border-l-4 border-amber-400 text-amber-100 shadow-lg ring-1 ring-amber-400/30 rounded-r-lg'
                : ''
            }`.trim()}
          >
            {children}
          </div>
        );
      },
    };
  }, [target]);

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

      {/* Clean Markdown & LaTeX Document Viewer */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 p-5 overflow-y-auto text-xs text-slate-200 select-text leading-relaxed"
      >
        {viewMode === 'rendered' ? (
          normalizedNote ? (
            <div className="space-y-1">
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
                components={components}
              >
                {normalizedNote}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-500 italic">
              暂无笔记内容
            </div>
          )
        ) : (
          <pre className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
            {rawNote}
          </pre>
        )}
      </div>
    </aside>
  );
};
