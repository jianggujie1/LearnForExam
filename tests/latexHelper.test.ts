import { describe, test, expect } from 'bun:test';
import katex from 'katex';
import { normalizeMarkdownAndMath } from '../src/utils/latexHelper';
import { isNodeMatched, getNodeText, computeSimilarity, rehypeBestMatchPlugin } from '../src/components/NoteSplitViewer';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';

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

    expect(getNodeText(mockMathHastNode).trim()).toBe('$(u \\pm v)\' = u\' \\pm v\'$');
    expect(isNodeMatched(mockMathHastNode, '(u ± v)\' = u\' ± v\'')).toBe(true);
    expect(isNodeMatched(mockMathHastNode, '(u \\pm v)\' = u\' \\pm v\'')).toBe(true);
    expect(isNodeMatched(mockMathHastNode, '导数运算法则')).toBe(false);
  });

  test('accurately locates Lagrange Mean Value Theorem without confusing with Rolle or Cauchy', () => {
    const targetLagrange = "若 $f(x)$ 在 $[a,b]$ 连续、$(a,b)$ 可导，则 $\\exists \\xi \\in (a,b)$，使得：$f(b) - f(a) = f'(\\xi)(b-a)$";

    const rolleNode = {
      type: 'element',
      tagName: 'p',
      children: [
        { type: 'text', value: '若 ' },
        { type: 'element', tagName: 'span', properties: { className: ['katex'] }, children: [{ type: 'element', tagName: 'annotation', children: [{ type: 'text', value: 'f(x)' }] }] },
        { type: 'text', value: ' 在 ' },
        { type: 'element', tagName: 'span', properties: { className: ['katex'] }, children: [{ type: 'element', tagName: 'annotation', children: [{ type: 'text', value: '[a,b]' }] }] },
        { type: 'text', value: ' 连续、' },
        { type: 'element', tagName: 'span', properties: { className: ['katex'] }, children: [{ type: 'element', tagName: 'annotation', children: [{ type: 'text', value: '(a,b)' }] }] },
        { type: 'text', value: ' 可导，且 ' },
        { type: 'element', tagName: 'span', properties: { className: ['katex'] }, children: [{ type: 'element', tagName: 'annotation', children: [{ type: 'text', value: 'f(a) = f(b)' }] }] },
        { type: 'text', value: '，则 ' },
        { type: 'element', tagName: 'span', properties: { className: ['katex'] }, children: [{ type: 'element', tagName: 'annotation', children: [{ type: 'text', value: '\\exists \\xi \\in (a,b)' }] }] },
        { type: 'text', value: '，使得：' },
      ],
    };

    const lagrangeNode = {
      type: 'element',
      tagName: 'p',
      children: [
        { type: 'text', value: '若 ' },
        { type: 'element', tagName: 'span', properties: { className: ['katex'] }, children: [{ type: 'element', tagName: 'annotation', children: [{ type: 'text', value: 'f(x)' }] }] },
        { type: 'text', value: ' 在 ' },
        { type: 'element', tagName: 'span', properties: { className: ['katex'] }, children: [{ type: 'element', tagName: 'annotation', children: [{ type: 'text', value: '[a,b]' }] }] },
        { type: 'text', value: ' 连续、' },
        { type: 'element', tagName: 'span', properties: { className: ['katex'] }, children: [{ type: 'element', tagName: 'annotation', children: [{ type: 'text', value: '(a,b)' }] }] },
        { type: 'text', value: ' 可导，则 ' },
        { type: 'element', tagName: 'span', properties: { className: ['katex'] }, children: [{ type: 'element', tagName: 'annotation', children: [{ type: 'text', value: '\\exists \\xi \\in (a,b)' }] }] },
        { type: 'text', value: '，使得：' },
      ],
    };

    const lagrangeFormulaNode = {
      type: 'element',
      tagName: 'span',
      properties: { className: ['katex-display'] },
      children: [
        {
          type: 'element',
          tagName: 'annotation',
          children: [{ type: 'text', value: "f(b) - f(a) = f'(\\xi)(b-a)" }],
        },
      ],
    };

    const cauchyFormulaNode = {
      type: 'element',
      tagName: 'span',
      properties: { className: ['katex-display'] },
      children: [
        {
          type: 'element',
          tagName: 'annotation',
          children: [{ type: 'text', value: "\\frac{f(b)-f(a)}{g(b)-g(a)} = \\frac{f'(\\xi)}{g'(\\xi)}" }],
        },
      ],
    };

    expect(isNodeMatched(lagrangeNode, targetLagrange)).toBe(true);
    expect(isNodeMatched(lagrangeFormulaNode, targetLagrange)).toBe(true);
    expect(isNodeMatched(rolleNode, targetLagrange)).toBe(false);
    expect(isNodeMatched(cauchyFormulaNode, targetLagrange)).toBe(false);
  });
  test('accurately locates multi-item bullet list quote', () => {
    const target = 'FFN 可以： - 学习任意非线性函数 - 创建新的特征组合 - 应用位置级变换';

    const li1 = {
      type: 'element',
      tagName: 'li',
      children: [{ type: 'text', value: '学习任意非线性函数' }],
    };
    const li2 = {
      type: 'element',
      tagName: 'li',
      children: [{ type: 'text', value: '创建新的特征组合' }],
    };
    const li3 = {
      type: 'element',
      tagName: 'li',
      children: [{ type: 'text', value: '应用位置级变换' }],
    };
    const pIntro = {
      type: 'element',
      tagName: 'p',
      children: [{ type: 'text', value: '能力：FFN可以：' }],
    };
    const unrelatedLi = {
      type: 'element',
      tagName: 'li',
      children: [{ type: 'text', value: '学习复杂的非线性模式' }],
    };

    expect(isNodeMatched(li1, target)).toBe(true);
    expect(isNodeMatched(li2, target)).toBe(true);
    expect(isNodeMatched(li3, target)).toBe(true);
    expect(isNodeMatched(pIntro, target)).toBe(true);
    expect(isNodeMatched(unrelatedLi, target)).toBe(false);
  });
});

describe('Global Best Match Rehype Plugin', () => {
  test('Image 1: accurately highlights ONLY 1.2.2 and excludes 1.2.1', () => {
    const note = `
## 1.2 函数极限（核心定义）

### 1.2.1 自变量趋于有限值的极限
设函数 $f(x)$ 在 $x0$ 某去心邻域有定义，若对任意 $\\varepsilon > 0$，存在 $\\delta > 0$，当 $0 < |x - x0| < \\delta$ 时，有 $|f(x) - A| < \\varepsilon$，则：
$$
\\lim_{x \\to x0} f(x) = A
$$

### 1.2.2 左右极限
左极限：$\\lim_{x \\to x_0^-} f(x) = A$
右极限：$\\lim_{x \\to x_0^+} f(x) = A$
极限存在充要条件：$\\lim_{x \\to x_0^-} f(x) = \\lim_{x \\to x_0^+} f(x) = A$
`;

    const target = "极限存在充要条件：\\lim_{x \\to x_0^-} f(x) = \\lim_{x \\to x_0^+} f(x) = A";

    const processor = unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex, { throwOnError: false, strict: false })
      .use(rehypeBestMatchPlugin, { target });

    const hast = processor.runSync(processor.parse(note));
    const highlighted = hast.children.filter((c: any) => c.properties?.className?.includes('highlight-target'));

    expect(highlighted.length).toBe(1);
    const text = getNodeText(highlighted[0]);
    expect(text).toContain('极限存在充要条件');
    expect(text).not.toContain('1.2.1');
  });

  test('Image 2: accurately highlights 1.3.2 section with all formula blocks and excludes 1.3.1', () => {
    const note = `
## 1.3 无穷小与无穷大

### 1.3.1 定义
无穷小：$\\lim_{x \\to \\square} f(x) = 0$
无穷大：$\\lim_{x \\to \\square} |f(x)| = +\\infty$

### 1.3.2 等价无穷小（高频考点，\\xto0）
$$
\\sin x \\sim x, \\quad \\tan x \\sim x, \\quad \\arcsin x \\sim x, \\quad \\arctan x \\sim x
$$
$$
\\ln(1+x) \\sim x, \\quad e^x - 1 \\sim x, \\quad 1 - \\cos x \\sim \\frac{1}{2}x^2
$$
$$
(1+x)^\\alpha - 1 \\sim \\alpha x
$$

## 1.4 两个重要极限
第一重要极限：$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$
`;

    const target = "等价无穷小（高频考点，x \\to 0）：\\sin x \\sim x, \\tan x \\sim x, \\arcsin x \\sim x, \\arctan x \\sim x; \\ln(1+x) \\sim x, e^x - 1 \\sim x, 1 - \\cos x \\sim \\frac{1}{2}x^2; (1+x)^\\alpha - 1 \\sim \\alpha x";

    const processor = unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex, { throwOnError: false, strict: false })
      .use(rehypeBestMatchPlugin, { target });

    const hast = processor.runSync(processor.parse(note));
    const highlighted = hast.children.filter((c: any) => c.properties?.className?.includes('highlight-target'));

    expect(highlighted.length).toBeGreaterThanOrEqual(1);
    const combinedText = highlighted.map((h: any) => getNodeText(h)).join(' ');
    expect(combinedText).toContain('1.3.2 等价无穷小');
    expect(combinedText).not.toContain('1.3.1');
    expect(combinedText).not.toContain('1.4');
  });

  test('produces no highlights when target is empty', () => {
    const note = `# 标题\n一段普通的笔记文本。\n$$x^2 + y^2 = 1$$`;
    const processor = unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex, { throwOnError: false, strict: false })
      .use(rehypeBestMatchPlugin, { target: '' });

    const hast = processor.runSync(processor.parse(note)) as unknown as {
      children: Array<{ properties?: { className?: string[] } }>;
    };
    const highlighted = hast.children.filter((c) => c.properties?.className?.includes('highlight-target'));
    expect(highlighted.length).toBe(0);
  });
});
