#version 300 es
precision highp float;
uniform sampler2D u_previous;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_dt;
uniform float u_decay;
uniform float u_emission;
uniform float u_diffusion;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution, texel = 1.0 / u_resolution;
  vec3 previous = texture(u_previous, uv).rgb;
  vec3 neighbours = texture(u_previous, uv + vec2(texel.x, 0)).rgb
    + texture(u_previous, uv - vec2(texel.x, 0)).rgb
    + texture(u_previous, uv + vec2(0, texel.y)).rgb
    + texture(u_previous, uv - vec2(0, texel.y)).rgb;
  // JavaScript 将四邻域权重限制为 0～0.24；纹理边界采用 CLAMP_TO_EDGE。
  vec3 diffused = previous + u_diffusion * (neighbours - 4.0 * previous);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  p /= min(1.0, u_resolution.x / u_resolution.y);
  vec2 centre = 0.29 * vec2(cos(u_time * 0.8), sin(u_time * 1.1));
  float emitter = exp(-dot(p - centre, p - centre) / 0.0008);
  vec3 color = 0.5 + 0.5 * cos(6.2831853 * (u_time * 0.03 + vec3(0, 0.33, 0.67)));
  vec3 nextState = diffused * exp(-u_decay * u_dt) + color * emitter * u_emission * u_dt * 30.0;
  outColor = vec4(nextState, 1.0);
}
