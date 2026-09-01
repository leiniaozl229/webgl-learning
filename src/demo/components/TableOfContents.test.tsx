import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TableOfContents } from './TableOfContents';

const items = [
  { label: '概览', href: '#overview' },
  { label: '下一步', href: '#next-steps' },
];

describe('TableOfContents', () => {
  it('renders a compact expandable anchor menu', () => {
    const html = renderToStaticMarkup(
      <TableOfContents items={items} sourceHref="https://example.com" variant="inline" />,
    );

    expect(html).toContain('<details');
    expect(html).toContain('href="#overview"');
    expect(html).toContain('aria-current="location"');
    expect(html).toContain('参考原文');
  });

  it('renders the same anchors in the wide sidebar variant', () => {
    const html = renderToStaticMarkup(
      <TableOfContents items={items} sourceHref="https://example.com" variant="sidebar" />,
    );

    expect(html).toContain('toc--sidebar');
    expect(html).toContain('href="#next-steps"');
  });
});
