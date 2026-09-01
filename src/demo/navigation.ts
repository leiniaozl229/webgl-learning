export type LessonId = 'getting-webgl2' | 'fundamentals' | 'how-it-works' | 'shaders-and-glsl' | 'state-diagram';

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

export function lessonHref(lessonId: LessonId, hash = 'lesson-title'): string {
  const baseUrl = import.meta.env.BASE_URL || '/';
  return `${baseUrl}?lesson=${lessonId}#${hash}`;
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: '开始',
    items: [
      { id: 'getting-webgl2', label: '怎样使用 WebGL2', href: lessonHref('getting-webgl2') },
      { id: 'fundamentals', label: 'WebGL2 基本原理', href: lessonHref('fundamentals') },
      { id: 'how-it-works', label: 'WebGL2 如何工作', href: lessonHref('how-it-works') },
      { id: 'shaders-and-glsl', label: '着色器与 GLSL', href: lessonHref('shaders-and-glsl') },
      { id: 'state-diagram', label: 'WebGL2 状态图', href: lessonHref('state-diagram') },
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
  'getting-webgl2': [
    { label: '现在还需要兼容检查吗', href: '#availability' },
    { label: '创建 WebGL2 上下文', href: '#create-context' },
    { label: '上下文选项', href: '#context-options' },
    { label: '设备能力检查', href: '#capability-check' },
    { label: '本项目的学习环境', href: '#project-workflow' },
    { label: '继续学习', href: '#next-steps' },
  ],
  fundamentals: [
    { label: 'WebGL2 在做什么', href: '#what-is-webgl2' },
    { label: 'GPU 渲染路径', href: '#pipeline' },
    { label: '创建 Program', href: '#program-setup' },
    { label: '一次绘制如何执行', href: '#execution-flow' },
    { label: '着色器如何接收数据', href: '#shader-data' },
    { label: '第一个三角形', href: '#hello-triangle' },
    { label: 'Canvas 与 viewport', href: '#canvas-and-viewport' },
    { label: '裁剪空间', href: '#clip-space' },
    { label: '像素坐标实验', href: '#pixel-coordinates' },
    { label: '绘制多个矩形', href: '#multiple-draws' },
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
  'state-diagram': [
    { label: 'WebGL2 是状态机', href: '#state-machine' },
    { label: '对象与绑定点', href: '#objects-and-bindings' },
    { label: '状态模拟器', href: '#state-explorer' },
    { label: 'VAO 保存什么', href: '#vao-state' },
    { label: 'draw call 读取什么', href: '#draw-snapshot' },
    { label: '继续学习', href: '#next-steps' },
  ],
};

export const sourceByLesson: Record<LessonId, string> = {
  'getting-webgl2': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-getting-webgl2.html',
  fundamentals: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html',
  'how-it-works': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-how-it-works.html',
  'shaders-and-glsl': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-shaders-and-glsl.html',
  'state-diagram': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-state-diagram.html',
};

export function parseLessonId(search: string): LessonId {
  const lesson = new URLSearchParams(search).get('lesson');
  if (
    lesson === 'getting-webgl2' ||
    lesson === 'how-it-works' ||
    lesson === 'shaders-and-glsl' ||
    lesson === 'state-diagram'
  ) return lesson;
  return 'fundamentals';
}

export function readLessonId(): LessonId {
  return parseLessonId(window.location.search);
}
