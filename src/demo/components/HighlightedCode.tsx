import { forwardRef } from 'react';
import { Highlight, Prism, type PrismTheme } from 'prism-react-renderer';

if (!Prism.languages.glsl) {
  Prism.languages.glsl = Prism.languages.extend('c', {
    keyword: /\b(?:attribute|bool|break|buffer|case|centroid|coherent|const|continue|default|discard|do|double|else|flat|float|for|highp|if|in|inout|int|invariant|layout|lowp|mat[234]|mediump|noperspective|out|patch|precision|precise|readonly|return|sample|sampler\w*|shared|smooth|struct|subroutine|switch|uint|uniform|varying|vec[234]|void|volatile|while|writeonly)\b/,
    builtin: /\b(?:gl_FragCoord|gl_FrontFacing|gl_InstanceID|gl_PointCoord|gl_PointSize|gl_Position|gl_VertexID)\b/,
  });
}

const codeTheme: PrismTheme = {
  plain: {
    color: 'oklch(0.88 0.025 220)',
    backgroundColor: 'transparent',
  },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: 'oklch(0.62 0.035 225)', fontStyle: 'italic' } },
    { types: ['keyword', 'selector', 'important'], style: { color: 'oklch(0.76 0.14 300)' } },
    { types: ['builtin', 'class-name', 'type'], style: { color: 'oklch(0.79 0.12 220)' } },
    { types: ['function'], style: { color: 'oklch(0.82 0.13 95)' } },
    { types: ['string', 'char', 'attr-value'], style: { color: 'oklch(0.78 0.13 155)' } },
    { types: ['number', 'boolean', 'constant'], style: { color: 'oklch(0.77 0.14 45)' } },
    { types: ['operator', 'punctuation'], style: { color: 'oklch(0.73 0.035 230)' } },
    { types: ['property', 'tag'], style: { color: 'oklch(0.75 0.13 238)' } },
  ],
};

interface HighlightedCodeProps {
  code: string;
  language: 'typescript' | 'glsl';
  className?: string;
  ariaHidden?: boolean;
}

export const HighlightedCode = forwardRef<HTMLPreElement, HighlightedCodeProps>(
  function HighlightedCode({ code, language, className, ariaHidden = false }, ref) {
    return (
      <Highlight theme={codeTheme} code={code} language={language}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre ref={ref} className={className} aria-hidden={ariaHidden || undefined}>
            <code>
              {tokens.map((line, lineIndex) => (
                <span key={lineIndex} {...getLineProps({ line })}>
                  {line.map((token, tokenIndex) => (
                    <span key={tokenIndex} {...getTokenProps({ token })} />
                  ))}
                  {'\n'}
                </span>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    );
  },
);
