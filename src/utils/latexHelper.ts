import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Strips unnecessary backslash escapes from markdown text
 * (e.g. 1\.2\.3 -> 1.2.3, \* -> *)
 */
export function cleanMarkdownEscapes(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\([#\-+*|>!_`])/g, '$1')
    .replace(/\\([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])/g, '$1')
    .replace(/\\(["'])/g, '$1')
    .replace(/\\\.([ \t\n\d])/g, '.$1');
}
/**
 * Decodes common HTML and XML character entities that frequently appear in LLM output,
 * web clippers, or markdown exports (&gt;, &lt;, &amp;, &quot;, &#39;, &ge;, &le;, etc.)
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;gt;|&gt;/g, '>')
    .replace(/&amp;lt;|&lt;/g, '<')
    .replace(/&amp;ge;|&ge;/g, '\\ge ')
    .replace(/&amp;le;|&le;/g, '\\le ')
    .replace(/&amp;ne;|&ne;/g, '\\ne ')
    .replace(/&amp;times;|&times;/g, '\\times ')
    .replace(/&amp;divide;|&divide;/g, '\\div ')
    .replace(/&amp;plusmn;|&plusmn;|&pm;/g, '\\pm ')
    .replace(/&amp;infin;|&infin;/g, '\\infty ')
    .replace(/&amp;quot;|&quot;/g, '"')
    .replace(/&amp;apos;|&apos;|&#39;/g, "'")
    .replace(/&amp;nbsp;|&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&');
}

/**
 * Normalizes math formula strings before KaTeX parsing to prevent parse errors:
 * - Decodes HTML entities (&gt; -> >, etc.)
 * - Normalizes Unicode primes (′, ″) and curly quotes to ASCII quotes
 * - Cleans stray backslashes before quotes (e.g. f\'' -> f'')
 * - Replaces unescaped alignment tabs (&) outside aligned environments
 */
export function sanitizeMathFormula(math: string): string {
  if (!math) return '';
  let m = decodeHtmlEntities(math.trim());
  m = m.replace(/[\u2032\u2018\u2019]/g, "'");
  m = m.replace(/[\u2033\u201c\u201d]/g, "''");
  m = m.replace(/\\(['"])/g, '$1');
  if (!m.includes('\\begin{')) {
    m = m.replace(/&(?!=)/g, '\\&').replace(/&=/g, '=');
  }
  return m;
}

/**
 * Normalizes LaTeX formulas and Markdown syntax into standard formats
 * suitable for react-markdown with remark-math and remark-gfm.
 * - Decodes stray HTML entities (e.g. &gt; -> >, &lt; -> <)
 * - Protects code blocks from unintended delimiter replacements
 * - Cleans stray Markdown escapes (e.g. 1\.2 -> 1.2, \* -> *)
 * - Normalizes \( ... \) to $ ... $
 * - Normalizes \[ ... \] to $$ ... $$
 * - Normalizes multiline single $ blocks to $$ ... $$
 * - Sanitizes math formulas within $ and $$ delimiters
 */
export function normalizeMarkdownAndMath(rawText: string): string {
  if (!rawText) return '';

  // 1. Decode HTML entities early and normalize line endings CRLF -> LF
  let text = decodeHtmlEntities(rawText).replace(/\r\n/g, '\n');

  // 1.1 Strip BOM and zero-width characters, normalize NBSP
  text = text.replace(/\uFEFF/g, '');
  text = text.replace(/[\u200B\u200C\u200D]/g, '');
  text = text.replace(/\u00A0/g, ' ');

  // 2. Protect code blocks (both fenced ```...``` and inline `...`)
  const codeBlocks: string[] = [];
  text = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    const placeholder = `@@@CODEBLOCK_${codeBlocks.length}@@@`;
    codeBlocks.push(match);
    return placeholder;
  });

  // 2.1 Unescape AI-escaped math delimiters (\$ -> $) outside code blocks
  text = text.replace(/\\(\$+)/g, '$1');

  // 3. Normalize LaTeX inline delimiters \( ... \) -> $ ... $
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_match, math) => `$${math.trim()}$`);

  // 4. Normalize LaTeX block delimiters \[ ... \] -> $$ ... $$
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_match, math) => `\n\n$$\n${math.trim()}\n$$\n\n`);

  // 5. Normalize multiline single-dollar blocks to $$ ... $$ BEFORE touching any LaTeX environments
  text = text.replace(
    /(?:^|\n)[ \t]*\$[ \t]*\n([\s\S]+?)\n[ \t]*\$[ \t]*(?=\n|$)/g,
    (_match, math) => `\n\n$$\n${math.trim()}\n$$\n\n`
  );

  // 6. Protect all standard $$ ... $$ math blocks into placeholders
  const mathBlocks: string[] = [];
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_match, math) => {
    const placeholder = `@@@MATHBLOCK_${mathBlocks.length}@@@`;
    mathBlocks.push(math);
    return placeholder;
  });

  // 7. Wrap any remaining bare or half-delimited LaTeX environments not yet enclosed in math blocks
  text = text.replace(
    /(?:\${1,2})?[ \t]*\\begin\{\s*(aligned|matrix|pmatrix|bmatrix|vmatrix|cases|equation\*?|gather\*?|split)\s*\}([\s\S]+?)\\end\{\s*\1\s*\}[ \t]*(?:\${1,2})?/g,
    (_match, env, body) => {
      const placeholder = `@@@MATHBLOCK_${mathBlocks.length}@@@`;
      mathBlocks.push(`\\begin{${env}}${body}\\end{${env}}`);
      return placeholder;
    }
  );

  // 8. Strip unnecessary escapes outside code blocks and math blocks, and fix unseparated headings
  text = cleanMarkdownEscapes(text);
  text = text.replace(/---\s*(#+)/g, '\n\n---\n\n$1');

  // 8.1 Fix missing spaces in headings and lists outside code blocks
  text = text.replace(/^([ \t]*)(#{1,6})([^#\s\n][^\n]*)$/gm, '$1$2 $3');
  text = text.replace(/^([ \t]*)([-*+])([^\s\n\-*+][^\n]*)$/gm, '$1$2 $3');
  text = text.replace(/^([ \t]*)(\d+\.)([^\s\n][^\n]*)$/gm, '$1$2 $3');

  // 8.2 Convert Obsidian syntax
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
  text = text.replace(/==([^=\n]+)==/g, '**$1**');

  // 9. Sanitize inline math $ ... $
  text = text.replace(/\$([^\$\n]+?)\$/g, (_match, math) => `$${sanitizeMathFormula(math)}$`);

  // 10. Restore all math blocks with line-break restoration and sanitization
  text = text.replace(/@@@MATHBLOCK_(\d+)@@@/g, (_match, id) => {
    const rawMath = mathBlocks[Number(id)] ?? '';
    let cleanMath = rawMath;
    // Strip trailing spaces after \\ before newline
    cleanMath = cleanMath.replace(/\\\\[ \t]+(?=\n)/g, '\\\\');
    // Restore single backslash line breaks at end of line (e.g. x &= 1 \ \n -> x &= 1 \\\n)
    cleanMath = cleanMath.replace(/(?<=[^\\])\\[ \t]*\n/g, '\\\\\n');
    // Restore single backslash line breaks between equations on same line
    cleanMath = cleanMath.replace(/(?<=[^\\])\\\s+(?=[(\\]|[a-zA-Z0-9\\]+[\s'=~])/g, '\\\\\n');
    // Ensure \\ line breaks have a newline
    cleanMath = cleanMath.replace(/\\\\(?!\n)/g, '\\\\\n');
    const sanitized = sanitizeMathFormula(cleanMath);
    return `\n\n$$\n${sanitized.trim()}\n$$\n\n`;
  });

  // 11. Normalize excessive newlines outside code blocks
  text = text.replace(/\n{3,}/g, '\n\n');

  // 12. Restore code blocks
  text = text.replace(/@@@CODEBLOCK_(\d+)@@@/g, (_match, id) => codeBlocks[Number(id)] ?? '');

  return text;
}

/**
 * Universal & Safe Markdown & LaTeX HTML renderer
 */
export function renderRichMarkdownAndLatex(rawText: string): string {
  if (!rawText) return '';

  let text = normalizeMarkdownAndMath(rawText);

  // 1. Direct KaTeX rendering for Block math $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_match, math) => {
    const cleanMath = sanitizeMathFormula(math);
    try {
      const html = katex.renderToString(cleanMath, {
        displayMode: true,
        throwOnError: false,
      });
      if (html.includes('katex-error')) {
        return `<div class="my-2.5 flex justify-center overflow-x-auto py-1 font-mono text-indigo-300">${cleanMath}</div>`;
      }
      return `<div class="my-2.5 flex justify-center overflow-x-auto py-1">${html}</div>`;
    } catch {
      return `<div class="my-2.5 flex justify-center overflow-x-auto py-1 font-mono text-indigo-300">${cleanMath}</div>`;
    }
  });

  // 2. Direct KaTeX rendering for Inline math $...$
  text = text.replace(/\$([^\$\n]+?)\$/g, (_match, math) => {
    const cleanMath = sanitizeMathFormula(math);
    try {
      const html = katex.renderToString(cleanMath, {
        displayMode: false,
        throwOnError: false,
      });
      if (html.includes('katex-error')) {
        return `<span class="inline-block mx-0.5 font-mono text-indigo-300">${cleanMath}</span>`;
      }
      return `<span class="inline-block mx-0.5 align-middle">${html}</span>`;
    } catch {
      return `<span class="inline-block mx-0.5 font-mono text-indigo-300">${cleanMath}</span>`;
    }
  });

  // 3. Bare LaTeX commands like \frac{1}{2}x^2
  if (/^\s*\\[a-zA-Z]+/.test(text) && !text.includes('<span class="katex">')) {
    try {
      const cleanMath = sanitizeMathFormula(text);
      const html = katex.renderToString(cleanMath, {
        displayMode: false,
        throwOnError: false,
      });
      if (!html.includes('katex-error')) {
        return `<span class="inline-block mx-0.5 align-middle">${html}</span>`;
      }
    } catch {
      // ignore
    }
  }

  // 5. Format Markdown syntax line by line
  const lines = text.split('\n');
  const formattedLines = lines.map((line) => {
    let l = line;

    // Headings
    if (/^####\s+/.test(l)) {
      const content = l.replace(/^####\s+/, '');
      return `<h4 class="text-xs font-semibold text-indigo-400 mt-2 mb-1">${content}</h4>`;
    }
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
