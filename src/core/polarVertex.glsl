#version 300 es

// 来自 Buffer：x 是 0…1 的角度进度 t，y 是 ring（圆心 0、圆周 1）。
// location 0 与 JavaScript 中 vertexAttribPointer 的第一个参数一致。
layout(location = 0) in vec2 a_polar;

// 每次绘制由 JavaScript 上传；所有角度都是弧度。
uniform float u_startAngle;  // θ₀：滑块度数 × π / 180
uniform float u_sweep;       // 扫掠角：2π 表示整圆
uniform float u_radius;      // 基础半径 R，裁剪空间单位
uniform float u_amplitude;   // A：半径偏离 R 的最大比例
uniform float u_waveCount;   // k：绕一圈出现的波峰数
uniform float u_phase;       // φ：播放时每帧增加 ω × Δt
uniform vec2 u_aspectScale;  // 压缩 Canvas 较长的一边，让圆保持圆形

out float v_ring;            // 圆心 → 圆周的进度，交给片段着色器上色
out float v_wave;            // 圆周处的 sin 值，波峰为正

void main() {
  // 1. t 线性映射为图形自身的角度：0 … sweep。
  float localAngle = a_polar.x * u_sweep;

  // 2. 半径随角度做正弦波动。sweep = 2π 且 k 为整数时，终点与起点相位相同，首尾闭合。
  float wave = sin(u_waveCount * localAngle + u_phase);
  float r = u_radius * a_polar.y * (1.0 + u_amplitude * wave);

  // 3. 每个顶点的角度都加上 θ₀：在极坐标中，这就是整体旋转。
  float theta = u_startAngle + localAngle;

  // 4. 极坐标 → 笛卡尔坐标：单位方向 (cos θ, sin θ) 乘以长度 r。
  vec2 position = r * vec2(cos(theta), sin(theta));

  gl_Position = vec4(position * u_aspectScale, 0.0, 1.0);
  v_ring = a_polar.y;
  v_wave = wave * a_polar.y;
}
