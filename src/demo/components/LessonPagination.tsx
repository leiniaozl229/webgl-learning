import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { adjacentLessons, lessonNavLabel, type LessonId } from '../navigation';
import { LessonLink } from './LessonLink';

interface LessonPaginationProps {
  current: LessonId;
  heading: ReactNode;
  children: ReactNode;
}

export function LessonPagination({ current, heading, children }: LessonPaginationProps) {
  const { previous, next } = adjacentLessons(current);
  return (
    <section id="next-steps" className="lesson-section next-steps lesson-pagination">
      {previous ? <LessonLink lessonId={previous}><ArrowLeft aria-hidden="true" /> {lessonNavLabel(previous)}</LessonLink> : <span />}
      <div><h2>{heading}</h2><p>{children}</p></div>
      {next ? <LessonLink className="next-steps__link" lessonId={next}>{lessonNavLabel(next)} <ArrowRight aria-hidden="true" /></LessonLink> : <span />}
    </section>
  );
}
