import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LessonLink } from './LessonLink';

describe('LessonLink', () => {
  it('renders a crawlable lesson URL while enhancing clicks on the client', () => {
    const markup = renderToStaticMarkup(
      createElement(LessonLink, { lessonId: 'how-it-works' }, '下一篇'),
    );

    expect(markup).toContain('href="/?lesson=how-it-works#lesson-title"');
    expect(markup).toContain('下一篇');
  });
});
