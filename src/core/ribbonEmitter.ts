import { compileShader, createProgram } from './webgl2';
import commonSource from './ribbonCommon.glsl?raw';
import emitterSource from './ribbonEmitter.glsl?raw';
import bloomSource from './ribbonEmitterBloom.glsl?raw';
import compositeSource from './ribbonEmitterComposite.glsl?raw';
import vertexSource from './shaderHandbookVertex.glsl?raw';
import type { Point } from './controlledRibbon';

export { commonSource, emitterSource };

/** 与着色器里的 MAX_RIBBONS 一致：同时存在的光带上限。 */
export const MAX_RIBBONS = 8;

export type BackgroundKind = 'solid' | 'linear' | 'radial';

export interface EmitterOptions {
  /** 发射点，场景坐标：原点在画面中心，1 = 画面高度。 */
  source: Point;
  /** 平均发射方向（弧度，0 = 向右，逆时针为正）。 */
  direction: number;
  /** 发射方向的随机范围（弧度，总张角）。 */
  spread: number;
  /** 平均每隔多久放出一条（动画时间单位）。 */
  interval: number;
  /** 平均寿命（动画时间单位）。 */
  life: number;
  /** 寿命中用于从发射点长出来的比例。 */
  growth: number;
  /** 寿命末段尾部回缩的程度：0 = 原地淡出，1 = 尾部一路收到头部。 */
  release: number;
  /** 光带在寿命内沿发射方向飘离发射点的距离。 */
  travel: number;
  length: number;
  width: number;
  /** 长度、扭转、寿命在平均值上下浮动的比例。 */
  variance: number;
  /** 每条光带宽度的差异：0 = 一样宽，1 = 从平均宽度的 0.1 倍到 3 倍。 */
  widthRandom: number;
  /** 宽度沿长度的起伏：光带一段宽、一段窄，并随时间缓慢流动。 */
  widthWave: number;
  /** 每条光带固定的弯曲程度（弧度）：出生时随机抽一个方向，越大越弯。 */
  curl: number;
  /** 摆动幅度：弯曲随时间起伏，从根部向末端传过去，整条光带像丝绸一样连贯地舒展。 */
  drift: number;
  twist: number;
  twistFlow: number;
  rootPinch: number;
  layers: number;
  gamma: number;
  softness: number;
  smoothing: number;
  outerFade: number;
  /** 亮边上那条锐利细线的强度：0 = 只有柔和的叠加亮边。 */
  edgeCore: number;
  /** 亮线的半宽（场景单位，1 = 画面高度）。 */
  edgeWidth: number;
  /** 各条光带亮线的强弱粗细差异。 */
  edgeRandom: number;
  /** 亮边沿长度的明暗变化：0 = 整条一样亮，1 = 只剩几段高光。 */
  edgeVary: number;
  /** 翻折增亮：薄膜转到侧对画面时投影收窄，亮度按 1 / |cos| 增强。 */
  foldGlow: number;
  /** 晚年失焦：光带变宽、边缘变软，像散开的光雾。 */
  defocus: number;
  /** 晚年散成丝缕：各层在不同时刻、从末端开始先后消失。 */
  dissolve: number;
  edgeHue: number;
  faceHue: number;
  /** 每条光带色相的随机偏移（圈）。 */
  hueJitter: number;
  /** 按能量上色：越亮越偏暖色、最终接近白，暗处保持冷色。0 = 只用各层自己的颜色。 */
  heat: number;
  /** 亮度达到这个值时冷暖各半。 */
  heatPoint: number;
  /** 最亮处的色相（圈）；冷色用光面色相。 */
  warmHue: number;
  /** 泛光强度：降采样模糊后叠回画面，亮处带一圈柔光。 */
  bloom: number;
  sourceGlow: number;
  exposure: number;
  /** 背景：纯色、线性渐变或径向渐变。颜色用 CSS 的十六进制写法。 */
  background: BackgroundKind;
  backgroundFrom: string;
  backgroundTo: string;
  /** 线性渐变方向（度，0 = 从左到右，90 = 从下到上）。 */
  backgroundAngle: number;
  /** 径向渐变中心，场景坐标。 */
  backgroundCenter: Point;
  backgroundRadius: number;
  scale: number;
  /** 整体速度：下面三个时钟的总倍率。 */
  speed: number;
  /** 生命节奏：发射新光带、光带变老（生长、失焦、消散）的快慢。 */
  lifeSpeed: number;
  /** 形态运动：弯曲波传播、绕根部摆动、亮结流动的快慢。 */
  motionSpeed: number;
  /** 光纹流动：亮边明暗、宽度起伏、光面丝纹沿光带流动的快慢。 */
  shimmerSpeed: number;
}

export const defaultEmitterOptions: EmitterOptions = {
  source: [-0.885, -0.0255], direction: 0.0384, spread: 1.05,
  interval: 1.52, life: 15.2, growth: 0.13, release: 0.1, travel: 0.08,
  length: 1.37, width: 1, variance: 0, widthRandom: 1, widthWave: 0.9, curl: 0, drift: 1.2,
  twist: 0.14, twistFlow: 0.36, rootPinch: 0,
  layers: 48, gamma: 1.69, softness: 0.001, smoothing: 2.5, outerFade: 1, edgeCore: 0, edgeWidth: 0.0005, edgeRandom: 0, edgeVary: 0,
  foldGlow: 0.26, defocus: 0.8, dissolve: 0.8,
  edgeHue: 0.815, faceHue: 0.3, hueJitter: 0.02, heat: 0, heatPoint: 0.05, warmHue: 0, bloom: 0, sourceGlow: 0,
  background: 'radial', backgroundFrom: '#101138', backgroundTo: '#000000', backgroundAngle: 90, backgroundCenter: [-0.868, 0.022], backgroundRadius: 2.47,
  exposure: 1.79, scale: 0.5, speed: 0.14, lifeSpeed: 2.93, motionSpeed: 2.62, shimmerSpeed: 3,
};

type BackgroundOptions = Pick<EmitterOptions, 'background' | 'backgroundFrom' | 'backgroundTo' | 'backgroundAngle' | 'backgroundCenter' | 'backgroundRadius'>;

/** 几组常用背景，作为调色起点。 */
export const backgroundPresets: { label: string; options: BackgroundOptions }[] = [
  { label: '深蓝舞台', options: { background: 'radial', backgroundFrom: '#1d2a8c', backgroundTo: '#04051a', backgroundAngle: 90, backgroundCenter: [0, -0.3], backgroundRadius: 1.3 } },
  { label: '纯黑', options: { background: 'solid', backgroundFrom: '#000000', backgroundTo: '#000000', backgroundAngle: 90, backgroundCenter: [0, 0], backgroundRadius: 1 } },
  { label: '紫色光晕', options: { background: 'radial', backgroundFrom: '#1a1033', backgroundTo: '#000000', backgroundAngle: 90, backgroundCenter: [-0.5, -0.25], backgroundRadius: 1.2 } },
  { label: '夜空', options: { background: 'linear', backgroundFrom: '#02030a', backgroundTo: '#16204a', backgroundAngle: 90, backgroundCenter: [0, 0], backgroundRadius: 1 } },
  { label: '白色页面', options: { background: 'solid', backgroundFrom: '#ffffff', backgroundTo: '#ffffff', backgroundAngle: 90, backgroundCenter: [0, 0], backgroundRadius: 1 } },
  { label: '晨光', options: { background: 'linear', backgroundFrom: '#ffffff', backgroundTo: '#e8e4ff', backgroundAngle: 90, backgroundCenter: [0, 0], backgroundRadius: 1 } },
];

/** '#rrggbb' → 0..1 的三个分量。 */
export function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255];
}

const backgroundKinds: Record<BackgroundKind, number> = { solid: 0, linear: 1, radial: 2 };

/** 出生时抽好的随机量，之后不再变。用 0..1 的原始随机数存储，滑块改动会立即作用在活着的光带上。 */
interface Ribbon {
  born: number;
  /** 寿命、方向、长度、宽度、扭转、扭转相位、色相各一个随机数。 */
  rolls: { life: number; angle: number; length: number; width: number; twist: number; phase: number; hue: number; edge: number; edgeWidth: number; wave: number; bend: number };
  side: 1 | -1;
  /** 弯曲波：每个分量沿长度的波数、随时间的角频率、相位和幅度权重。 */
  modes: { k: number; w: number; p: number; a: number }[];
  /** 整条光带绕根部的慢速摆动。 */
  sway: { w: number; p: number };
}

export interface RibbonInstance {
  origin: Point;
  /** 发射方向的单位向量。 */
  axis: Point;
  /** 局部坐标中的五个控制点：x 沿发射方向递增。 */
  points: Point[];
  length: number;
  /** 带符号：正值向发射方向左侧铺开，负值向右侧。 */
  width: number;
  twist: number;
  twistPhase: number;
  intensity: number;
  head: number;
  tail: number;
  hueShift: number;
  /** 出生时抽定的相位，光面丝纹和起伏用它错开，不随数组位置变化。 */
  seed: number;
  /** 这条光带亮线的强度倍数与宽度倍数。 */
  edgeGain: number;
  edgeScale: number;
  /** 这条光带宽度沿长度起伏的幅度。 */
  wave: number;
  /** 晚年进度 0..1：失焦与散成丝缕从这里开始。 */
  late: number;
  age: number;
}

/** 可复现的伪随机数：同一个种子得到同一串发射序列。 */
export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** 在平均值上下 variance 比例内取值：roll = 0.5 时正好等于平均值。 */
/** 亮结流速的基准圈数：扭 0.9 圈时，相位每单位形态时间变化 流速 弧度。固定常数，改默认参数不会改变流速的含义。 */
export const KNOT_FLOW_TURNS = 0.9;

const vary = (mean: number, roll: number, variance: number) => mean * (1 + (roll * 2 - 1) * variance);

/** 宽度倍数：roll 先按 1.5 次方偏向 0，再在 [1 − 0.9r, 1 + 2r] 之间插值；r = 1 时最宽可达平均宽度的 3 倍。 */
export function widthFactor(roll: number, randomness: number) {
  return 1 - 0.9 * randomness + roll ** 1.5 * 2.9 * randomness;
}

/** 一条光带当前的寿命比例 0..1；超过 1 表示已经消失。 */
export function ageOf(ribbon: Ribbon, time: number, options: EmitterOptions) {
  return (time - ribbon.born) / vary(options.life, ribbon.rolls.life, options.variance * 0.6);
}

/**
 * 生命周期：出生后在 growth 比例的时间里从根部长到末端；
 * 后半生进入晚年（late 0 → 1）：光带失焦、散成丝缕，最后 18% 的时间里整体淡出。尾部按 release 从根部向头部回缩。
 */
export function lifecycle(age: number, growth: number, release: number) {
  const head = smoothstep(0, Math.max(growth, 0.01), age);
  const tail = release * smoothstep(0.55, 1, age);
  const intensity = smoothstep(0, 0.08, age) * (1 - smoothstep(0.82, 1, age));
  const late = smoothstep(0.45, 1, age);
  return { head, tail, intensity, late };
}

/** 方向限制在 ±0.72 弧度内，用 tanh 软限制：接近上限时逐渐变缓，不会突然拐折。 */
const maxHeading = 0.72;
const softClamp = (heading: number) => maxHeading * Math.tanh(heading / maxHeading);

/**
 * 局部坐标里的五个控制点：沿长度积分方向角，方向角又由曲率积分而来。
 * 曲率 = 固定弯曲 + 几个沿长度向末端传播的正弦波 sin(k·s − ω·t + φ)：
 * 弯曲从根部产生、半拍之后才到达末端，整条光带连贯地舒展，而不是每个点各自上下抖。
 * 柔软度沿长度递增：根部较硬、末端最软，曲率乘 (0.4 + 1.2s)，整条平均仍为 1。像丝绸一样，越往外越飘。
 */
export function centreline(ribbon: Pick<Ribbon, 'modes' | 'rolls'>, length: number, time: number, options: Pick<EmitterOptions, 'curl' | 'drift'>): Point[] {
  const bend = (ribbon.rolls.bend - 0.5) * 3 * options.curl;
  const curvature = (s: number) => (0.4 + 1.2 * s) * (bend + options.drift * ribbon.modes.reduce((sum, { k, w, p, a }) => sum + a * Math.sin(k * s - w * time + p), 0));
  const steps = 16, ds = 1 / steps;
  const points: Point[] = [[0, 0]];
  let heading = 0, x = 0, y = 0;
  for (let i = 0; i < steps; i++) {
    const s = (i + 0.5) * ds;
    const angle = softClamp(heading + curvature(s) * ds * 0.5);
    heading += curvature(s) * ds;
    x += Math.cos(angle) * length * ds;
    y += Math.sin(angle) * length * ds;
    if ((i + 1) % (steps / 4) === 0) points.push([x, y]);
  }
  return points;
}

/**
 * 把出生时抽好的随机量和当前时间组合成这一帧要上传的光带。
 * time 是生命时钟，决定年龄；motion 是形态时钟，决定弯曲、摆动和亮结的位置。两者分开累加，可以各自调快慢。
 */
export function instanceOf(ribbon: Ribbon, time: number, options: EmitterOptions, motion = time): RibbonInstance {
  const { rolls } = ribbon;
  const age = ageOf(ribbon, time, options);
  // 整条光带绕根部慢慢摆动；摆动之上的弯曲由 centreline 里的传播波负责。
  const sway = options.drift * 0.3 * Math.sin(motion * ribbon.sway.w + ribbon.sway.p);
  const angle = options.direction + (rolls.angle - 0.5) * options.spread + sway;
  const axis: Point = [Math.cos(angle), Math.sin(angle)];
  const length = vary(options.length, rolls.length, options.variance);
  // 飘离：根部沿发射方向缓慢移开，先快后慢，像被放开后逐渐停下。
  const travel = options.travel * (1 - (1 - Math.min(age, 1)) ** 2);
  const origin: Point = [options.source[0] + axis[0] * travel, options.source[1] + axis[1] * travel];
  const points = centreline(ribbon, length, motion, options);
  const twist = vary(options.twist, rolls.twist, options.variance);

  const { head, tail, intensity, late } = lifecycle(age, options.growth, options.release);
  return {
    origin, axis, points, length,
    // 宽度的随机偏向细的一端：多数光带细而锐利，偶尔一条很宽，画面有主次。
    width: options.width * widthFactor(rolls.width, options.widthRandom) * ribbon.side,
    twist,
    // 亮结流速指亮结沿光带移动的快慢：相位速度乘以圈数，亮结每单位时间走过的长度与圈数无关。
    // 圈数接近 0 时相位几乎不动，整条光带不会一齐翻面。
    twistPhase: rolls.phase * Math.PI * 2 + motion * options.twistFlow * twist / KNOT_FLOW_TURNS,
    intensity, head, tail,
    hueShift: (rolls.hue - 0.5) * 2 * options.hueJitter,
    seed: rolls.phase * 37,
    edgeGain: Math.max(1 + (rolls.edge * 2 - 1) * options.edgeRandom * 1.2, 0),
    edgeScale: 1 + (rolls.edgeWidth * 2 - 1) * options.edgeRandom * 0.7,
    wave: options.widthWave * (0.3 + 1.4 * rolls.wave),
    late, age,
  };
}

/**
 * 发射器：随时间推进，按随机间隔放出新光带，移除寿命已尽的光带。
 * 第一次更新时从“一个寿命之前”开始补放，画面一打开就处在稳定状态，而不是从空白开始。
 */
export function createEmitter(seed = 1) {
  let random = mulberry32(seed);
  let ribbons: Ribbon[] = [];
  let nextSpawn: number | null = null;
  let last = -Infinity;

  function spawn(born: number): Ribbon {
    const r = random;
    return {
      born,
      rolls: { life: r(), angle: r(), length: r(), width: r(), twist: r(), phase: r(), hue: r(), edge: r(), edgeWidth: r(), wave: r(), bend: r() },
      side: r() < 0.5 ? 1 : -1,
      // 弯曲波都很长（整条光带上不到一个半波长），低频分量幅度大、走得慢；最高的一个只添一点细节。
      // 不再用 k ≈ 8–10 的短波：它在五个控制点之间来回折，光带看起来发硬。
      modes: [
        { k: 1.8 + r() * 0.8, w: 0.22 + r() * 0.16, p: r() * Math.PI * 2, a: 2.6 },
        { k: 3.4 + r(), w: 0.32 + r() * 0.2, p: r() * Math.PI * 2, a: 1.2 },
        { k: 5.5 + r() * 1.5, w: 0.45 + r() * 0.25, p: r() * Math.PI * 2, a: 0.35 },
      ],
      sway: { w: 0.15 + r() * 0.15, p: r() * Math.PI * 2 },
    };
  }

  /** time = 生命时钟（发射与变老），motion = 形态时钟；不传 motion 时两者相同。 */
  function update(time: number, options: EmitterOptions, motion = time): RibbonInstance[] {
    // 时间倒退（重置）时从头开始。
    if (time < last) reset(seed);
    last = time;
    if (nextSpawn === null) nextSpawn = time - options.life;
    while (nextSpawn <= time) {
      const alive = ribbons.filter((ribbon) => ageOf(ribbon, nextSpawn!, options) < 1);
      if (alive.length < MAX_RIBBONS) alive.push(spawn(nextSpawn));
      ribbons = alive;
      nextSpawn += options.interval * (0.5 + random());
    }
    ribbons = ribbons.filter((ribbon) => ageOf(ribbon, time, options) < 1);
    return ribbons.map((ribbon) => instanceOf(ribbon, time, options, motion));
  }

  function reset(nextSeed: number) {
    seed = nextSeed;
    random = mulberry32(seed);
    ribbons = [];
    nextSpawn = null;
    last = -Infinity;
  }

  return { update, reset };
}

/** OKLCH → 线性 RGB，与 ribbonCommon.glsl 里的 oklch() 相同。 */
export function oklch(lightness: number, chroma: number, hueTurns: number): [number, number, number] {
  const h = hueTurns * Math.PI * 2;
  const a = chroma * Math.cos(h), b = chroma * Math.sin(h);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const clamp = (value: number) => Math.min(Math.max(value, 0), 1);
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ];
}

/** 着色器里细线层数的上限，也是调色板纹理的层数列数；第 MAX_LAYERS 列放亮线颜色。 */
export const MAX_LAYERS = 48;

/**
 * 每层只和层号有关的量：(tᵞ, 细线间距系数, 0.08t·cos 7t, 0.08t·sin 7t)。
 * 原本每个像素对每层都要算两次 pow 和一次 sin，现在每帧在这里算一次。
 */
export function fillLayerShape(target: Float32Array, options: Pick<EmitterOptions, 'layers' | 'gamma'>) {
  const { layers, gamma } = options;
  for (let i = 0; i < Math.min(layers, MAX_LAYERS); i++) {
    const t = (i + 0.5) / layers;
    target[i * 4] = t ** gamma;
    target[i * 4 + 1] = (gamma * Math.max(t, 0.5 / layers) ** (gamma - 1)) / layers;
    target[i * 4 + 2] = 0.08 * t * Math.cos(7 * t);
    target[i * 4 + 3] = 0.08 * t * Math.sin(7 * t);
  }
}

/** 0..1 的确定性散列：同一条光带每帧得到相同的值。 */
const hash = (seed: number, i: number) => {
  const value = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

/**
 * 第 row 行：一条光带每层的颜色（已乘外缘渐隐与柔和度），a = 这一层散开消失的先后（0.15..1，越小越早）；
 * 最后一列是亮线颜色。散开的先后由光带自己的 seed 决定，不随它在数组里的位置变化。
 */
export function fillPaletteRow(target: Float32Array, row: number, hueShift: number, seed: number, options: Pick<EmitterOptions, 'layers' | 'softness' | 'outerFade' | 'edgeHue' | 'faceHue'>) {
  const { layers, softness, outerFade, edgeHue, faceHue } = options;
  const base = row * (MAX_LAYERS + 1) * 4;
  for (let i = 0; i < Math.min(layers, MAX_LAYERS); i++) {
    const t = (i + 0.5) / layers;
    const mix = (a: number, b: number) => a + (b - a) * t;
    const fade = (1 - smoothstep(1 - outerFade, 1, t)) * softness;
    const [r, g, b] = oklch(mix(0.82, 0.6), mix(0.09, 0.16), mix(edgeHue, faceHue) + hueShift);
    target.set([r * fade, g * fade, b * fade, 0.15 + 0.85 * hash(seed, i)], base + i * 4);
  }
  target.set([...oklch(0.96, 0.05, edgeHue + hueShift), 1], base + MAX_LAYERS * 4);
}

const header = '#version 300 es\nprecision highp float;\n';
export const emitterFragmentSource = `${header}${commonSource}\n${emitterSource}`;
export const compositeFragmentSource = `${header}${commonSource}\n${compositeSource}`;
export const bloomFragmentSource = `${header}${bloomSource}`;

export interface EmitterFrameInfo { width: number; height: number; count: number; gpuMs: number | null; timerSupported: boolean }
interface TimerExtension { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

interface Target { texture: WebGLTexture; framebuffer: WebGLFramebuffer; width: number; height: number }

/**
 * 三步绘制：光带累加到离屏的线性光纹理 → 降到 ¼ 分辨率做两次可分离模糊得到泛光 → 与背景合成、压缩高光后输出。
 * 浮点渲染目标不可用时退回 8 位纹理，存 x / (1 + x)，合成时再还原。
 */
export function createEmitterRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!context) throw new Error('当前浏览器没有可用的 WebGL2 上下文。请换用支持 WebGL2 的浏览器。');
  const gl = context;
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null;
  const floatTargets = !!gl.getExtension('EXT_color_buffer_float');
  const queries: WebGLQuery[] = [];
  let gpuMs: number | null = null;
  let disposed = false;

  function build<const N extends string>(fragmentSource: string, names: readonly N[]) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    let fs: WebGLShader | null = null;
    try {
      fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
      const program = createProgram(gl, vs, fs);
      const at = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<N, WebGLUniformLocation | null>;
      return { program, at };
    } finally {
      gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
    }
  }
  const scene = build(emitterFragmentSource, ['u_resolution', 'u_time', 'u_encoded', 'u_count', 'u_points', 'u_frame', 'u_form', 'u_life', 'u_traits', 'u_late', 'u_layers', 'u_look', 'u_source', 'u_edge', 'u_decay', 'u_heat', 'u_layerShape', 'u_palette'] as const);
  const blur = build(bloomFragmentSource, ['u_source', 'u_texel', 'u_direction', 'u_target'] as const);
  const composite = build(compositeFragmentSource, ['u_resolution', 'u_exposure', 'u_encoded', 'u_scene', 'u_bloom', 'u_bloomTexture', 'u_bgFrom', 'u_bgTo', 'u_bgShape', 'u_bgRadius'] as const);
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('无法创建全屏绘制所需的 VAO。');

  // 每帧复用同一组 TypedArray，按光带顺序填好再一次上传。
  const points = new Float32Array(MAX_RIBBONS * 10);
  const frame = new Float32Array(MAX_RIBBONS * 4);
  const form = new Float32Array(MAX_RIBBONS * 4);
  const life = new Float32Array(MAX_RIBBONS * 4);
  const traits = new Float32Array(MAX_RIBBONS * 4);
  const late = new Float32Array(MAX_RIBBONS);
  const layerShape = new Float32Array(MAX_LAYERS * 4);
  const palette = new Float32Array((MAX_LAYERS + 1) * MAX_RIBBONS * 4);
  const paletteTexture = gl.createTexture();
  if (!paletteTexture) throw new Error('无法创建光带调色板纹理。');
  gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, MAX_LAYERS + 1, MAX_RIBBONS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // 光场纹理与两张泛光纹理，尺寸跟随画布。
  let targets: Target[] = [];
  function createTarget(width: number, height: number): Target {
    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    if (!texture || !framebuffer) throw new Error('无法创建离屏绘制目标。');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, floatTargets ? gl.RGBA16F : gl.RGBA8, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return { texture, framebuffer, width, height };
  }
  function releaseTargets() {
    targets.forEach(({ texture, framebuffer }) => { gl.deleteTexture(texture); gl.deleteFramebuffer(framebuffer); });
    targets = [];
  }
  function ensureTargets(width: number, height: number) {
    if (targets[0]?.width === width && targets[0]?.height === height) return targets;
    releaseTargets();
    const bloomWidth = Math.max(1, Math.round(width / 4)), bloomHeight = Math.max(1, Math.round(height / 4));
    targets = [createTarget(width, height), createTarget(bloomWidth, bloomHeight), createTarget(bloomWidth, bloomHeight)];
    return targets;
  }

  function collectTimings() {
    if (!timer) return;
    while (queries.length) {
      const query = queries[0];
      if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) break;
      if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) {
        const ms = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
        gpuMs = gpuMs === null ? ms : gpuMs * 0.85 + ms * 0.15;
      }
      gl.deleteQuery(query);
      queries.shift();
    }
  }

  function blurPass(source: Target, target: Target, direction: Point) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.uniform2f(blur.at.u_texel, 1 / source.width, 1 / source.height);
    gl.uniform2f(blur.at.u_direction, ...direction);
    gl.uniform2f(blur.at.u_target, target.width, target.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** shimmer = 光纹时钟：着色器里亮边明暗、宽度起伏和丝纹的流动都按它走。 */
  function draw(shimmer: number, ribbons: RibbonInstance[], options: EmitterOptions): EmitterFrameInfo | null {
    if (disposed || !canvas.clientWidth || !canvas.clientHeight) return null;
    const dpr = Math.min(devicePixelRatio || 1, 2) * options.scale;
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const [light, bloomA, bloomB] = ensureTargets(width, height);
    collectTimings();
    const query = timer && queries.length < 4 ? gl.createQuery() : null;
    if (query && timer) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);

    const count = Math.min(ribbons.length, MAX_RIBBONS);
    for (let k = 0; k < count; k++) {
      const ribbon = ribbons[k];
      ribbon.points.forEach(([x, y], i) => { points[k * 10 + i * 2] = x; points[k * 10 + i * 2 + 1] = y; });
      frame.set([...ribbon.origin, ...ribbon.axis], k * 4);
      form.set([ribbon.length, ribbon.width, ribbon.twist, ribbon.twistPhase], k * 4);
      life.set([ribbon.intensity, ribbon.head, ribbon.tail, ribbon.hueShift], k * 4);
      traits.set([ribbon.seed, ribbon.edgeGain, ribbon.edgeScale, ribbon.wave], k * 4);
      late[k] = ribbon.late;
      fillPaletteRow(palette, k, ribbon.hueShift, ribbon.seed, options);
    }
    fillLayerShape(layerShape, options);
    const encoded = floatTargets ? 0 : 1;
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);

    // 1. 光带 → 线性光纹理。
    gl.bindFramebuffer(gl.FRAMEBUFFER, light.framebuffer);
    gl.viewport(0, 0, width, height);
    gl.useProgram(scene.program);
    const { at } = scene;
    gl.uniform2f(at.u_resolution, width, height);
    gl.uniform1f(at.u_time, shimmer);
    gl.uniform1f(at.u_encoded, encoded);
    gl.uniform1i(at.u_count, count);
    gl.uniform2fv(at.u_points, points);
    gl.uniform4fv(at.u_frame, frame);
    gl.uniform4fv(at.u_form, form);
    gl.uniform4fv(at.u_life, life);
    gl.uniform4fv(at.u_traits, traits);
    gl.uniform1fv(at.u_late, late);
    gl.uniform4f(at.u_layers, options.layers, options.gamma, options.softness, options.smoothing);
    gl.uniform4f(at.u_look, options.edgeHue, options.faceHue, options.outerFade, options.rootPinch);
    gl.uniform3f(at.u_source, options.source[0], options.source[1], options.sourceGlow);
    gl.uniform4f(at.u_edge, options.edgeCore, options.edgeWidth, options.edgeRandom, options.edgeVary);
    gl.uniform4f(at.u_decay, options.defocus, options.dissolve, options.foldGlow, 0);
    gl.uniform4f(at.u_heat, options.heat, Math.max(options.heatPoint, 0.01), options.warmHue, options.faceHue);
    gl.uniform4fv(at.u_layerShape, layerShape);
    gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
    if (count) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, MAX_LAYERS + 1, count, gl.RGBA, gl.FLOAT, palette);
    gl.uniform1i(at.u_palette, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2. 泛光：降采样，再横竖各模糊两轮，第二轮步长加倍，光晕更宽。
    if (options.bloom > 0) {
      gl.useProgram(blur.program);
      gl.uniform1i(blur.at.u_source, 0);
      blurPass(light, bloomA, [0, 0]);
      blurPass(bloomA, bloomB, [1, 0]);
      blurPass(bloomB, bloomA, [0, 1]);
      blurPass(bloomA, bloomB, [2, 0]);
      blurPass(bloomB, bloomA, [0, 2]);
    }

    // 3. 合成到画布。
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(composite.program);
    const c = composite.at;
    gl.uniform2f(c.u_resolution, width, height);
    gl.uniform1f(c.u_exposure, options.exposure);
    gl.uniform1f(c.u_encoded, encoded);
    gl.uniform1f(c.u_bloom, options.bloom);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, light.texture);
    gl.uniform1i(c.u_scene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bloomA.texture);
    gl.uniform1i(c.u_bloomTexture, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform3f(c.u_bgFrom, ...hexToRgb(options.backgroundFrom));
    gl.uniform3f(c.u_bgTo, ...hexToRgb(options.background === 'solid' ? options.backgroundFrom : options.backgroundTo));
    gl.uniform4f(c.u_bgShape, backgroundKinds[options.background], (options.backgroundAngle * Math.PI) / 180, ...options.backgroundCenter);
    gl.uniform1f(c.u_bgRadius, Math.max(options.backgroundRadius, 0.01));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (query && timer) { gl.endQuery(timer.TIME_ELAPSED_EXT); queries.push(query); }
    return { width, height, count, gpuMs, timerSupported: !!timer };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    queries.forEach((query) => gl.deleteQuery(query));
    [scene, blur, composite].forEach(({ program }) => gl.deleteProgram(program));
    gl.deleteVertexArray(vao);
    gl.deleteTexture(paletteTexture);
    releaseTargets();
  }

  return { draw, dispose };
}
