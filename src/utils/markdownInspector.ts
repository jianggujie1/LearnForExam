/**
 * Markdown Inspector and Normalizer
 * Specialized in diagnosing and fixing formatting defects from external AI platforms (ChatGPT, DeepSeek, Claude)
 * and note-taking apps (Obsidian, Typora, Notion) that break KaTeX rendering and citation anchoring.
 */

export interface MarkdownIssue {
  id: string;
  type: 'ai_escape' | 'heading' | 'list' | 'codeblock' | 'math' | 'special_char' | 'external_syntax' | 'structure';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  examples: string[];
  fixable: boolean;
}

export interface MarkdownStats {
  charCount: number;
  wordCount: number;
  lineCount: number;
  headingCount: number;
  listCount: number;
  mathBlockCount: number;
  codeBlockCount: number;
  paragraphCount: number;
}

export interface MarkdownInspectionResult {
  score: number; // 0 - 100
  status: 'clean' | 'warning' | 'error';
  issues: MarkdownIssue[];
  stats: MarkdownStats;
  canAutoFix: boolean;
  totalFixableCount: number;
}

/**
 * Diagnostic check on Markdown text.
 * Detects AI escapes, missing spaces in headings/lists, unclosed blocks, BOM/zero-width chars, and Obsidian syntax.
 */
export function inspectMarkdown(text: string): MarkdownInspectionResult {
  if (!text || !text.trim()) {
    return {
      score: 100,
      status: 'clean',
      issues: [],
      stats: {
        charCount: 0,
        wordCount: 0,
        lineCount: 0,
        headingCount: 0,
        listCount: 0,
        mathBlockCount: 0,
        codeBlockCount: 0,
        paragraphCount: 0,
      },
      canAutoFix: false,
      totalFixableCount: 0,
    };
  }

  const issues: MarkdownIssue[] = [];
  const lines = text.split(/\r?\n/);
  const charCount = text.length;
  const wordCount = text.trim().split(/\s+/).length;
  const lineCount = lines.length;

  let headingCount = 0;
  let listCount = 0;
  let mathBlockCount = 0;
  let codeBlockCount = 0;
  let paragraphCount = 0;

  // 1. Check code blocks closure
  const codeBlockDelimiters = text.match(/^[ \t]*```/gm) || [];
  const unclosedCodeBlock = codeBlockDelimiters.length % 2 !== 0;
  codeBlockCount = Math.floor(codeBlockDelimiters.length / 2);

  if (unclosedCodeBlock) {
    issues.push({
      id: 'codeblock-unclosed',
      type: 'codeblock',
      severity: 'error',
      title: '代码块未闭合',
      description: '文档包含未成对的代码块定界符（```），会导致后续正文被当作代码渲染，使引用定位和排版完全失效。',
      count: 1,
      examples: ['```... (文件末尾缺少闭合的 ```)'],
      fixable: true,
    });
  }

  // 2. Check math block closure ($$ and \begin{env}...\end{env})
  // First, identify code blocks to avoid false positives inside code
  const codeProtectedText = text.replace(/```[\s\S]*?```/g, (m) => '@'.repeat(m.length));

  // Count $$ occurrences that are not escaped (\$$)
  const nonEscapedDoubleDollar = codeProtectedText.match(/(?<!\\)\$\$/g) || [];
  const unclosedMathBlock = nonEscapedDoubleDollar.length % 2 !== 0;
  mathBlockCount += Math.floor(nonEscapedDoubleDollar.length / 2);

  const beginEnvs = (codeProtectedText.match(/\\begin\{([a-zA-Z0-9*]+)\}/g) || []).map(s => s.replace(/\\begin\{|\}/g, ''));
  const endEnvs = (codeProtectedText.match(/\\end\{([a-zA-Z0-9*]+)\}/g) || []).map(s => s.replace(/\\end\{|\}/g, ''));
  const envMismatch = beginEnvs.length !== endEnvs.length;

  if (unclosedMathBlock || envMismatch) {
    const examples: string[] = [];
    if (unclosedMathBlock) examples.push('$$... 未闭合的数学公式块');
    if (envMismatch) examples.push(`\\begin{...} (${beginEnvs.length}个) 与 \\end{...} (${endEnvs.length}个) 数量不匹配`);
    issues.push({
      id: 'math-unclosed',
      type: 'math',
      severity: 'error',
      title: 'LaTeX 数学公式未闭合',
      description: '文档存在未闭合的 $$ 公式块或不匹配的 LaTeX 环境（\\begin{...}/\\end{...}），会导致 KaTeX 崩溃并报错。',
      count: (unclosedMathBlock ? 1 : 0) + (envMismatch ? Math.abs(beginEnvs.length - endEnvs.length) : 0),
      examples,
      fixable: false, // Math syntax errors inside equations should be reviewed manually or handled carefully
    });
  }

  // Count inline math ($...$)
  const inlineMathMatches = codeProtectedText.match(/(?<!\\)\$(?!\$)[^\n$]+(?<!\\)\$/g) || [];
  mathBlockCount += inlineMathMatches.length;

  // 3. Check AI platform escape artifacts (outside code blocks and valid math blocks)
  // Mask valid math blocks to examine pure prose
  let proseText = codeProtectedText;
  proseText = proseText.replace(/\$\$[\s\S]*?\$\$/g, (m) => '@'.repeat(m.length));
  proseText = proseText.replace(/(?<!\\)\$(?!\$)[^\n$]+(?<!\\)\$/g, (m) => '@'.repeat(m.length));

  // AI often escapes $ like \$ or \$\$
  const aiEscapedMath = (text.match(/\\\$+/g) || []).length;
  // AI escapes Markdown structural characters in prose: \#, \-, \+, \*, \>, \|, \_, \., \[, \], \!, \(, \)
  const aiEscapedMarkdownSymbols: string[] = [];
  const aiEscapeRegex = /\\([#\-+*|>[\]!_().])/g;
  let escapeMatch: RegExpExecArray | null;
  while ((escapeMatch = aiEscapeRegex.exec(proseText)) !== null) {
    aiEscapedMarkdownSymbols.push(escapeMatch[0]);
  }

  const totalAiEscapes = aiEscapedMath + aiEscapedMarkdownSymbols.length;
  if (totalAiEscapes > 0) {
    const examples: string[] = [];
    if (aiEscapedMath > 0) examples.push(`\\$ (被转义的数学美元符，共 ${aiEscapedMath} 处)`);
    const uniqueSymbols = Array.from(new Set(aiEscapedMarkdownSymbols)).slice(0, 5);
    if (uniqueSymbols.length > 0) examples.push(`Markdown结构转义符: ${uniqueSymbols.join(' ')}`);

    issues.push({
      id: 'ai-escapes',
      type: 'ai_escape',
      severity: 'error',
      title: '外部 AI 生成的转义符号',
      description: '文档含有大量 AI 平台（ChatGPT/DeepSeek/Claude 等）转义的反斜杠（如 \\$、\\#、\\-、\\| 等）。这会导致 KaTeX 无法识别公式、标题和列表退化为纯文本，并彻底破坏考点引用定位！',
      count: totalAiEscapes,
      examples,
      fixable: true,
    });
  }

  // 4. Check heading without space (e.g. #标题 or \##标题)
  const invalidHeadings: string[] = [];
  const headingRegex = /^[ \t]*\\?(#{1,6})([^#\s\n].*)$/;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      headingCount++;
    }
    const match = headingRegex.exec(line);
    if (match) {
      invalidHeadings.push(line.trim());
    }
  }

  if (invalidHeadings.length > 0) {
    issues.push({
      id: 'heading-missing-space',
      type: 'heading',
      severity: 'warning',
      title: '标题井号后缺少空格',
      description: 'CommonMark 规范要求 # 与标题文字之间必须有空格。缺少空格会导致 Markdown 渲染引擎将其视为普通正文，无法形成大纲层级与精准引用锚定。',
      count: invalidHeadings.length,
      examples: invalidHeadings.slice(0, 3),
      fixable: true,
    });
  }

  // 5. Check list items without space (e.g. -列表, 1.列表 or \-列表)
  const invalidLists: string[] = [];
  const listRegex = /^[ \t]*(\\?[-*+]|\\?\d+\\?\.)([^\s\n\-*+].*)$/;
  for (const line of lines) {
    if (/^[ \t]*[-*+]\s/.test(line) || /^[ \t]*\d+\.\s/.test(line)) {
      listCount++;
    }
    const match = listRegex.exec(line);
    if (match) {
      invalidLists.push(line.trim());
    }
  }

  if (invalidLists.length > 0) {
    issues.push({
      id: 'list-missing-space',
      type: 'list',
      severity: 'warning',
      title: '列表符号后缺少空格',
      description: '无序列表（-、*、+）或有序列表（1.）与内容之间缺少空格，会导致列表项被合并为一整个长段落，无法精确定位单条考点。',
      count: invalidLists.length,
      examples: invalidLists.slice(0, 3),
      fixable: true,
    });
  }

  // 6. Check invisible and anomalous characters (BOM, zero-width spaces, NBSP)
  const bomMatches = text.match(/\uFEFF/g) || [];
  const zeroWidthMatches = text.match(/[\u200B\u200C\u200D]/g) || [];
  const nbspMatches = text.match(/\u00A0/g) || [];
  const totalSpecialChars = bomMatches.length + zeroWidthMatches.length + nbspMatches.length;

  if (totalSpecialChars > 0) {
    const examples: string[] = [];
    if (bomMatches.length > 0) examples.push(`UTF-8 BOM 头 (${bomMatches.length} 处)`);
    if (zeroWidthMatches.length > 0) examples.push(`零宽不可见字符 (${zeroWidthMatches.length} 处)`);
    if (nbspMatches.length > 0) examples.push(`不间断空格 NBSP (${nbspMatches.length} 处)`);

    issues.push({
      id: 'special-chars',
      type: 'special_char',
      severity: 'warning',
      title: '包含不可见或异常字符',
      description: '文档包含 BOM 标识、零宽字符或非标准空格，会导致字符比对相似度下降，造成原句引用高亮匹配失败。',
      count: totalSpecialChars,
      examples,
      fixable: true,
    });
  }

  // 7. Check external syntax extensions (Obsidian wikilinks [[...]] and highlights ==...==)
  const wikilinks = text.match(/\[\[(.*?)\]\]/g) || [];
  const obsidianHighlights = text.match(/==([^=\n]+)==/g) || [];
  const totalExternalSyntax = wikilinks.length + obsidianHighlights.length;

  if (totalExternalSyntax > 0) {
    const examples: string[] = [];
    if (wikilinks.length > 0) examples.push(`双向链接: ${wikilinks.slice(0, 2).join(', ')}`);
    if (obsidianHighlights.length > 0) examples.push(`Obsidian高亮: ${obsidianHighlights.slice(0, 2).join(', ')}`);

    issues.push({
      id: 'external-syntax',
      type: 'external_syntax',
      severity: 'info',
      title: '外来专有语法（Obsidian/Notion）',
      description: '检测到 Obsidian 双链 [[...]] 或 ==高亮== 语法。这些语法在标准 Markdown 中无法渲染或显示为源码乱码。',
      count: totalExternalSyntax,
      examples,
      fixable: true,
    });
  }

  // 8. Check document structure & large paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  paragraphCount = paragraphs.length;
  const largeParagraphs = paragraphs.filter(p => p.trim().length > 1000);

  if (largeParagraphs.length > 0 && headingCount === 0) {
    issues.push({
      id: 'structure-large-paragraphs',
      type: 'structure',
      severity: 'info',
      title: '段落过长且缺少标题小节',
      description: '文档存在超过 1000 字且未通过标题分段的超大段落。建议使用标题或空行分段，以便题库生成时能够精确划分考点范围。',
      count: largeParagraphs.length,
      examples: [largeParagraphs[0].slice(0, 60) + '...'],
      fixable: false,
    });
  }

  // Calculate health score (0 - 100)
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'error') {
      score -= Math.min(issue.count * 15, 35);
    } else if (issue.severity === 'warning') {
      score -= Math.min(issue.count * 5, 20);
    } else if (issue.severity === 'info') {
      score -= Math.min(issue.count * 2, 10);
    }
  }
  score = Math.max(0, Math.min(100, score));

  const status: 'clean' | 'warning' | 'error' =
    score >= 90 ? 'clean' : score >= 60 ? 'warning' : 'error';

  const fixableIssues = issues.filter(i => i.fixable);
  const totalFixableCount = fixableIssues.reduce((sum, i) => sum + i.count, 0);

  return {
    score,
    status,
    issues,
    stats: {
      charCount,
      wordCount,
      lineCount,
      headingCount,
      listCount,
      mathBlockCount,
      codeBlockCount,
      paragraphCount,
    },
    canAutoFix: totalFixableCount > 0,
    totalFixableCount,
  };
}

/**
 * Automatically fixes Markdown formatting issues:
 * 1. Protects code blocks (```...``` and `...`) with placeholders.
 * 2. Recovers AI-escaped math delimiters (\$ -> $).
 * 3. Protects valid math blocks ($$...$$, $...$, \begin{env}...\end{env}) with placeholders to strictly preserve LaTeX commands!
 * 4. Cleans AI-escaped Markdown symbols (\#, \-, \+, \*, \|, \>, etc.) and backslashes before Chinese/text in prose.
 * 5. Adds missing spaces to headings (#标题 -> # 标题) and lists (-列表 -> - 列表, 1.列表 -> 1. 列表).
 * 6. Converts Obsidian [[target|alias]] -> alias, [[target]] -> target.
 * 7. Converts Obsidian ==text== -> **text**.
 * 8. Strips BOM, zero-width characters, and converts NBSP to normal space.
 * 9. Closes unclosed code blocks if necessary.
 * 10. Restores all math and code blocks losslessly.
 */
export function fixMarkdownIssues(text: string): { fixedText: string; fixedCount: number } {
  if (!text || !text.trim()) {
    return { fixedText: text, fixedCount: 0 };
  }

  let fixedCount = 0;
  let current = text;

  // Step 1: Protect code blocks
  const codeBlocks: string[] = [];
  current = current.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    const placeholder = `@@@CODEBLOCK_${codeBlocks.length}@@@`;
    codeBlocks.push(match);
    return placeholder;
  });

  // Step 2: Unescape AI-escaped math delimiters in prose
  // Example: \$E = mc^2\$ or \$\$x + y\$\$ -> $E = mc^2$ or $$x + y$$
  const escapedMathPattern = /\\(\$+)/g;
  if (escapedMathPattern.test(current)) {
    current = current.replace(escapedMathPattern, (_, dollars) => {
      fixedCount++;
      return dollars;
    });
  }

  // Step 3: Protect standard math blocks
  // Invariant: LaTeX commands like \frac, \alpha, \lim, \\ MUST BE 100% PRESERVED!
  const mathBlocks: string[] = [];
  // Protect $$...$$ blocks first
  current = current.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    const placeholder = `@@@MATHBLOCK_${mathBlocks.length}@@@`;
    mathBlocks.push(match);
    return placeholder;
  });
  // Protect \begin{env}...\end{env} blocks
  current = current.replace(/\\begin\{([a-zA-Z0-9*]+)\}[\s\S]*?\\end\{\1\}/g, (match) => {
    const placeholder = `@@@MATHBLOCK_${mathBlocks.length}@@@`;
    mathBlocks.push(match);
    return placeholder;
  });
  // Protect inline $...$ (ensure not matching empty $ or across newlines)
  current = current.replace(/(?<!\\)\$(?!\$)([^\n$]+?)(?<!\\)\$/g, (match) => {
    const placeholder = `@@@MATHBLOCK_${mathBlocks.length}@@@`;
    mathBlocks.push(match);
    return placeholder;
  });

  // Step 4: Clean AI escapes in prose
  // 4.1 Remove backslashes before Markdown structural characters: #, -, +, *, |, >, _, ., [, ], !, (, )
  current = current.replace(/\\([#\-+*|>[\]!_().])/g, (_, char) => {
    fixedCount++;
    return char;
  });

  // 4.2 Remove backslashes before CJK characters or common punctuation
  current = current.replace(/\\([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])/g, (_, char) => {
    fixedCount++;
    return char;
  });

  // 4.3 Remove standalone backslashes before quotes
  current = current.replace(/\\(["'])/g, (_, char) => {
    fixedCount++;
    return char;
  });

  // Step 5: Fix missing spaces in headings and lists
  // 5.1 Headings: #标题 -> # 标题
  current = current.replace(/^([ \t]*)(#{1,6})([^#\s\n][^\n]*)$/gm, (_, indent, hashes, rest) => {
    fixedCount++;
    return `${indent}${hashes} ${rest}`;
  });

  // 5.2 Lists: -列表 -> - 列表, *列表 -> * 列表, +列表 -> + 列表
  current = current.replace(/^([ \t]*)([-*+])([^\s\n\-*+][^\n]*)$/gm, (_, indent, bullet, rest) => {
    fixedCount++;
    return `${indent}${bullet} ${rest}`;
  });

  // 5.3 Ordered lists: 1.列表 -> 1. 列表
  current = current.replace(/^([ \t]*)(\d+\.)([^\s\n][^\n]*)$/gm, (_, indent, num, rest) => {
    fixedCount++;
    return `${indent}${num} ${rest}`;
  });

  // Step 6: Convert Obsidian syntax
  // 6.1 Wikilinks: [[target|alias]] -> alias, [[target]] -> target
  current = current.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, _target, alias) => {
    fixedCount++;
    return alias.trim();
  });
  current = current.replace(/\[\[([^\]]+)\]\]/g, (_, target) => {
    fixedCount++;
    return target.trim();
  });

  // 6.2 Obsidian highlights: ==text== -> **text**
  current = current.replace(/==([^=\n]+)==/g, (_, content) => {
    fixedCount++;
    return `**${content}**`;
  });

  // Step 7: Clean invisible characters
  // 7.1 Strip BOM
  if (current.includes('\uFEFF')) {
    current = current.replace(/\uFEFF/g, () => {
      fixedCount++;
      return '';
    });
  }

  // 7.2 Strip zero-width characters
  if (/[\u200B\u200C\u200D]/.test(current)) {
    current = current.replace(/[\u200B\u200C\u200D]/g, () => {
      fixedCount++;
      return '';
    });
  }

  // 7.3 Convert NBSP to normal space
  if (current.includes('\u00A0')) {
    current = current.replace(/\u00A0/g, () => {
      fixedCount++;
      return ' ';
    });
  }

  // Step 8: Close unclosed code blocks if necessary
  const codeDelimiters = current.match(/^[ \t]*```/gm) || [];
  if (codeDelimiters.length % 2 !== 0) {
    current = current.trimEnd() + '\n```\n';
    fixedCount++;
  }

  // Step 9: Restore math blocks and code blocks
  // Restore math blocks first
  for (let i = 0; i < mathBlocks.length; i++) {
    current = current.replace(`@@@MATHBLOCK_${i}@@@`, () => mathBlocks[i]);
  }

  // Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    current = current.replace(`@@@CODEBLOCK_${i}@@@`, () => codeBlocks[i]);
  }

  return {
    fixedText: current,
    fixedCount,
  };
}
