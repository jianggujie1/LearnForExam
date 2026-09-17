import React from 'react';
import 'katex/dist/katex.min.css';
import { renderRichMarkdownAndLatex } from '../utils/latexHelper';

interface FormattedTextProps {
  content: string;
  className?: string;
}

/**
 * Universal LaTeX and Markdown renderer
 */
export const FormattedMathText: React.FC<FormattedTextProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const html = renderRichMarkdownAndLatex(content);

  return (
    <span
      className={`inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
