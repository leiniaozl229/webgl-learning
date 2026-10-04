---
version: 1
slug: "src-demo-components-homogeneouswsection-tsx"
primary_target: "src/demo/components/HomogeneousWSection.tsx"
related_targets: ["src/demo/components/MathArticles.tsx", "src/demo/components/MathLabs.tsx", "src/demo/navigation.ts", "src/demo/style.css"]
---

# 向量课程：w 与齐次坐标

Mode: Read. The user asks to expand the explanation of w in the existing vectors lesson. This is a narrow, code-led addition to the incumbent lesson, with no replacement identity, global design change or raster assets.

## Direction contract

THESIS: Explain why a position uses w = 1, a direction uses w = 0, and how projected w participates in perspective division.
OWN-WORLD: Inherit DESIGN.md typography, neutral surfaces, laboratory blue, both themes, the existing Math Lab shell and geometric SVG plane.
STORY: Identify the fourth component, derive the translation term, compare a point and direction under the same adjustable translation, then distinguish input w from clip-space w and continue to matrix lessons.
FIRST VIEWPORT: A direct section link shows its heading and readable explanation. The experiment presents labeled translation sliders, a point/arrow comparison and numeric readouts; narrow screens stack the established lab layout.
FORM: A single new subsection in the vectors lesson and its table of contents; one small experiment reusing the existing matrix helpers. Preserve the existing vector arithmetic lab and surrounding math courses.
FINISH: Complete. Parent checks and bounded native-browser inspection passed; fresh independent review disposition is ship. Scoped documentation records the implementation and evidence below.

## Implemented

- `HomogeneousWSection.tsx` follows the point/vector introduction in `VectorsArticle`; `navigation.ts` adds `#homogeneous-w` and `#w-translation-lab` to the lesson TOC.
- The explanation derives `x′ = x + tx × w`, connects point subtraction to w = 0, and covers finite homogeneous positions with w ≠ 0.
- Input homogeneous representation and projected clip-space w are distinguished before explaining clipping, perspective division, NDC and viewport mapping.
- `HomogeneousWLab` applies the existing `translation4` and `transformPoint4` to matching xyz inputs with w = 1 and w = 0. React state drives the SVG point, direction arrow and four-component readouts.
- The lab reuses `LabShell`, labeled native range controls, reset, `Plane`, `Arrow`, `Label` and `Readout`; existing Math Lab colors and responsive stacking remain authoritative.
- The scoped `.homogeneous-w-lab` CSS gives ranges and buttons a 44px minimum height. No new GPU/shader runtime, animation or raster asset was introduced.
- The `#version 300 es` example explains Buffer, Uniform, Varying and `gl_Position` data flow. It is instructional GLSL, separate from the CPU-matrix/SVG experiment.
- Related links target `inverse-and-normals#normal-problem` and `matrix-math#homogeneous-coordinates`; article references include WebGL2 Fundamentals perspective and perspective-correct mapping, plus OpenGL ES 3.0 §2.13 (page 95).

## Verified by parent

- `npm test`: 19 files, 169 tests passed; `npm run check:types`, `npm run build` and `git diff --check` passed. Build retains the existing bundle-size warning above 500kB.
- Native CUA inspection covered desktop 1280×720, intermediate 864×1194 and mobile 390×844, both themes, stacked narrow-screen lab layout and no horizontal page overflow.
- The parent checked 44px lab targets and range keyboard interaction with Home, End and ArrowRight.
- Translation (-3, 3) produced point (-1, 4, 0, 1), while direction remained (2, 1, 0, 0); zero translation and reset also worked.
- Both new TOC anchors and the two related lesson links were exercised. The instructional shader was not compiled as a new live program.

## Finish review and documentation

- Fresh independent reviewer disposition: **ship**. All six captures below were opened; TYPE, MATERIAL and GROUND match DESIGN.md, w = 1/w = 0 derivation is accurate, and the clip-space distinction is clear. No material fixes were requested.
- Fresh generic agents substituted for unavailable dedicated reviewer and documenter types. Review used the scoped native-browser captures; this documentation pass used the relevant code and parent verification evidence only.
- The existing hook surfaced no deterministic findings for the new section and `MathArticles.tsx`. Other UI edits were silent; this is not a complete detector scan. No second detector ran.
- This brief is the sole documentation boundary. PRODUCT.md, DESIGN.md, design.json and unrelated briefs remain outside scope; the addition establishes no global design-system decision.

## Local review evidence

These files are local QA assets under `.impeccable/review/`, outside the intended committed source and global system documentation:

- `vectors-w-desktop-explanation.jpg`
- `vectors-w-desktop-lab-complete.jpg`
- `vectors-w-desktop-light.jpg`
- `vectors-w-mobile-explanation.jpg`
- `vectors-w-mobile-lab.jpg`
- `vectors-w-perspective-explanation.jpg`

Not canonized: the t = (3, 2) default and exact example points are lesson-specific teaching values, with no reusable design-token role.
