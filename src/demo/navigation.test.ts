import { describe, expect, it } from 'vitest';

import { parseLessonId } from './navigation';

describe('parseLessonId', () => {
  it('selects the getting started lesson from the query string', () => {
    expect(parseLessonId('?lesson=getting-webgl2')).toBe('getting-webgl2');
  });

  it('selects the standalone common API lesson from the query string', () => {
    expect(parseLessonId('?lesson=common-apis')).toBe('common-apis');
  });
  it('selects the second lesson from the query string', () => {
    expect(parseLessonId('?lesson=how-it-works')).toBe('how-it-works');
  });

  it('selects the shaders and GLSL lesson from the query string', () => {
    expect(parseLessonId('?lesson=shaders-and-glsl')).toBe('shaders-and-glsl');
  });

  it('selects the state diagram lesson from the query string', () => {
    expect(parseLessonId('?lesson=state-diagram')).toBe('state-diagram');
  });

  it.each([
    'texture-sampling',
    'image-processing-basics',
    'convolution-kernels',
    'convolution-matrix-guide',
    'image-effects',
    'multi-pass-image-processing',
  ] as const)('selects the image-processing lesson %s', (lesson) => {
    expect(parseLessonId(`?lesson=${lesson}`)).toBe(lesson);
  });

  it.each([
    'translation-2d',
    'rotation-2d',
    'scale-2d',
    'matrices-2d',
    'unified-2d-transforms',
  ] as const)('selects the 2D transform lesson %s', (lesson) => {
    expect(parseLessonId(`?lesson=${lesson}`)).toBe(lesson);
  });

  it('falls back to fundamentals for unknown lessons', () => {
    expect(parseLessonId('?lesson=unknown')).toBe('fundamentals');
    expect(parseLessonId('')).toBe('fundamentals');
  });
});
