import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Strips unnecessary backslash escapes from AI-generated or raw markdown text
 * (e.g. 1\.2\.3 -> 1.2.3, \* -> *)
 */
export function cleanMarkdownEscapes(text: string): string {
  if (!text) return '';
  // Clean backslashes before punctuation like \. , \- , \_ when not inside a LaTeX command
  return text.replace(/\\([.\-_*#`])/g, '$1');
}

/**
 * Rock-solid Markdown & LaTeX renderer:
 * 1. Safely replaces LaTeX formulas directly with KaTeX HTML
 * 2. Formats markdown headings, bold text, lists, and inline code
 */
export function renderRichMarkdownAndLatex(rawText: string): string {
  if (!rawText) return '';

  let text = cleanMarkdownEscapes(rawText);

  // 1. Normalize LaTeX delimiters
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, '$$$1$$');
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, '$$$$$1$$$$');
  text = text.replace(/^\$\s*\n([\s\S]+?)\n\s*\$$/gm, '$$$$$1$$$$');

  // 2. Direct KaTeX rendering for Block math $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_match, math) => {
    try {
      const html = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return `<div class="my-2.5 flex justify-center overflow-x-auto py-1">${html}</div>`;
    } catch {
      return `<div class="text-red-400 font-mono my-1">${math}</div>`;
    }
  });

  // 3. Direct KaTeX rendering for Inline math $...$
  text = text.replace(/\$([^\$\n]+?)\$/g, (_match, math) => {
    try {
      const html = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return `<span class="inline-block mx-0.5 align-middle">${html}</span>`;
    } catch {
      return `<span class="text-red-400 font-mono">${math}</span>`;
    }
  });

  // 4. Format Markdown syntax line by line
  const lines = text.split('\n');
  const formattedLines = lines.map((line) => {
    let l = line;

    // Headings
    if (/^###\s+/.test(l)) {
      const content = l.replace(/^###\s+/, '');
      return `<h3 class="text-xs font-bold text-indigo-300 mt-2.5 mb-1">${content}</h3>`;
    }
    if (/^##\s+/.test(l)) {
      const content = l.replace(/^##\s+/, '');
      return `<h2 class="text-sm font-bold text-slate-100 mt-3.5 mb-1.5 pb-0.5 border-b border-slate-800/60">${content}</h2>`;
    }
    if (/^#\s+/.test(l)) {
      const content = l.replace(/^#\s+/, '');
      return `<h1 class="text-base font-black text-white mt-4 mb-2 pb-1 border-b border-slate-700">${content}</h1>`;
    }

    // Bold text: **text** or __text__
    l = l.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-amber-200">$1</strong>');
    l = l.replace(/__(.*?)__/g, '<strong class="font-bold text-amber-200">$1</strong>');

    // Inline code `code`
    l = l.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-950 text-indigo-300 rounded font-mono text-[11px] border border-slate-800">$1</code>');

    // Unordered lists (- or *)
    if (/^[\*\-]\s+/.test(l)) {
      const content = l.replace(/^[\*\-]\s+/, '');
      return `<div class="flex items-start gap-2 my-0.5 pl-1"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span><span class="flex-1">${content}</span></div>`;
    }

    // Ordered list (1. 2.)
    if (/^\d+\.\s+/.test(l)) {
      const match = l.match(/^(\d+)\.\s+(.*)/);
      if (match) {
        return `<div class="flex items-start gap-2 my-0.5 pl-1"><span class="text-indigo-400 font-bold shrink-0">${match[1]}.</span><span class="flex-1">${match[2]}</span></div>`;
      }
    }

    return l;
  });

  return formattedLines.join('\n');
}
