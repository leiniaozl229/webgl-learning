#version 300 es
precision highp float;
precision highp int;
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec2 a_uv;
uniform mat4 u_matrix;
uniform float u_time;
uniform float u_amplitude;
uniform int u_variant;
out vec3 v_normal;
out vec3 v_position;
out vec2 v_uv;
void main() {
  vec3 p = a_position;
  float phase = p.x * 5.0 - u_time * 2.0;
  if (u_variant == 0) {
    float second = p.y * 7.0 - u_time * 1.4;
    float h = u_amplitude * sin(phase) * cos(second);
    float dx = u_amplitude * 5.0 * cos(phase) * cos(second);
    float dz = -u_amplitude * 7.0 * sin(phase) * sin(second);
    p = vec3(p.x, h, -p.y);
    v_normal = normalize(vec3(-dx, 1.0, dz));
  } else {
    // 左边固定，位移与解析导数都包含从旗杆到自由端的振幅包络。
    float envelope = a_uv.x;
    float wave = phase + p.y * 2.0;
    p.z = u_amplitude * envelope * sin(wave);
    float dx = u_amplitude * (0.5 * sin(wave) + envelope * 5.0 * cos(wave));
    float dy = u_amplitude * envelope * 2.0 * cos(wave);
    v_normal = normalize(vec3(-dx, -dy, 1.0));
  }
  v_position = p; v_uv = a_uv;
  gl_Position = u_matrix * vec4(p, 1.0);
}
