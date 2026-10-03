// 课程 ID 的唯一来源：类型、URL 解析和测试都从这里派生，新增课程时只需在此登记。
export const lessonIds = [
  'getting-webgl2',
  'common-apis',
  'fundamentals',
  'how-it-works',
  'shaders-and-glsl',
  'state-diagram',
  'vectors',
  'trigonometry',
  'dot-and-cross',
  'matrix-math',
  'inverse-and-normals',
  'texture-sampling',
  'image-processing-basics',
  'convolution-kernels',
  'convolution-matrix-guide',
  'image-effects',
  'multi-pass-image-processing',
  'translation-2d',
  'rotation-2d',
  'scale-2d',
  'matrices-2d',
  'unified-2d-transforms',
  'orthographic-3d',
  'perspective-3d',
  'camera-3d',
  'matrix-naming-3d',
  'model-view-projection',
  'openshaders-breakdown',
  'shader-effects-handbook',
] as const;

export type LessonId = typeof lessonIds[number];

export const lessonTitles: Record<LessonId, string> = {
  'getting-webgl2': '怎样使用 WebGL2',
  'common-apis': '常用 WebGL2 API',
  fundamentals: 'WebGL2 的基本原理',
  'how-it-works': 'WebGL2 如何工作',
  'shaders-and-glsl': '着色器与 GLSL',
  'state-diagram': 'WebGL2 状态图',
  vectors: '向量、长度与单位化',
  trigonometry: '角度、弧度与三角函数',
  'dot-and-cross': '点积、叉积与坐标基',
  'matrix-math': '矩阵基础：从二维到三维',
  'inverse-and-normals': '逆矩阵、转置与法线矩阵',
  'texture-sampling': '图像上传与纹理采样',
  'image-processing-basics': '图像处理基础',
  'convolution-kernels': '卷积核',
  'convolution-matrix-guide': '卷积矩阵详解',
  'image-effects': '模糊、锐化与边缘检测',
  'multi-pass-image-processing': '多阶段图像处理',
  'translation-2d': '二维平移',
  'rotation-2d': '二维旋转',
  'scale-2d': '二维缩放',
  'matrices-2d': '二维矩阵',
  'unified-2d-transforms': '使用矩阵统一表达二维变换',
  'orthographic-3d': '三维正射投影',
  'perspective-3d': '三维透视投影',
  'camera-3d': '三维相机',
  'matrix-naming-3d': 'WebGL2 三维矩阵命名',
  'model-view-projection': '模型、视图与投影矩阵',
  'openshaders-breakdown': 'OpenShaders 效果拆解',
  'shader-effects-handbook': 'Shader 效果常见手法',
};

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
    label: '数学',
    items: [
      { id: 'vectors', label: '向量与单位化', href: lessonHref('vectors') },
      { id: 'trigonometry', label: '弧度与三角函数', href: lessonHref('trigonometry') },
      { id: 'dot-and-cross', label: '点积与叉积', href: lessonHref('dot-and-cross') },
      { id: 'matrix-math', label: '矩阵基础：从二维到三维', href: lessonHref('matrix-math') },
      { id: 'inverse-and-normals', label: '逆矩阵与法线矩阵', href: lessonHref('inverse-and-normals') },
    ],
  },
  {
    label: '图像处理',
    items: [
      { id: 'texture-sampling', label: '图像上传与纹理采样', href: lessonHref('texture-sampling') },
      { id: 'image-processing-basics', label: '图像处理基础', href: lessonHref('image-processing-basics') },
      { id: 'convolution-kernels', label: '卷积核', href: lessonHref('convolution-kernels') },
      { id: 'convolution-matrix-guide', label: '卷积矩阵详解', href: lessonHref('convolution-matrix-guide') },
      { id: 'image-effects', label: '模糊、锐化与边缘检测', href: lessonHref('image-effects') },
      { id: 'multi-pass-image-processing', label: '多阶段图像处理', href: lessonHref('multi-pass-image-processing') },
    ],
  },
  {
    label: '二维变换',
    items: [
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
  {
    label: 'Shader 实战',
    items: [
      { id: 'openshaders-breakdown', label: 'OpenShaders 效果拆解', href: lessonHref('openshaders-breakdown') },
      { id: 'shader-effects-handbook', label: 'Shader 效果常见手法', href: lessonHref('shader-effects-handbook') },
    ],
  },
];

// 上一篇 / 下一篇按侧边栏顺序派生，保证分页与目录始终一致。
export const lessonSequence: LessonId[] = navigationGroups.flatMap((group) => group.items.flatMap((item) => item.id ? [item.id] : []));

const navigationLabels = new Map(navigationGroups.flatMap((group) => group.items.flatMap((item) => item.id ? [[item.id, item.label] as const] : [])));

/** 侧边栏使用的短标题，适合分页按钮等空间有限的位置。 */
export function lessonNavLabel(lessonId: LessonId): string {
  return navigationLabels.get(lessonId) ?? lessonTitles[lessonId];
}

export function adjacentLessons(lessonId: LessonId): { previous?: LessonId; next?: LessonId } {
  const index = lessonSequence.indexOf(lessonId);
  return {
    previous: index > 0 ? lessonSequence[index - 1] : undefined,
    next: index >= 0 && index < lessonSequence.length - 1 ? lessonSequence[index + 1] : undefined,
  };
}

export const tableOfContentsByLesson: Record<LessonId, TableOfContentsItem[]> = {
  'shader-effects-handbook': [
    { label: '十六类效果实验台', href: '#effect-gallery' },
    { label: '七步噪声光环实验', href: '#handbook-experiment' },
    { label: '十六类效果速查', href: '#effect-index' },
    { label: '输入、运算与输出', href: '#effect-dataflow' },
    { label: '坐标变换', href: '#effect-coordinates' },
    { label: 'SDF 与形状边缘', href: '#effect-sdf' },
    { label: '波形与时间', href: '#effect-waves' },
    { label: '噪声、fBM 与扭曲', href: '#effect-noise' },
    { label: '颜色与亮度', href: '#effect-color' },
    { label: '发光与丝带', href: '#effect-glow' },
    { label: '法线、反射与折射', href: '#effect-material' },
    { label: '纹理扭曲与色差', href: '#effect-sampling' },
    { label: '颗粒与单元表达', href: '#effect-stylization' },
    { label: 'Bloom 管线', href: '#effect-bloom' },
    { label: 'Ping-Pong 帧间状态', href: '#effect-feedback' },
    { label: '三维射线步进', href: '#effect-3d' },
    { label: '顶点位移', href: '#effect-geometry' },
    { label: '工程与性能', href: '#effect-performance' },
    { label: '组合自己的效果', href: '#effect-recipes' },
    { label: '继续实验', href: '#next-steps' },
  ],
  'openshaders-breakdown': [
    { label: '八步交互拆解', href: '#ribbon-walkthrough' },
    { label: '名字怎样进入 Shader', href: '#name-to-uniforms' },
    { label: '两遍绘制的数据流', href: '#field-and-post' },
    { label: '九种表面表达', href: '#surface-techniques' },
    { label: '与原站的实现差别', href: '#production-differences' },
    { label: '继续实验', href: '#next-steps' },
  ],
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
  vectors: [
    { label: '点与向量', href: '#points-and-vectors' },
    { label: '加法与减法', href: '#add-and-subtract' },
    { label: '标量乘法', href: '#scalar-multiply' },
    { label: '长度与距离', href: '#length' },
    { label: '单位化', href: '#normalize' },
    { label: '向量实验', href: '#vector-lab' },
    { label: 'GLSL 中的向量', href: '#glsl-vectors' },
    { label: '容易混淆的地方', href: '#pitfalls' },
    { label: '继续学习', href: '#next-steps' },
  ],
  trigonometry: [
    { label: '弧度的定义', href: '#radian-definition' },
    { label: '单位圆', href: '#unit-circle' },
    { label: '三角函数实验', href: '#trig-lab' },
    { label: '极坐标生成几何', href: '#polar-geometry' },
    { label: 'atan2 求方向角', href: '#atan2' },
    { label: '视野角与 tan', href: '#field-of-view' },
    { label: '用 sin 做动画', href: '#oscillation' },
    { label: '容易混淆的地方', href: '#pitfalls' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'dot-and-cross': [
    { label: '点积的两种读法', href: '#dot-definition' },
    { label: '点积实验', href: '#dot-lab' },
    { label: '点积与光照', href: '#dot-lighting' },
    { label: '叉积与垂直方向', href: '#cross-definition' },
    { label: '绕序与面剔除', href: '#winding-lab' },
    { label: '构造坐标基', href: '#basis' },
    { label: '容易混淆的地方', href: '#pitfalls' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'matrix-math': [
    { label: '标量、向量与矩阵', href: '#scalar-vector-matrix' },
    { label: '行列与形状', href: '#rows-columns-shape' },
    { label: '矩阵乘向量', href: '#matrix-vector-product' },
    { label: '坐标轴与矩阵列', href: '#basis-columns' },
    { label: '齐次坐标', href: '#homogeneous-coordinates' },
    { label: 'mat3 到 mat4', href: '#mat3-to-mat4' },
    { label: '组合顺序', href: '#composition-order' },
    { label: '存储与上传', href: '#storage-and-upload' },
    { label: '单位、逆与转置', href: '#identity-and-inverse' },
    { label: '连接二维与三维', href: '#webgl-connections' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'inverse-and-normals': [
    { label: '逆矩阵撤销变换', href: '#inverse-undo' },
    { label: '行列式与可逆性', href: '#determinant' },
    { label: '行列式实验', href: '#determinant-lab' },
    { label: '组合矩阵的逆', href: '#inverse-order' },
    { label: '转置与正交矩阵', href: '#transpose' },
    { label: '法线为什么会歪', href: '#normal-problem' },
    { label: '法线矩阵实验', href: '#normal-lab' },
    { label: '在 WebGL2 中使用', href: '#normal-matrix-webgl' },
    { label: '容易混淆的地方', href: '#pitfalls' },
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
  'shader-effects-handbook': 'https://thebookofshaders.com/',
  'openshaders-breakdown': 'https://openshaders.com/explore',
  'getting-webgl2': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-getting-webgl2.html',
  'common-apis': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html',
  fundamentals: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html',
  'how-it-works': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-how-it-works.html',
  'shaders-and-glsl': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-shaders-and-glsl.html',
  'state-diagram': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-state-diagram.html',
  vectors: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-camera.html',
  trigonometry: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-rotation.html',
  'dot-and-cross': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-lighting-directional.html',
  'matrix-math': 'https://webgl2fundamentals.org/webgl/lessons/webgl-matrix-vs-math.html',
  'inverse-and-normals': 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-lighting-directional.html',
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
  return (lessonIds as readonly string[]).includes(lesson ?? '') ? lesson as LessonId : 'fundamentals';
}

export function readLessonId(): LessonId {
  return parseLessonId(window.location.search);
}
