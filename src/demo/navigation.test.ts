import { describe, expect, it } from 'vitest';

import {
  adjacentLessons,
  lessonIds,
  lessonSequence,
  lessonTitles,
  navigationGroups,
  parseLessonId,
  sourceByLesson,
  tableOfContentsByLesson,
} from './navigation';

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
    'vectors',
    'trigonometry',
    'dot-and-cross',
    'matrix-math',
    'inverse-and-normals',
  ] as const)('selects the math lesson %s', (lesson) => {
    expect(parseLessonId(`?lesson=${lesson}`)).toBe(lesson);
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

  it.each([
    'orthographic-3d',
    'perspective-3d',
    'camera-3d',
    'matrix-naming-3d',
    'model-view-projection',
  ] as const)('selects the 3D foundation lesson %s', (lesson) => {
    expect(parseLessonId(`?lesson=${lesson}`)).toBe(lesson);
  });

  it('falls back to fundamentals for unknown lessons', () => {
    expect(parseLessonId('?lesson=unknown')).toBe('fundamentals');
    expect(parseLessonId('')).toBe('fundamentals');
  });
});

describe('lesson catalog', () => {
  it('lists every lesson exactly once in the sidebar', () => {
    const navigationIds = navigationGroups.flatMap((group) => group.items.map((item) => item.id));
    expect(new Set(navigationIds).size).toBe(navigationIds.length);
    expect([...navigationIds].sort()).toEqual([...lessonIds].sort());
  });

  it('provides a title, table of contents and source for every lesson', () => {
    for (const id of lessonIds) {
      expect(lessonTitles[id]).toBeTruthy();
      expect(sourceByLesson[id]).toMatch(/^https:\/\//);
      expect(tableOfContentsByLesson[id].at(-1)?.href).toBe('#next-steps');
    }
  });

  it('keeps table of contents anchors unique within a lesson', () => {
    for (const id of lessonIds) {
      const anchors = tableOfContentsByLesson[id].map((item) => item.href);
      expect(new Set(anchors).size).toBe(anchors.length);
    }
  });

  it('derives previous and next lessons from sidebar order', () => {
    expect(adjacentLessons(lessonSequence[0]).previous).toBeUndefined();
    expect(adjacentLessons('state-diagram')).toEqual({ previous: 'shaders-and-glsl', next: 'common-apis' });
    expect(adjacentLessons('vectors')).toEqual({ previous: 'common-apis', next: 'trigonometry' });
    expect(adjacentLessons('inverse-and-normals')).toEqual({ previous: 'matrix-math', next: 'texture-sampling' });
    expect(adjacentLessons('unified-2d-transforms').next).toBe('orthographic-3d');
    expect(adjacentLessons(lessonSequence[lessonSequence.length - 1]).next).toBeUndefined();
  });
});
