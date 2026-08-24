export interface NavigationItem {
  label: string;
  href?: string;
  badge?: string;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: '开始',
    items: [
      { label: 'WebGL2 基本原理', href: '#lesson-title', badge: '当前' },
      { label: 'WebGL2 如何工作', badge: '下一篇' },
      { label: '着色器与 GLSL', badge: '计划中' },
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

export const tableOfContents = [
  { label: 'WebGL2 在做什么', href: '#what-is-webgl2' },
  { label: 'GPU 渲染路径', href: '#pipeline' },
  { label: '着色器如何接收数据', href: '#shader-data' },
  { label: '第一个三角形', href: '#hello-triangle' },
  { label: '继续学习', href: '#next-steps' },
];
