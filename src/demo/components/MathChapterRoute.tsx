import type { LessonId } from '../navigation';
import { LessonLink } from './LessonLink';

const mathLessons: Array<{ id: LessonId; index: string; label: string; detail: string }> = [
  { id: 'vectors', index: '01', label: '向量', detail: '方向、长度与单位化' },
  { id: 'trigonometry', index: '02', label: '三角函数', detail: '弧度、单位圆与 atan2' },
  { id: 'dot-and-cross', index: '03', label: '点积与叉积', detail: '夹角、垂直方向与坐标基' },
  { id: 'matrix-math', index: '04', label: '矩阵', detail: '行列、齐次坐标与组合' },
  { id: 'inverse-and-normals', index: '05', label: '逆与法线', detail: '行列式、转置与法线矩阵' },
];

export function MathChapterRoute({ current }: { current: LessonId }) {
  return (
    <nav className="transform-route" aria-label="数学基础学习路线">
      <div className="transform-route__heading">
        <span>数学基础 · 5 个连续步骤</span>
        <strong>从单个方向走到完整变换</strong>
      </div>
      <ol>
        {mathLessons.map((lesson) => (
          <li key={lesson.id} data-current={lesson.id === current ? 'true' : undefined}>
            <LessonLink lessonId={lesson.id} aria-current={lesson.id === current ? 'step' : undefined}>
              <span>{lesson.index}</span>
              <div><strong>{lesson.label}</strong><small>{lesson.detail}</small></div>
            </LessonLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
