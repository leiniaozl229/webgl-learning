#version 300 es
precision highp float;

in float v_ring;           // 圆心 0 → 圆周 1，在三角形内部线性插值
in float v_wave;           // 圆周上的 sin 值；圆心处为 0

uniform vec3 u_centerColor;
uniform vec3 u_rimColor;
uniform vec3 u_lineColor;
uniform bool u_drawLines;  // 第二次绘制 LINE_STRIP 线框时为 true

out vec4 outColor;

void main() {
  if (u_drawLines) {
    outColor = vec4(u_lineColor, 1.0);
    return;
  }
  vec3 color = mix(u_centerColor, u_rimColor, v_ring);
  // 波峰略亮、波谷略暗，sin 的正负也能从颜色看出来。
  color *= 1.0 + 0.18 * v_wave;
  outColor = vec4(color, 1.0);
}
