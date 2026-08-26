import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HighlightedCode } from './HighlightedCode';

describe('HighlightedCode', () => {
  it('tokenizes TypeScript keywords', () => {
    const markup = renderToStaticMarkup(
      createElement(HighlightedCode, {
        code: 'const count: number = 3;',
        language: 'typescript',
      }),
    );

    expect(markup).toContain('token keyword');
    expect(markup).toContain('token number');
  });

  it('tokenizes GLSL built-ins', () => {
    const markup = renderToStaticMarkup(
      createElement(HighlightedCode, {
        code: 'in vec2 a_position; gl_Position = vec4(a_position, 0.0, 1.0);',
        language: 'glsl',
      }),
    );

    expect(markup).toContain('token keyword');
    expect(markup).toContain('token builtin');
  });
});
