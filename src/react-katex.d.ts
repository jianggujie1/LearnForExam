declare module 'react-katex' {
  import * as React from 'react';
  export interface MathProps {
    math: string;
    children?: React.ReactNode;
    renderError?: (error: Error | TypeError) => React.ReactNode;
    errorColor?: string;
  }
  export const InlineMath: React.FC<MathProps>;
  export const BlockMath: React.FC<MathProps>;
}
