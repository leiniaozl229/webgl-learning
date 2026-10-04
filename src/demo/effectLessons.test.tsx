import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { effectIds } from '../core/effectGallery';
import { ShaderEffectArticle } from './components/ShaderEffectArticle';
import { ShaderHandbookArticle } from './components/ShaderHandbookArticle';
import { effectForLesson, effectLessons, lessonForEffect } from './effectLessons';
import { effectRecipes } from './effectRecipes';
import { lessonHref, parseLessonId } from './navigation';

describe('standalone effect lessons', () => {
  it('gives every effect one owner and includes its principle anchor', () => {
    const grouped = effectLessons.flatMap((lesson) => [...lesson.effects]);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual([...effectIds].sort());
    for (const recipe of effectRecipes) {
      expect(lessonForEffect(recipe.id).principles as readonly string[]).toContain(recipe.anchor);
    }
  });

  it('bounds invalid or unrelated selections to the current lesson', () => {
    for (const lesson of effectLessons) {
      expect(effectForLesson(lesson, null)).toBe(lesson.effects[0]);
      expect(effectForLesson(lesson, 'missing')).toBe(lesson.effects[0]);
      for (const effect of effectIds) {
        expect(effectForLesson(lesson, effect)).toBe((lesson.effects as readonly string[]).includes(effect) ? effect : lesson.effects[0]);
      }
    }
  });

  it('migrates all old effect links and retains a stable standalone deep link', () => {
    for (const effect of effectIds) {
      const owner = lessonForEffect(effect);
      expect(parseLessonId('?lesson=shader-effects-handbook&effect=' + effect)).toBe(owner.id);
      const href = lessonHref(owner.id, 'effect-gallery', { effect });
      const url = new URL(href, 'http://localhost');
      expect(parseLessonId(url.search)).toBe(owner.id);
      expect(url.searchParams.get('effect')).toBe(effect);
      expect(url.hash).toBe('#effect-gallery');
    }
    expect(parseLessonId('?lesson=shader-effects-handbook', '#handbook-experiment')).toBe('shader-noise');
    expect(parseLessonId('?lesson=shader-effects-handbook', '#effect-color')).toBe('shader-noise');
    expect(parseLessonId('?lesson=shader-effects-handbook&effect=invalid')).toBe('shader-effects-handbook');
  });

  it('routes every overview demonstration to its own page', () => {
    const html = renderToStaticMarkup(<ShaderHandbookArticle />);
    expect(html).not.toContain('<canvas');
    for (const effect of effectIds) {
      const href = lessonHref(lessonForEffect(effect).id, 'effect-gallery', { effect }).replaceAll('&', '&amp;');
      expect(html).toContain('href="' + href + '"');
    }
  });

  it.each(effectLessons)('$id renders only its local case choices', (lesson) => {
    const html = renderToStaticMarkup(<ShaderEffectArticle lesson={lesson} />);
    const choices = [...html.matchAll(/<option value="([^"]+)"/g)]
      .map((match) => match[1]).filter((id) => (effectIds as readonly string[]).includes(id));
    expect(choices).toEqual(lesson.effects.length > 1 ? [...lesson.effects] : []);
    expect(html.includes('id="handbook-experiment"')).toBe(lesson.id === 'shader-noise');
  });
});
