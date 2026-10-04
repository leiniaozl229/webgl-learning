import { effectIds, type EffectId } from '../core/effectGallery';

export const effectPrincipleTitles: Record<string, string> = {
  'effect-waves': '波形与时间相位',
  'effect-sdf': '距离与形状边缘',
  'effect-noise': '噪声、fBM 与扭曲',
  'effect-color': '标量场与配色',
  'effect-glow': '光斑衰减与累加',
  'effect-material': '法线、反射与折射',
  'effect-sampling': '纹理偏移与 RGB 分离',
  'effect-stylization': '随机与像素单元',
  'effect-bloom': '五遍 Bloom 管线',
  'effect-feedback': 'Ping-Pong 帧间状态',
  'effect-3d': '三维距离与射线步进',
  'effect-geometry': '网格、位移与法线',
};

export const effectLessons = [
  {
    id: 'shader-waves', title: '波纹与呼吸',
    lead: '把距离和时间放进 sin，观察明暗波纹与半径呼吸。',
    effects: ['waves'], principles: ['effect-waves'], minutes: 8,
    source: 'https://thebookofshaders.com/05/',
  },
  {
    id: 'shader-sdf', title: 'SDF 形状与描边',
    lead: '用同一份距离生成圆角框、描边与挖孔，观察边缘覆盖率。',
    effects: ['sdf'], principles: ['effect-sdf'], minutes: 10,
    source: 'https://thebookofshaders.com/07/',
  },
  {
    id: 'shader-noise', title: '噪声与色彩流动',
    lead: '先生成云层密度，再映射色彩；用七步光环追踪整个组合。',
    effects: ['clouds', 'color'], principles: ['effect-noise', 'effect-color'], minutes: 25,
    source: 'https://thebookofshaders.com/13/',
  },
  {
    id: 'shader-ribbons', title: '丝带与流动光线',
    lead: '重复扭曲与变换查询坐标，再把细长光斑逐层累加。',
    effects: ['ribbons'], principles: ['effect-glow'], minutes: 12,
    source: 'https://openshaders.com/explore',
  },
  {
    id: 'shader-glass', title: '玻璃与色散',
    lead: '从同一份背景纹理出发，比较折射偏移、RGB 分离与虹彩。',
    effects: ['glass', 'chroma'], principles: ['effect-material', 'effect-sampling'], minutes: 15,
    source: 'https://webgl2fundamentals.org/webgl/lessons/webgl-environment-maps.html',
  },
  {
    id: 'shader-pixel-style', title: '颗粒与像素风格',
    lead: '共享像素单元与源图亮度，比较星光、颗粒、抖动、网点和字符。',
    effects: ['stars', 'grain', 'dither', 'halftone', 'cells'], principles: ['effect-stylization'], minutes: 20,
    source: 'https://thebookofshaders.com/10/',
  },
  {
    id: 'shader-bloom', title: 'Bloom 光晕',
    lead: '跟随五遍绘制，把场景亮部提取、模糊，再加回原图。',
    effects: ['bloom'], principles: ['effect-bloom'], minutes: 12,
    source: 'https://webgl2fundamentals.org/webgl/lessons/webgl-image-processing-continued.html',
  },
  {
    id: 'shader-feedback', title: '拖尾与扩散',
    lead: '用两张交替读写的纹理保存历史，逐帧观察衰减与扩散。',
    effects: ['feedback'], principles: ['effect-feedback'], minutes: 15,
    source: 'https://webgl2fundamentals.org/webgl/lessons/webgl-gpgpu.html',
  },
  {
    id: 'shader-raymarch', title: '三维 SDF 与步进',
    lead: '每个像素沿相机射线查询距离，命中球体或圆环后计算光照。',
    effects: ['raymarch'], principles: ['effect-3d'], minutes: 15,
    source: 'https://doi.org/10.1007/s003710050084',
  },
  {
    id: 'shader-geometry', title: '水面与旗帜',
    lead: '让索引网格的顶点随波形移动，并同步更新表面法线。',
    effects: ['geometry'], principles: ['effect-geometry'], minutes: 12,
    source: 'https://webgl2fundamentals.org/webgl/lessons/webgl-3d-lighting-directional.html',
  },
] as const satisfies readonly {
  id: string; title: string; lead: string; effects: readonly EffectId[];
  principles: readonly string[]; minutes: number; source: string;
}[];

export type EffectLesson = typeof effectLessons[number];
export type EffectLessonId = EffectLesson['id'];

export function getEffectLesson(id: string): EffectLesson | undefined {
  return effectLessons.find((lesson) => lesson.id === id);
}

export function lessonForEffect(effect: EffectId): EffectLesson {
  return effectLessons.find((lesson) => (lesson.effects as readonly EffectId[]).includes(effect))!;
}

/** 页面限定自己的案例；不匹配的查询使用本页第一项。 */
export function effectForLesson(lesson: EffectLesson, value: string | null): EffectId {
  return (lesson.effects as readonly string[]).includes(value ?? '') ? value as EffectId : lesson.effects[0];
}

/** 兼容原合并页的分享链接，仅对有效的 effect 参数迁移。 */
export function legacyEffectLesson(search: string, hash = ''): EffectLesson | undefined {
  const params = new URLSearchParams(search);
  const effect = params.get('effect');
  if (params.get('lesson') !== 'shader-effects-handbook') return;
  if ((effectIds as readonly string[]).includes(effect ?? '')) return lessonForEffect(effect as EffectId);
  const anchor = hash.replace(/^#/, '');
  if (anchor === 'handbook-experiment') return getEffectLesson('shader-noise');
  return effectLessons.find((lesson) => (lesson.principles as readonly string[]).includes(anchor));
}
