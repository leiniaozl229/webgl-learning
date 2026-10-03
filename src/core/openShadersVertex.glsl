#version 300 es
void main() {
  // 由顶点编号生成大三角形；光栅化覆盖整个 viewport。
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
