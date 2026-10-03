export const effectIds = ['waves', 'ribbons', 'clouds', 'sdf', 'color', 'glass', 'chroma', 'stars', 'grain', 'dither', 'halftone', 'cells', 'bloom', 'feedback', 'raymarch', 'geometry'] as const;
export type EffectId = typeof effectIds[number];

export interface EffectOptions {
  kind: number;
  params: readonly [number, number, number];
  variant: number;
  compare: boolean;
}

export function parseEffectId(value: string | null): EffectId {
  return (effectIds as readonly string[]).includes(value ?? '') ? value as EffectId : 'waves';
}

/** 网格中的每个顶点保存 position.xyz 和 uv.xy：stride = 20 字节，UV offset = 12 字节。 */
export function createEffectMesh(divisions: number) {
  const count = Math.max(2, Math.min(96, Math.round(divisions)));
  const vertices = new Float32Array((count + 1) ** 2 * 5);
  const indices = new Uint16Array(count * count * 6);
  for (let y = 0; y <= count; y++) {
    for (let x = 0; x <= count; x++) {
      const offset = (y * (count + 1) + x) * 5;
      vertices.set([x / count * 2 - 1, y / count * 1.3 - 0.65, 0, x / count, y / count], offset);
    }
  }
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      const a = y * (count + 1) + x, b = a + 1, c = a + count + 1, d = c + 1;
      // 相邻三角形共享边，保持从正面看逆时针的绕序。
      indices.set([a, b, c, c, b, d], (y * count + x) * 6);
    }
  }
  return { vertices, indices, divisions: count };
}

export function diffusionWeight(amount: number, dt: number): number {
  // 四邻域显式更新中，每个邻居的权重 ≤ 1/4，中心权重保持非负。
  return Math.min(0.24, Math.max(0, amount * Math.max(0, dt) * 30));
}
