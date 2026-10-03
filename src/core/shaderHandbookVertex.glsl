#version 300 es

void main() {
  // 三个顶点覆盖当前 viewport；片段阶段根据目标尺寸建立坐标。
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
