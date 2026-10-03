#version 300 es
precision highp float;
precision highp int;
in vec3 v_normal;
in vec3 v_position;
in vec2 v_uv;
uniform vec3 u_camera;
uniform int u_variant;
uniform bool u_wire;
uniform float u_divisions;
out vec4 outColor;
void main() {
  vec3 normal = normalize(v_normal);
  if (!gl_FrontFacing) normal = -normal;
  vec3 light = normalize(vec3(-0.4, 0.8, 1.0));
  vec3 view = normalize(u_camera - v_position);
  float diffuse = max(dot(normal, light), 0.0);
  float specular = pow(max(dot(reflect(-light, normal), view), 0.0), 48.0);
  vec3 base = vec3(0.025, 0.36, 0.57);
  if (u_variant == 1) base = mix(vec3(0.05, 0.32, 0.73), vec3(0.91, 0.93, 0.97), step(0.5, fract(v_uv.y * 5.0)));
  vec3 color = base * (0.25 + 0.75 * diffuse) + vec3(specular * 0.55);
  if (u_wire) {
    vec2 cell = v_uv * u_divisions;
    vec2 edge = min(fract(cell), 1.0 - fract(cell));
    vec2 width = max(fwidth(cell), vec2(0.0001));
    float grid = 1.0 - smoothstep(0.0, 1.0, min(edge.x / width.x, edge.y / width.y));
    color = mix(color, vec3(0.7, 0.88, 1.0), grid * 0.75);
  }
  outColor = vec4(color, 1.0);
}
