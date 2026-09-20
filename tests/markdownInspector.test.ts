import { describe, it, expect } from 'bun:test';
import { inspectMarkdown, fixMarkdownIssues } from '../src/utils/markdownInspector';

describe('markdownInspector', () => {
  describe('inspectMarkdown', () => {
    it('handles empty or blank text gracefully', () => {
      const res = inspectMarkdown('');
      expect(res.score).toBe(100);
      expect(res.status).toBe('clean');
      expect(res.issues.length).toBe(0);
      expect(res.canAutoFix).toBe(false);
    });

    it('detects AI platform escape characters', () => {
      const text = `\\# 一级标题\n\\- 列表项1\n\\| 表头 \\|\n\\$E = mc^2\\$`;
      const res = inspectMarkdown(text);
      const aiIssue = res.issues.find((i) => i.type === 'ai_escape');
      expect(aiIssue).toBeDefined();
      expect(aiIssue?.count).toBeGreaterThan(0);
      expect(res.canAutoFix).toBe(true);
      expect(res.status).not.toBe('clean');
    });

    it('detects headings lacking space', () => {
      const text = `#高数核心考点\n##极限的性质\n###无界变量`;
      const res = inspectMarkdown(text);
      const headingIssue = res.issues.find((i) => i.type === 'heading');
      expect(headingIssue).toBeDefined();
      expect(headingIssue?.count).toBe(3);
    });

    it('detects lists lacking space', () => {
      const text = `-第一条\n*第二条\n+第三条\n1.第四条`;
      const res = inspectMarkdown(text);
      const listIssue = res.issues.find((i) => i.type === 'list');
      expect(listIssue).toBeDefined();
      expect(listIssue?.count).toBe(4);
    });

    it('detects unclosed code blocks', () => {
      const text = `正文说明\n\`\`\`typescript\nconst a = 1;\n`;
      const res = inspectMarkdown(text);
      const codeIssue = res.issues.find((i) => i.type === 'codeblock');
      expect(codeIssue).toBeDefined();
      expect(codeIssue?.severity).toBe('error');
    });

    it('detects unclosed math blocks', () => {
      const text = `公式如下：\n$$\n\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1\n`;
      const res = inspectMarkdown(text);
      const mathIssue = res.issues.find((i) => i.type === 'math');
      expect(mathIssue).toBeDefined();
      expect(mathIssue?.severity).toBe('error');
    });

    it('detects invisible characters (BOM, zero-width, NBSP)', () => {
      const text = `\uFEFF包含BOM\u200B和零宽字符\u00A0以及NBSP`;
      const res = inspectMarkdown(text);
      const specialIssue = res.issues.find((i) => i.type === 'special_char');
      expect(specialIssue).toBeDefined();
      expect(specialIssue?.count).toBe(3);
    });

    it('detects Obsidian syntax extensions', () => {
      const text = `参考笔记 [[微积分|高等数学上册]] 以及 ==重要结论==`;
      const res = inspectMarkdown(text);
      const obsIssue = res.issues.find((i) => i.type === 'external_syntax');
      expect(obsIssue).toBeDefined();
      expect(obsIssue?.count).toBe(2);
    });
  });

  describe('fixMarkdownIssues', () => {
    it('fixes AI platform escapes without corrupting LaTeX math commands', () => {
      const raw = `\\# 极限与连续\n\\- 重要极限：\\$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1\\$\n\\- 矩阵：$$\\begin{matrix} 1 & 0 \\\\ 0 & 1 \\end{matrix}$$\n\\| 列1 \\| 列2 \\|`;
      const { fixedText, fixedCount } = fixMarkdownIssues(raw);

      expect(fixedCount).toBeGreaterThan(0);
      // Headings & lists fixed
      expect(fixedText).toContain('# 极限与连续');
      expect(fixedText).toContain('- 重要极限：');
      expect(fixedText).toContain('| 列1 | 列2 |');
      // Escaped math recovered to standard math
      expect(fixedText).toContain('$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$');
      // LaTeX commands preserved exactly
      expect(fixedText).toContain('\\frac{\\sin x}{x}');
      expect(fixedText).toContain('\\lim_{x \\to 0}');
      expect(fixedText).toContain('\\begin{matrix} 1 & 0 \\\\ 0 & 1 \\end{matrix}');
    });

    it('fixes missing spaces in headings and lists', () => {
      const raw = `#标题一\n##标题二\n-条目1\n*条目2\n+条目3\n1.条目4`;
      const { fixedText } = fixMarkdownIssues(raw);

      expect(fixedText).toContain('# 标题一');
      expect(fixedText).toContain('## 标题二');
      expect(fixedText).toContain('- 条目1');
      expect(fixedText).toContain('* 条目2');
      expect(fixedText).toContain('+ 条目3');
      expect(fixedText).toContain('1. 条目4');
    });

    it('converts Obsidian wikilinks and highlights', () => {
      const raw = `详见 [[考点一|极限定义]] 和 [[导数基本公式]]，注意 ==夹逼准则==`;
      const { fixedText } = fixMarkdownIssues(raw);

      expect(fixedText).toContain('详见 极限定义 和 导数基本公式，注意 **夹逼准则**');
      expect(fixedText).not.toContain('[[');
      expect(fixedText).not.toContain('==');
    });

    it('strips BOM and zero-width characters and converts NBSP', () => {
      const raw = `\uFEFF开头\u200B中间\u00A0结尾`;
      const { fixedText } = fixMarkdownIssues(raw);

      expect(fixedText).toBe('开头中间 结尾');
      expect(fixedText).not.toContain('\uFEFF');
      expect(fixedText).not.toContain('\u200B');
      expect(fixedText).not.toContain('\u00A0');
    });

    it('auto-closes unclosed code blocks', () => {
      const raw = `代码示例：\n\`\`\`python\nprint("hello")`;
      const { fixedText } = fixMarkdownIssues(raw);

      expect(fixedText.trimEnd().endsWith('```')).toBe(true);
      const res = inspectMarkdown(fixedText);
      expect(res.issues.find((i) => i.type === 'codeblock')).toBeUndefined();
    });

    it('preserves code blocks content unchanged during prose escaping cleanups', () => {
      const raw = `\`\`\`bash\n# this is a comment with \\# and \\- and \\$\n\`\`\``;
      const { fixedText } = fixMarkdownIssues(raw);

      expect(fixedText).toBe(raw);
    });
  });
});
