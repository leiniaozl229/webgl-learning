import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InterpolationSources } from './InterpolationSources';
import { Sidebar } from './Sidebar';

describe('Base UI primitives', () => {
  it('renders the three source tabs with an accessible tab list', () => {
    const html = renderToStaticMarkup(createElement(InterpolationSources));

    expect(html).toContain('role="tablist"');
    expect(html).toContain('vertex-data.ts');
    expect(html).toContain('vertex.glsl');
    expect(html).toContain('fragment.glsl');
  });

  it('renders collapsible course groups expanded by default', () => {
    const html = renderToStaticMarkup(createElement(Sidebar, {
      open: true,
      collapsed: false,
      isDesktop: false,
      lessonId: 'fundamentals',
      onClose: () => undefined,
    }));

    expect(html).toContain('data-panel-open');
    expect(html).toContain('WebGL2 基本原理');
    expect(html).toContain('aria-current="page"');
  });
});
