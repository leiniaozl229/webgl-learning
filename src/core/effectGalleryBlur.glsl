#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform vec2 u_texel;
uniform vec2 u_direction;
uniform float u_radius;
uniform float u_threshold;
uniform bool u_extract;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy * u_texel;
  vec3 color;
  if (u_extract) {
    color = texture(u_input, uv).rgb;
    float brightness = max(color.r, max(color.g, color.b));
    color *= max(brightness - u_threshold, 0.0) / max(brightness, 0.001);
  } else {
    vec2 shift = u_direction * u_texel * u_radius;
    color = texture(u_input, uv).rgb * 0.227027;
    color += texture(u_input, uv + shift * 1.0).rgb * 0.1945946;
    color += texture(u_input, uv - shift * 1.0).rgb * 0.1945946;
    color += texture(u_input, uv + shift * 2.0).rgb * 0.1216216;
    color += texture(u_input, uv - shift * 2.0).rgb * 0.1216216;
    color += texture(u_input, uv + shift * 3.0).rgb * 0.054054;
    color += texture(u_input, uv - shift * 3.0).rgb * 0.054054;
    color += texture(u_input, uv + shift * 4.0).rgb * 0.016216;
    color += texture(u_input, uv - shift * 4.0).rgb * 0.016216;
  }
  outColor = vec4(color, 1.0);
}
