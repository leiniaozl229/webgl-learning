// 泛光：u_direction = (0, 0) 时从全分辨率降到 ¼，四个双线性采样覆盖 4×4 像素；
// 否则沿 u_direction 做 9 点高斯模糊，用 5 次双线性采样完成。
uniform sampler2D u_source;
uniform vec2 u_texel;     // 源纹理一个像素的大小（uv 单位）
uniform vec2 u_direction; // 模糊方向与步长（源像素）
uniform vec2 u_target;    // 目标尺寸（像素）

out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_target;
  if (u_direction == vec2(0.0)) {
    vec2 o = u_texel;
    outColor = 0.25 * (texture(u_source, uv + vec2(-o.x, -o.y)) + texture(u_source, uv + vec2(o.x, -o.y))
                     + texture(u_source, uv + vec2(-o.x, o.y)) + texture(u_source, uv + vec2(o.x, o.y)));
    return;
  }
  vec2 d = u_direction * u_texel;
  outColor = texture(u_source, uv) * 0.2270270270
    + (texture(u_source, uv + d * 1.3846153846) + texture(u_source, uv - d * 1.3846153846)) * 0.3162162162
    + (texture(u_source, uv + d * 3.2307692308) + texture(u_source, uv - d * 3.2307692308)) * 0.0702702703;
}
