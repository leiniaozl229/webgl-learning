export type LessonId =
  | 'getting-webgl2'
  | 'common-apis'
  | 'fundamentals'
  | 'how-it-works'
  | 'shaders-and-glsl'
  | 'state-diagram'
  | 'texture-sampling'
  | 'image-processing-basics'
  | 'convolution-kernels'
  | 'convolution-matrix-guide'
  | 'image-effects'
  | 'multi-pass-image-processing'
  | 'translation-2d'
  | 'rotation-2d'
  | 'scale-2d'
  | 'matrices-2d'
  | 'unified-2d-transforms'
  | 'orthographic-3d'
  | 'perspective-3d'
  | 'camera-3d'
  | 'matrix-naming-3d'
  | 'model-view-projection';

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
      { id: 'common-apis', label: '常用 WebGL2 API', href: lessonHref('common-apis') },
    ],
  },
  {
    label: '二维',
    items: [
      { id: 'texture-sampling', label: '图像上传与纹理采样', href: lessonHref('texture-sampling') },
      { id: 'image-processing-basics', label: '图像处理基础', href: lessonHref('image-processing-basics') },
      { id: 'convolution-kernels', label: '卷积核', href: lessonHref('convolution-kernels') },
      { id: 'convolution-matrix-guide', label: '卷积矩阵详解', href: lessonHref('convolution-matrix-guide') },
      { id: 'image-effects', label: '模糊、锐化与边缘检测', href: lessonHref('image-effects') },
      { id: 'multi-pass-image-processing', label: '多阶段图像处理', href: lessonHref('multi-pass-image-processing') },
      { id: 'translation-2d', label: '二维平移', href: lessonHref('translation-2d') },
      { id: 'rotation-2d', label: '二维旋转', href: lessonHref('rotation-2d') },
      { id: 'scale-2d', label: '二维缩放', href: lessonHref('scale-2d') },
      { id: 'matrices-2d', label: '二维矩阵', href: lessonHref('matrices-2d') },
      { id: 'unified-2d-transforms', label: '统一表达二维变换', href: lessonHref('unified-2d-transforms') },
    ],
  },
  {
    label: '三维',
    items: [
      { id: 'orthographic-3d', label: '三维正射投影', href: lessonHref('orthographic-3d') },
      { id: 'perspective-3d', label: '三维透视投影', href: lessonHref('perspective-3d') },
      { id: 'camera-3d', label: '三维相机', href: lessonHref('camera-3d') },
      { id: 'matrix-naming-3d', label: '三维矩阵命名', href: lessonHref('matrix-naming-3d') },
      { id: 'model-view-projection', label: '模型、视图与投影', href: lessonHref('model-view-projection') },
    ],
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
  'common-apis': [
    { label: 'API 速查', href: '#api-reference' },
    { label: 'JavaScript 类型数组', href: '#typed-arrays' },
    { label: '数据流运行架构', href: '#api-architecture' },
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
  'texture-sampling': [
    { label: '纹理数据流', href: '#texture-data-flow' },
    { label: '创建并上传 Texture', href: '#upload-texture' },
    { label: 'UV 坐标含义', href: '#uv-and-sampling' },
    { label: 'UV 顶点数据', href: '#uv-vertex-data' },
    { label: 'UV 自动插值', href: '#uv-interpolation' },
    { label: 'V 方向与图像翻转', href: '#uv-direction' },
    { label: '超出范围的 UV', href: '#uv-outside-range' },
    { label: '纹理过滤实验', href: '#sampling-lab' },
    { label: 'Sampler 与纹理单元', href: '#sampler-binding' },
    { label: '完整代码', href: '#texture-complete-source' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'image-processing-basics': [
    { label: '像素函数', href: '#pixel-function' },
    { label: '颜色运算', href: '#color-operation' },
    { label: '颜色实验', href: '#color-lab' },
    { label: '重新绘制边界', href: '#redraw-boundary' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'convolution-kernels': [
    { label: '3×3 采样邻域', href: '#neighborhood' },
    { label: '加权求和', href: '#weighted-sum' },
    { label: '卷积核实验', href: '#kernel-lab' },
    { label: '权重与亮度', href: '#kernel-weight' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'convolution-matrix-guide': [
    { label: '图像与卷积核（Kernel）', href: '#image-and-kernel' },
    { label: '单像素计算示例', href: '#one-pixel-example' },
    { label: '除数（Divisor）与偏移量（Offset）', href: '#divisor-and-offset' },
    { label: '边缘处理（Border）', href: '#border-modes' },
    { label: '通道（Channels）与透明度（Alpha）', href: '#channels-and-alpha' },
    { label: '归一化（Normalize）', href: '#normalise' },
    { label: '完整实验', href: '#convolution-matrix-lab' },
    { label: 'WebGL2 映射', href: '#webgl-mapping' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'image-effects': [
    { label: '四类效果', href: '#effect-families' },
    { label: '预设数值', href: '#preset-values' },
    { label: '效果实验', href: '#effects-lab' },
    { label: '纹理边缘', href: '#texture-edges' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'multi-pass-image-processing': [
    { label: '为何需要多个 Pass', href: '#why-multipass' },
    { label: 'Framebuffer 目标', href: '#framebuffer-target' },
    { label: 'Ping-Pong 纹理', href: '#ping-pong' },
    { label: '多阶段实验', href: '#pipeline-lab' },
    { label: '切换目标状态', href: '#target-switch' },
    { label: '本章完成', href: '#next-steps' },
  ],
  'translation-2d': [
    { label: '为何拆出位置', href: '#translation-boundary' },
    { label: '局部几何', href: '#local-geometry' },
    { label: '平移 Uniform', href: '#translation-uniform' },
    { label: '平移实验', href: '#translation-lab' },
    { label: '重新绘制', href: '#translation-redraw' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'rotation-2d': [
    { label: '单位圆', href: '#unit-circle' },
    { label: '角度与弧度', href: '#radians' },
    { label: '旋转公式', href: '#rotation-formula' },
    { label: '代入一个点', href: '#rotation-example' },
    { label: '旋转实验', href: '#rotation-lab' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'scale-2d': [
    { label: '缩放与距离', href: '#scale-distance' },
    { label: '变换顺序', href: '#scale-order' },
    { label: '缩放实验', href: '#scale-lab' },
    { label: '负缩放', href: '#negative-scale' },
    { label: '缩放中心', href: '#scale-origin' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'matrices-2d': [
    { label: '齐次坐标', href: '#homogeneous-coordinate' },
    { label: '逐项推导', href: '#matrix-derivation' },
    { label: '变换矩阵', href: '#matrix-factories' },
    { label: '投影矩阵', href: '#projection-matrix' },
    { label: '矩阵 Shader', href: '#matrix-shader' },
    { label: '统一 Shader 接口', href: '#shader-interface' },
    { label: '矩阵实验', href: '#matrix-lab' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'unified-2d-transforms': [
    { label: '组合矩阵', href: '#composition' },
    { label: 'CPU 端组合', href: '#cpu-composition' },
    { label: '顺序影响结果', href: '#order-matters' },
    { label: '顺序实验', href: '#order-lab' },
    { label: '层级与旋转中心', href: '#hierarchy-and-pivot' },
    { label: '两种阅读方向', href: '#space-reading' },
    { label: 'Canvas 尺寸', href: '#canvas-size' },
    { label: '完整数据流', href: '#complete-flow' },
    { label: '二维章节完成', href: '#next-steps' },
  ],
  'orthographic-3d': [
    { label: '从 mat3 到 mat4', href: '#mat4-upgrade' },
    { label: '立体几何与颜色', href: '#volume-geometry' },
    { label: '三个旋转轴', href: '#three-axes' },
    { label: '正射投影体', href: '#orthographic-volume' },
    { label: '面剔除与深度', href: '#depth-and-culling' },
    { label: '正射实验', href: '#orthographic-lab' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'perspective-3d': [
    { label: '近大远小', href: '#distance-scaling' },
    { label: '透视除法', href: '#perspective-divide' },
    { label: 'W 分量', href: '#w-component' },
    { label: '视锥与裁剪面', href: '#frustum' },
    { label: '透视矩阵', href: '#perspective-matrix' },
    { label: '透视实验', href: '#perspective-lab' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'camera-3d': [
    { label: '移动整个世界', href: '#move-the-world' },
    { label: '相机矩阵与逆矩阵', href: '#camera-inverse' },
    { label: '共享 ViewProjection', href: '#shared-view-projection' },
    { label: '构造 lookAt', href: '#look-at' },
    { label: '相机实验', href: '#camera-lab' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'matrix-naming-3d': [
    { label: '用空间命名', href: '#space-naming' },
    { label: '读取乘法方向', href: '#read-the-chain' },
    { label: '常见命名对照', href: '#naming-table' },
    { label: '接口约定', href: '#contract' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'model-view-projection': [
    { label: '三类矩阵职责', href: '#three-responsibilities' },
    { label: '完整空间链', href: '#mvp-chain' },
    { label: '共享与逐物体更新', href: '#update-frequency' },
    { label: 'MVP 实验', href: '#mvp-lab' },
    { label: '数据流闭环', href: '#complete-3d-flow' },
    { label: '三维基础完成', href: '#next-steps' },
  ],
};

export const sourceByLesson: Record<LessonId, string> = {
  'getting-webgl2': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-getting-webgl2.html',
  'common-apis': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html',
  fundamentals: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html',
  'how-it-works': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-how-it-works.html',
  'shaders-and-glsl': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-shaders-and-glsl.html',
  'state-diagram': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-state-diagram.html',
  'texture-sampling': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-image-processing.html',
  'image-processing-basics': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-image-processing.html',
  'convolution-kernels': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-image-processing.html',
  'convolution-matrix-guide': 'https://docs.gimp.org/2.6/en/plug-in-convmatrix.html',
  'image-effects': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-image-processing.html',
  'multi-pass-image-processing': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-image-processing-continued.html',
  'translation-2d': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-translation.html',
  'rotation-2d': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-rotation.html',
  'scale-2d': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-scale.html',
  'matrices-2d': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-matrices.html',
  'unified-2d-transforms': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-matrices.html',
  'orthographic-3d': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-orthographic.html',
  'perspective-3d': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-perspective.html',
  'camera-3d': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-camera.html',
  'matrix-naming-3d': 'https://webgl2fundamentals.org/webgl/lessons/webgl-3d-matrix-naming.html',
  'model-view-projection': 'https://webgl2fundamentals.org/webgl/lessons/webgl-3d-matrix-naming.html',
};

export function parseLessonId(search: string): LessonId {
  const lesson = new URLSearchParams(search).get('lesson');
  if (
    lesson === 'getting-webgl2' ||
    lesson === 'common-apis' ||
    lesson === 'how-it-works' ||
    lesson === 'shaders-and-glsl' ||
    lesson === 'state-diagram' ||
    lesson === 'texture-sampling' ||
    lesson === 'image-processing-basics' ||
    lesson === 'convolution-kernels' ||
    lesson === 'convolution-matrix-guide' ||
    lesson === 'image-effects' ||
    lesson === 'multi-pass-image-processing' ||
    lesson === 'translation-2d' ||
    lesson === 'rotation-2d' ||
    lesson === 'scale-2d' ||
    lesson === 'matrices-2d' ||
    lesson === 'unified-2d-transforms' ||
    lesson === 'orthographic-3d' ||
    lesson === 'perspective-3d' ||
    lesson === 'camera-3d' ||
    lesson === 'matrix-naming-3d' ||
    lesson === 'model-view-projection'
  ) return lesson;
  return 'fundamentals';
}

export function readLessonId(): LessonId {
  return parseLessonId(window.location.search);
}
