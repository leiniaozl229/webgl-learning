import { effectIds, type EffectId, type EffectOptions } from '../core/effectGallery';

interface EffectControl { label: string; min: number; max: number; step: number; initial: number }
interface EffectRecipe {
  id: EffectId; name: string; method: string; parameters: string; anchor: string;
  controls: readonly [EffectControl, EffectControl, EffectControl];
  variants?: readonly [string, string]; baseline: string;
  explanation: string; observe: string; pipeline: string[];
}
function control(label: string, initial: number, min: number, max: number, step = 0.01): EffectControl {
  return { label, initial, min, max, step };
}

export const effectRecipes: EffectRecipe[] = [
  {
    id: 'waves', name: '波纹与呼吸', method: 'sin、距离、时间相位', parameters: '频率、振幅、传播速度', anchor: 'effect-waves',
    controls: [control('空间频率', 40, 5, 80, 1), control('振幅', 0.8, 0, 1), control('传播速度', 3, 0, 8, 0.1)],
    variants: ['径向波纹', '呼吸圆形'], baseline: '振幅 = 0',
    explanation: '距离乘以频率、时间乘以速度，共同组成 sin 的相位。波纹把结果映射为明暗；呼吸把结果用于圆形半径。',
    observe: '点击播放，再把振幅调到 0：相位仍在推进，明暗起伏与半径变化会消失。', pipeline: ['像素 → 居中坐标', '距离 + 时间 → sin', '明暗或半径 → 颜色'],
  },
  {
    id: 'ribbons', name: '丝带与流动光线', method: '坐标扭曲、重复变换、发光累加', parameters: '扭曲量、层数、衰减', anchor: 'effect-glow',
    controls: [control('扭曲量', 1, 0, 2), control('累加层数', 36, 1, 80, 1), control('外围衰减', 2, 0, 6, 0.1)], baseline: '扭曲量 = 0',
    explanation: '每层依次执行两次正弦坐标偏移，再旋转、剪切、缩放，并累加偏离原点的细长距离光斑。后一次偏移使用前一次已经修改的坐标。',
    observe: '从一层开始增加层数，观察重复变换怎样铺开亮线；打开基础对照，把扭曲量归零比较弯曲与直线结构。', pipeline: ['坐标 → 两次顺序扭曲', '旋转、剪切与缩放 → 下一层', '光斑累加 → 高光压缩'],
  },
  {
    id: 'clouds', name: '云雾与烟状纹理', method: 'Value noise、fBM、domain warping', parameters: 'octave、频率、扭曲量', anchor: 'effect-noise',
    controls: [control('基础频率', 3, 1, 8, 0.1), control('噪声层数 octave', 5, 1, 6, 1), control('坐标扭曲量', 1.8, 0, 4)], baseline: '关闭坐标扭曲',
    explanation: '两份 fBM 为查询坐标提供偏移，第三份 fBM 生成云层密度。时间让噪声查询坐标缓慢漂移，密度再映射为蓝灰色。',
    observe: '先用一层噪声检查大块结构，再增加 octave 看细节。增加扭曲量会弯折云层，求值成本也包含两份位移场。', pipeline: ['格点 hash → 平滑 noise', '多尺度叠加 → fBM', '位移场 → 密度 → 配色'],
  },
  {
    id: 'sdf', name: '圆角形状与图标', method: 'SDF、阈值、导数抗锯齿', parameters: '圆角、线宽、软边', anchor: 'effect-sdf',
    controls: [control('圆角半径', 0.06, 0, 0.16), control('描边半宽', 0.012, 0.002, 0.05, 0.001), control('软边宽度', 0.004, 0, 0.04, 0.001)],
    variants: ['圆角框', '挖孔图标'], baseline: '仅保留 fwidth 抗锯齿',
    explanation: '圆角盒子的距离场确定轮廓，abs(d) 生成描边。挖孔使用 max(dBox, -dCircle)，把两个形状的距离组合起来。',
    observe: '软边归零后，边缘仍通过 fwidth 获得像素级抗锯齿。增加线宽会同时向边界内外扩展。', pipeline: ['查询坐标 → SDF', 'abs(d) → 描边距离', 'fwidth → 覆盖率 → 颜色'],
  },
  {
    id: 'color', name: '彩色流动场', method: '标量场、palette、色彩映射', parameters: '配色相位、亮度、彩度', anchor: 'effect-color',
    controls: [control('配色相位', 0, 0, 1), control('亮度', 0.9, 0.2, 1.5), control('彩度', 1, 0, 1)], baseline: '原始灰度场',
    explanation: '四层 fBM 产生 0～1 的标量，余弦调色板把这个值映射到三个颜色通道。彩度用灰度与彩色插值，亮度缩放最终颜色。',
    observe: '暂停时间后调整配色相位：空间纹路保留，颜色沿同一份场重新分布。打开对照查看这份灰度输入。', pipeline: ['fBM → 标量 field', 'field + 相位 → palette', '亮度与彩度 → 输出'],
  },
  {
    id: 'glass', name: '液体与玻璃', method: 'UV 偏移、高度法线、反射或折射', parameters: '位移、折射率、Fresnel', anchor: 'effect-material',
    controls: [control('UV 位移强度', 0.18, 0, 0.4), control('折射率 IOR', 1.5, 1, 2.2), control('基础反射率 F0', 0.04, 0, 0.4)], baseline: '原始背景纹理',
    explanation: '正弦高度场通过中心差分生成法线。refract 给出折射方向，薄层近似把方向投影成 UV 偏移；Fresnel 混入解析环境反射。',
    observe: '把折射率调到 1，折射方向会接近直穿。提高 F0 会增强表面的环境反射，背景测试图由程序生成。', pipeline: ['测试图 → 颜色纹理', '高度差分 → 法线与折射方向', '偏移 UV 采样 + 反射 → 合成'],
  },
  {
    id: 'chroma', name: '色散与虹彩', method: 'RGB 分离、随相位变化的颜色', parameters: '通道偏移、虹彩、配色相位', anchor: 'effect-sampling',
    controls: [control('RGB 偏移（CSS px）', 5, 0, 20, 0.5), control('虹彩强度', 0.25, 0, 1), control('虹彩相位', 0, 0, 1)], baseline: '原始背景纹理',
    explanation: 'R、G、B 分别从正向偏移、原位与反向偏移取样；另一份余弦配色随亮度、时间和相位改变，形成艺术化虹彩。',
    observe: '先将虹彩归零，只检查高对比边缘的 RGB 分离；再增加虹彩强度观察颜色覆盖。', pipeline: ['测试图 → 颜色纹理', '三个 UV → R / G / B', '相位配色 → 混合'],
  },
  {
    id: 'stars', name: '星光与闪烁', method: '网格 hash、亮度门控、光斑衰减', parameters: '密度、尺寸、闪烁频率', anchor: 'effect-stylization',
    controls: [control('星点间距（CSS px）', 24, 8, 60, 1), control('光斑尺寸（CSS px）', 1.4, 0.5, 4, 0.1), control('闪烁频率', 2.5, 0, 10, 0.1)], baseline: '关闭星点叠加',
    explanation: '网格编号经 hash 决定光点位置和相位。源图亮度控制光点是否出现，指数衰减与横竖光线组成星芒。',
    observe: '点击播放观察各格不同步的闪烁。减小间距会增加密度，暗背景中的光点会被亮度门控抑制。', pipeline: ['单元 ID → 随机位置与相位', '源图亮度 → 门控', '衰减光斑 × 时间脉冲 → 叠加'],
  },
  {
    id: 'grain', name: '胶片颗粒', method: 'hash、亮度相关的噪声幅度', parameters: '颗粒尺寸、强度、刷新频率', anchor: 'effect-stylization',
    controls: [control('颗粒尺寸（CSS px）', 2, 1, 8, 0.5), control('颗粒强度', 0.32, 0, 0.8), control('刷新频率（Hz）', 24, 1, 60, 1)], baseline: '关闭颗粒',
    explanation: '像素格与离散帧编号共同进入 hash，两份随机值相加形成居中的颗粒。4y(1−y) 让中间亮度承担更多噪声。',
    observe: '暂停时颗粒固定，播放时按设置的 Hz 刷新。加大颗粒尺寸后可看见格子，高光与暗部受影响较小。', pipeline: ['像素格 + 帧编号 → hash', '亮度 → 噪声幅度', '有符号颗粒 → 源图'],
  },
  {
    id: 'dither', name: '复古抖动', method: '量化、Bayer 阈值', parameters: '色阶数、网格尺寸、混合量', anchor: 'effect-stylization',
    controls: [control('每通道色阶数', 4, 2, 12, 1), control('像素格（CSS px）', 3, 1, 10, 1), control('抖动混合量', 1, 0, 1)], baseline: '连续颜色',
    explanation: '4×4 Bayer 矩阵给相邻像素格提供不同阈值。三个通道分别量化，空间上的分布帮助有限色阶表达中间颜色。',
    observe: '将色阶数降到 2、放大像素格，观察规则的阈值分布；混合量归零可返回原始测试图。', pipeline: ['单元中心 → 颜色', 'Bayer 阈值 → 量化', '有限色阶 → 显示'],
  },
  {
    id: 'halftone', name: '印刷网点', method: '单元亮度、圆点面积、SDF', parameters: '间距、旋转角、半径', anchor: 'effect-stylization',
    controls: [control('网点间距（CSS px）', 8, 3, 24, 1), control('网格旋转（rad）', 0.4, 0, 1.57), control('圆点半径倍率', 1, 0.2, 1.3)], baseline: '原始背景纹理',
    explanation: '旋转像素网格，再反向旋转单元中心以读取源图。深色油墨的覆盖面积约等于 1−亮度，半径因此使用平方根。',
    observe: '增大间距检查圆点的面积变化：亮区留出更多纸色，暗区的网点更大。旋转网格时采样位置也会同步变换。', pipeline: ['旋转坐标 → 单元', '亮度 → sqrt → 半径', '圆形 SDF → 油墨与纸色'],
  },
  {
    id: 'cells', name: 'ASCII 与马赛克', method: '分块采样、字形图集', parameters: '单元大小、字符覆盖率、混合量', anchor: 'effect-stylization',
    controls: [control('单元大小（CSS px）', 8, 4, 24, 1), control('字符覆盖率倍率', 1.4, 0.5, 3, 0.1), control('效果混合量', 1, 0, 1)],
    variants: ['ASCII 字符', '马赛克色块'], baseline: '原始背景纹理',
    explanation: '每格用四次采样估计颜色。ASCII 将亮度映射到十个字形之一，再采样字形图集；马赛克直接把整格填成采样颜色。',
    observe: '在两种表达之间切换，观察相同单元颜色如何成为字符或色块。字符覆盖率倍率仅影响 ASCII 的字形选择。', pipeline: ['四次采样 → 单元颜色', '亮度 → 字形编号 / 色块', '字形图集 × 单元颜色 → 显示'],
  },
  {
    id: 'bloom', name: '光晕 Bloom', method: '亮部提取、低分辨率模糊、合成', parameters: '阈值、模糊半径、增益', anchor: 'effect-bloom',
    controls: [control('亮部阈值', 0.9, 0, 3, 0.05), control('模糊采样间距', 2, 0.5, 8, 0.1), control('光晕增益', 1.3, 0, 4, 0.1)], baseline: '关闭光晕合成',
    explanation: '五遍绘制依次保存场景、提取亮部、横向模糊、纵向模糊、合成显示。中间光晕纹理的宽高各减半，两个模糊目标交替使用。',
    observe: '把光晕增益归零，与基础对照比较。提高阈值会减少进入模糊的亮部；高动态范围测试光线可超过 1。', pipeline: ['场景 → Scene', '提取亮部 → 半尺寸 A', '横向模糊 → B', '纵向模糊 → A', 'Scene + A × 增益 → 显示'],
  },
  {
    id: 'feedback', name: '拖尾与扩散', method: '上一帧纹理、Ping-Pong', parameters: '衰减、注入强度、扩散量', anchor: 'effect-feedback',
    controls: [control('衰减速率（每秒）', 1.4, 0.1, 6, 0.1), control('光源注入强度', 0.65, 0.1, 2, 0.05), control('四邻域扩散量', 0.22, 0, 0.24)],
    variants: ['保留拖尾', '拖尾与扩散'], baseline: '只显示即时光源',
    explanation: '上一帧纹理乘以 exp(−衰减×dt)，再加入当前光源，写到另一张纹理。扩散模式额外读取四个邻居，按非负权重混合后交换读写。',
    observe: '播放时间或点击“前进一帧”，观察实际 A/B 交换与累积帧数。暂停后状态固定；改参数、尺寸或重置时间会清空历史。', pipeline: ['读取上一帧 A / B', '邻域扩散 + 按 dt 衰减', '注入光源 → 另一张纹理', '交换读写 → 显示状态'],
  },
  {
    id: 'raymarch', name: '程序化三维物体', method: '三维 SDF、ray marching、光照', parameters: '步数、命中阈值、最大距离', anchor: 'effect-3d',
    controls: [control('最大步数', 72, 4, 128, 1), control('命中阈值', 0.001, 0.0005, 0.02, 0.0005), control('最大距离', 8, 1, 12, 0.1)],
    variants: ['球体', '圆环体'], baseline: '最大步数 = 96',
    explanation: '每个片段建立一条相机射线，用三维 SDF 距离推进射线。命中后用六次距离采样估算法线，再计算漫反射与镜面高光。',
    observe: '把步数降到 4，与 96 步对照观察未命中的区域；最大距离太短时射线会提前退出。圆环随时间旋转。', pipeline: ['像素 → 相机射线', 'SDF 距离 → 迭代推进', '命中 → 法线 → 光照'],
  },
  {
    id: 'geometry', name: '水面与旗帜', method: '顶点位移、变形后的法线', parameters: '网格密度、位移幅度', anchor: 'effect-geometry',
    controls: [control('顶点位移幅度', 0.15, 0, 0.35), control('网格细分数', 48, 4, 96, 1), control('显示网格线', 0, 0, 1, 1)],
    variants: ['水面网格', '飘动旗帜'], baseline: '顶点位移幅度 = 0',
    explanation: 'CPU 生成 position.xyz 与 uv.xy，上传顶点和索引 Buffer。顶点 Shader 用正弦改变几何位置，同时用解析导数更新法线；片段 Shader 根据朝向计算光照。',
    observe: '打开网格线，把细分数降到 4，观察轮廓的折线。旗帜左边的振幅为 0；增加细分能让自由端变得平滑。', pipeline: ['TypedArray → Buffer → VAO', '顶点位移 + 解析法线', 'MVP → 光栅化 → 光照'],
  },
];

export function effectDefaults(id: EffectId): EffectOptions {
  const recipe = effectRecipes.find((item) => item.id === id)!;
  return { kind: effectIds.indexOf(id), params: recipe.controls.map((item) => item.initial) as [number, number, number], variant: 0, compare: false };
}
