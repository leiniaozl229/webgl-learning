import type { ComponentProps, MouseEvent } from 'react';

import { lessonHref, type LessonId } from '../navigation';

export const LESSON_NAVIGATION_EVENT = 'webgl-learning:navigate';

interface LessonLinkProps extends Omit<ComponentProps<'a'>, 'href'> {
  lessonId: LessonId;
  hash?: string;
}

export function LessonLink({ lessonId, hash = 'lesson-title', onClick, ...props }: LessonLinkProps) {
  const href = lessonHref(lessonId, hash);

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) return;

    event.preventDefault();
    window.history.pushState(null, '', href);
    window.dispatchEvent(new Event(LESSON_NAVIGATION_EVENT));

    window.requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      target?.scrollIntoView();
      target?.focus({ preventScroll: true });
    });
  }

  return <a {...props} href={href} onClick={navigate} />;
}
