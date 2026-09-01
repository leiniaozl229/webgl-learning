import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SiteHeader } from './SiteHeader';

describe('SiteHeader', () => {
  it('links to the public GitHub repository', () => {
    const html = renderToStaticMarkup(
      <SiteHeader
        theme="dark"
        menuOpen={false}
        sidebarCollapsed={false}
        onThemeChange={() => undefined}
        onMenuOpen={() => undefined}
        onSidebarToggle={() => undefined}
      />,
    );

    expect(html).toContain('href="https://github.com/leiniaozl229/webgl-learning"');
    expect(html).toContain('aria-label="在 GitHub 查看源码"');
  });
});
