import { describe, expect, it } from 'vitest';
import { createEffectMesh, diffusionWeight } from './effectGallery';

describe('indexed effect mesh', () => {
  it('shares edge vertices and keeps every triangle inside the uploaded vertex range', () => {
    const { vertices, indices } = createEffectMesh(48);
    expect(vertices.length / 5).toBe(49 * 49);
    expect(indices.length).toBe(48 * 48 * 6);
    expect(Math.max(...indices)).toBe(vertices.length / 5 - 1);
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = [indices[i] * 5, indices[i + 1] * 5, indices[i + 2] * 5];
      const winding = (vertices[b] - vertices[a]) * (vertices[c + 1] - vertices[a + 1])
        - (vertices[b + 1] - vertices[a + 1]) * (vertices[c] - vertices[a]);
      expect(winding).toBeGreaterThan(0);
    }
  });
  it('keeps the largest UI mesh addressable with 16-bit indices and byte offsets', () => {
    const { vertices, indices, divisions } = createEffectMesh(200);
    expect(divisions).toBe(96);
    expect(vertices.BYTES_PER_ELEMENT * 5).toBe(20);
    expect(vertices.BYTES_PER_ELEMENT * 3).toBe(12);
    expect(indices.BYTES_PER_ELEMENT).toBe(2);
    expect(vertices.length / 5).toBeLessThan(65536);
    expect(Math.max(...indices)).toBe(vertices.length / 5 - 1);
  });
});

describe('four-neighbour diffusion', () => {
  it('retains nonnegative weights even after a delayed animation frame', () => {
    for (const dt of [0, 1 / 120, 1 / 30, 1, 10]) {
      const weight = diffusionWeight(0.22, dt);
      expect(weight).toBeGreaterThanOrEqual(0);
      expect(1 - 4 * weight).toBeGreaterThanOrEqual(0);
    }
    expect(diffusionWeight(0.22, 1 / 30)).toBeCloseTo(0.22);
    expect(diffusionWeight(0.22, 0)).toBe(0);
    expect(diffusionWeight(-1, 1)).toBe(0);
  });
});
