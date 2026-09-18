import { describe, test, expect } from 'bun:test';
import katex from 'katex';
import { normalizeMarkdownAndMath } from '../src/utils/latexHelper';
import { isNodeMatched, getNodeText } from '../src/components/NoteSplitViewer';

describe('normalizeMarkdownAndMath', () => {
  test('converts multiline single-dollar aligned block to standard $$ block', () => {
    const rawNote = `
# 第二章 导数与微分

## 2.1 导数的定义与几何意义
导数定义：$f'(x_0) = \\lim_{\\Delta x \\to 0} \\frac{f(x_0+\\Delta x) - f(x_0)}{\\Delta x}$

## 2.2 基本初等函数求导公式
$
  \\begin{aligned}
  (C)' &= 0 \\quad (C为常数) \\
  (x^\\mu)' &= \\mu x^{\\mu-1} \\
  (\\sin x)' &= \\cos x \\
  (\\cos x)' &= -\\sin x \\
  (e^x)' &= e^x \\
  (a^x)' &= a^x \\ln a \\
  (\\ln x)' &= \\frac{1}{x}
  \\end{aligned}
$

## 2.3 导数的四则运算法则
$
  (u \\pm v)' = u' \\pm v'
$
`;

    const normalized = normalizeMarkdownAndMath(rawNote);

    // 1. Should not contain lone $ on its own line
    expect(normalized).not.toMatch(/(?:^|\n)\s*\$\s*(?:\n|$)/);

    // 2. Multiline single dollar in 2.2 should be promoted to $$
    expect(normalized).toContain('$$\n\\begin{aligned}');
    expect(normalized).toContain('\\end{aligned}\n$$');

    // 3. Single backslash at end of equation lines in aligned should be restored to \\
    expect(normalized).toContain('(C)\' &= 0 \\quad (C为常数) \\\\');
    expect(normalized).toContain('(x^\\mu)\' &= \\mu x^{\\mu-1} \\\\');
    expect(normalized).toContain('(\\sin x)\' &= \\cos x \\\\');
    expect(normalized).toContain('(\\cos x)\' &= -\\sin x \\\\');
    expect(normalized).toContain('(e^x)\' &= e^x \\\\');
    expect(normalized).toContain('(a^x)\' &= a^x \\ln a \\\\');
    expect(normalized).toContain('(\\ln x)\' &= \\frac{1}{x}');

    // 4. Multiline single dollar in 2.3 should also be promoted to $$
    expect(normalized).toContain('$$\n(u \\pm v)\' = u\' \\pm v\'\n$$');

    // 5. Inline formula in 2.1 should remain inline $...$
    expect(normalized).toContain('$f\'(x_0) = \\lim_{\\Delta x \\to 0} \\frac{f(x_0+\\Delta x) - f(x_0)}{\\Delta x}$');

    // 6. Verify KaTeX can render the extracted display formula without throwing
    const mathMatch = normalized.match(/\$\$\n([\s\S]+?)\n\$\$/);
    expect(mathMatch).not.toBeNull();
    const renderedHtml = katex.renderToString(mathMatch![1], {
      displayMode: true,
      throwOnError: false,
      strict: false,
    });
    expect(renderedHtml).toContain('katex-display');
  });

  test('handles bare \\begin{aligned} without any dollar signs', () => {
    const raw = `
\\begin{aligned}
x &= 1 \\
y &= 2
\\end{aligned}
`;
    const normalized = normalizeMarkdownAndMath(raw);
    expect(normalized).toContain('$$\n\\begin{aligned}');
    expect(normalized).toContain('x &= 1 \\\\\ny &= 2');
    expect(normalized).toContain('\\end{aligned}\n$$');
  });

  test('protects code blocks containing dollar signs and LaTeX', () => {
    const raw = `
\`\`\`latex
$
\\begin{aligned}
a &= b
\\end{aligned}
$
\`\`\`
Here is inline code: \`$x = 1$\`.
`;
    const normalized = normalizeMarkdownAndMath(raw);
    expect(normalized).toContain('```latex\n$\n\\begin{aligned}\na &= b\n\\end{aligned}\n$\n```');
    expect(normalized).toContain('`$x = 1$`');
  });

  test('normalizes \\[ ... \\] and \\( ... \\)', () => {
    const raw = `Inline \\(x+1\\) and block \\[E=mc^2\\]`;
    const normalized = normalizeMarkdownAndMath(raw);
    expect(normalized).toContain('$x+1$');
    expect(normalized).toContain('$$\nE=mc^2\n$$');
  });
});

describe('NoteSplitViewer isNodeMatched', () => {
  test('matches target quote within math AST node', () => {
    const mockMathHastNode = {
      type: 'element',
      tagName: 'span',
      properties: { className: ['katex-display'] },
      children: [
        {
          type: 'element',
          tagName: 'annotation',
          children: [
            {
              type: 'text',
              value: '(u \\pm v)\' = u\' \\pm v\'',
            },
          ],
        },
      ],
    };

    expect(getNodeText(mockMathHastNode)).toBe('(u \\pm v)\' = u\' \\pm v\'');
    expect(isNodeMatched(mockMathHastNode, '(u ± v)\' = u\' ± v\'')).toBe(true);
    expect(isNodeMatched(mockMathHastNode, '(u \\pm v)\' = u\' \\pm v\'')).toBe(true);
    expect(isNodeMatched(mockMathHastNode, '导数运算法则')).toBe(false);
  });
});
