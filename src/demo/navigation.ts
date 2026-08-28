export type LessonId = 'fundamentals' | 'how-it-works' | 'shaders-and-glsl';

export interface NavigationItem {
  id?: LessonId;
  label: string;
  href?: string;
  badge?: string;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export interface TableOfContentsItem {
  label: string;
  href: string;
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: '开始',
    items: [
      { id: 'fundamentals', label: 'WebGL2 基本原理', href: '/?lesson=fundamentals#lesson-title' },
      { id: 'how-it-works', label: 'WebGL2 如何工作', href: '/?lesson=how-it-works#lesson-title' },
      { id: 'shaders-and-glsl', label: '着色器与 GLSL', href: '/?lesson=shaders-and-glsl#lesson-title' },
    ],
  },
  {
    label: '二维',
    items: [{ label: '平移' }, { label: '旋转' }, { label: '缩放与矩阵' }],
  },
  {
    label: '三维',
    items: [{ label: '正射投影' }, { label: '透视投影' }, { label: '相机' }],
  },
];

export const tableOfContentsByLesson: Record<LessonId, TableOfContentsItem[]> = {
  fundamentals: [
    { label: 'WebGL2 在做什么', href: '#what-is-webgl2' },
    { label: 'GPU 渲染路径', href: '#pipeline' },
    { label: '一次绘制如何执行', href: '#execution-flow' },
    { label: '着色器如何接收数据', href: '#shader-data' },
    { label: '第一个三角形', href: '#hello-triangle' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'how-it-works': [
    { label: '顶点着色器调用', href: '#vertex-invocations' },
    { label: 'GPU 如何拉取顶点', href: '#attribute-pull' },
    { label: 'Varying 插值', href: '#interpolation' },
    { label: 'stride 与 offset', href: '#stride-offset' },
    { label: '绘制状态清单', href: '#draw-checklist' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'shaders-and-glsl': [
    { label: '两种着色器', href: '#shader-stages' },
    { label: '四条数据通道', href: '#data-channels' },
    { label: 'Uniform 实验', href: '#uniform-lab' },
    { label: 'GLSL 向量与类型', href: '#glsl-types' },
    { label: '编译与链接', href: '#compile-and-link' },
    { label: '继续学习', href: '#next-steps' },
  ],
};

export const sourceByLesson: Record<LessonId, string> = {
  fundamentals: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html',
  'how-it-works': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-how-it-works.html',
  'shaders-and-glsl': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-shaders-and-glsl.html',
};

export function parseLessonId(search: string): LessonId {
  const lesson = new URLSearchParams(search).get('lesson');
  if (lesson === 'how-it-works' || lesson === 'shaders-and-glsl') return lesson;
  return 'fundamentals';
}

export function readLessonId(): LessonId {
  return parseLessonId(window.location.search);
}
