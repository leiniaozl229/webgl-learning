# WebGL2 Learning 课程大纲

本课程以 [WebGL2 Fundamentals 中文教程](https://webgl2fundamentals.org/webgl/lessons/zh_cn/) 的知识路线为基础，结合 TypeScript、React 和现代浏览器 API 重新组织内容。课程强调数据如何从 JavaScript 进入 GPU、WebGL2 状态如何协作，以及每个渲染阶段的可视化验证。

## 内容原则

- 每篇只引入一组紧密相关的新概念。
- 先解释数据和状态之间的关系，再展示完整代码。
- 关键流程尽量提供动画、状态图或可交互实验。
- 示例统一使用 WebGL2、GLSL ES 3.00 和 TypeScript。
- 代码面板优先提供 `vertex-data.ts`、`vertex.glsl`、`fragment.glsl` 三类源码。
- 对旧教程中的浏览器版本和兼容性描述进行现代化校正。

## 1. 开始：基础概念

- 怎样使用 WebGL2
- WebGL2 基本原理
- WebGL2 如何工作
- 着色器与 GLSL
- WebGL2 状态图

当前进度：

- [x] 怎样使用 WebGL2
- [x] WebGL2 基本原理
- [x] WebGL2 如何工作
- [x] 着色器与 GLSL
- [x] WebGL2 状态图

## 2. WebGL2 与 WebGL1

- WebGL2 有什么新内容
- 从 WebGL1 迁移到 WebGL2
- WebGL Fundamentals 与 WebGL2 Fundamentals 的区别

## 3. 图像处理

- [x] 图像上传与纹理采样
- [x] 图像处理基础
- [x] 卷积核
- [x] 模糊、锐化与边缘检测
- [x] 多阶段图像处理

## 4. 二维变换与矩阵

- [x] 二维平移
- [x] 二维旋转
- [x] 二维缩放
- [x] 二维矩阵
- [x] 使用矩阵统一表达二维变换

推荐顺序：平移 → 旋转 → 缩放 → 矩阵。

## 5. 三维基础

- 三维正射投影
- 三维透视投影
- 三维相机
- WebGL2 三维矩阵命名
- 模型、视图与投影矩阵

## 6. 光照

- 法线与表面方向
- 三维方向光
- 点光源
- 聚光灯
- 漫反射与镜面反射
- 光照衰减
- 法线矩阵

## 7. 代码组织与场景管理

- 减少样板代码
- 封装 Shader 和 Program
- 管理 Buffer、VAO 与 Texture
- 绘制多个物体
- 场景图
- 父子节点与层级变换

## 8. 几何与模型

- 三维几何加工
- 顶点索引
- 法线生成
- 加载 `.obj` 文件
- 加载带 `.mtl` 的 `.obj` 文件
- 网格与材质数据结构

## 9. 纹理

- 纹理基础
- UV 坐标
- 过滤、环绕与 Mipmap
- 数据纹理
- 使用多个纹理
- 跨域图像
- 纹理映射的透视校正
- 平面投影与透视投影映射

## 10. 渲染到纹理

- Framebuffer 基础
- 颜色附件与深度附件
- 离屏渲染
- 多阶段渲染
- 后处理流程

## 11. 阴影

- 阴影映射原理
- 从光源视角渲染
- 深度纹理
- 阴影判断
- Shadow Acne
- PCF 阴影柔化

## 12. 二维技术

- 二维 `drawImage`
- 二维矩阵栈
- 精灵与 Sprite Sheet
- 2D 相机
- 图层排序
- 批量绘制

## 13. 三维技术

- 立方体贴图
- 天空盒
- 环境贴图
- 雾
- 拾取与点击物体
- 骨骼与蒙皮

推荐顺序：立方体贴图 → 天空盒 → 环境贴图 → 雾 → 拾取 → 蒙皮。

## 14. 文字渲染

- 使用 HTML 显示文字
- 使用二维 Canvas 生成文字
- 使用普通纹理显示文字
- 使用字形纹理显示文字
- 清晰度、性能与排版能力对比

## 15. GPGPU

- 使用纹理存储数据
- 使用片段着色器执行计算
- 使用 Framebuffer 保存结果
- Ping-Pong Buffer
- 读取计算结果

## 16. WebGL2 技巧

- 最小的 WebGL2 程序
- 无顶点数据绘制
- `gl_VertexID`
- 全屏三角形
- Shadertoy 工作方式
- 顶点拉取

## 17. 性能优化

- 使用 `gl.drawElements` 绘制索引几何体
- 实例化绘制
- 减少 Draw Call
- 减少 VAO、Program 和纹理切换
- 批处理
- 避免不必要的 CPU 与 GPU 同步
- 性能查询与分析

## 18. Canvas、动画与跨平台

- 项目设置与样板代码
- 调整 Canvas 绘图缓冲区尺寸
- 动画循环
- 点、线段与三角形
- 多视图与多画布
- 可视化相机
- WebGL2 与 Alpha
- 2D 与 3D 库的职责
- 常见反模式
- WebGL2 矩阵与数学矩阵
- 精度问题
- 截取 Canvas
- 保留绘制结果
- Canvas 键盘输入
- 使用 WebGL2 作为 HTML 背景
- 跨平台问题
- 常见问题与解答

## 19. API 参考

- Attributes
- Uniforms
- Texture Units
- Framebuffers
- `readPixels`
- 上下文丢失与恢复
- WebGL2 API 资料
- TWGL 辅助库

## 侧边导航建议

```text
开始
├── 怎样使用 WebGL2
├── WebGL2 基本原理
├── WebGL2 如何工作
├── 着色器与 GLSL
└── WebGL2 状态图

二维
├── 图像处理
├── 二维平移
├── 二维旋转
├── 二维缩放
└── 二维矩阵

三维
├── 三维正射投影
├── 三维透视投影
├── 三维相机
└── 三维矩阵

光照
├── 方向光
├── 点光源
└── 聚光灯

工程化
├── 绘制多个物体
├── 场景图
├── OBJ 模型
└── MTL 材质

纹理与渲染
├── 纹理
├── 多纹理
├── 数据纹理
├── 渲染到纹理
└── 阴影

高级技术
├── 立方体贴图
├── 天空盒
├── 环境贴图
├── 雾
├── 拾取
├── 蒙皮
└── GPGPU

性能与参考
├── 顶点索引
├── 实例化绘制
├── Canvas 与动画
├── 跨平台与精度
└── API 参考
```

## 参考资料

- [WebGL2 Fundamentals 中文教程](https://webgl2fundamentals.org/webgl/lessons/zh_cn/)
- [WebGL2RenderingContext - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext)
- [WebGL 2.0 Specification](https://registry.khronos.org/webgl/specs/latest/2.0/)
