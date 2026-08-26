import { describe, expect, it } from 'vitest';

import { parseLessonId } from './navigation';

describe('parseLessonId', () => {
  it('selects the second lesson from the query string', () => {
    expect(parseLessonId('?lesson=how-it-works')).toBe('how-it-works');
  });

  it('falls back to fundamentals for unknown lessons', () => {
    expect(parseLessonId('?lesson=unknown')).toBe('fundamentals');
    expect(parseLessonId('')).toBe('fundamentals');
  });
});
