---
version: 1
slug: "src-demo-components-shadereffectarticle-tsx"
primary_target: "src/demo/components/ShaderEffectArticle.tsx"
related_targets: ["src/demo/components/ShaderHandbookArticle.tsx","src/demo/components/ShaderEffectPrinciples.tsx","src/demo/components/EffectGalleryLab.tsx","src/demo/components/ShaderHandbookLab.tsx","src/demo/components/LessonLink.tsx","src/demo/effectLessons.ts","src/demo/navigation.ts","src/demo/App.tsx","src/demo/shader-handbook.css","src/demo/effectLessons.test.tsx","src/demo/lessonAnchors.test.tsx","docs/shader-effects-handbook.md"]
---

# Shader 案例独立课程

Mode: Read. Code-led reorganization of the established lessons. The latest user request is “把案例拆成独立页面吧，相似的可以放一起”. Inherit the existing course shell and live experiments. The current overview is recorded in [Shader 手法总览](src-demo-components-shaderhandbookarticle-tsx.md); its former combined-page evidence is historical.

## Direction contract

THESIS: Give each technique family a copyable lesson with its own live experiment and focused explanation.
OWN-WORLD: Preserve DESIGN.md typography, neutral surfaces, laboratory blue, both themes, native controls and Base UI source tabs. No new identity or raster assets.
STORY: Choose a family from the handbook or sidebar, compare its related cases, adjust parameters, inspect its actual pipeline and sources, then read the relevant principles and continue through lesson pagination.
FIRST VIEWPORT: Each case page opens with a short title and lead, a local case selector when needed, playback/compare actions and an identifiable live Canvas. Mobile keeps these controls and a useful part of the Canvas in the first viewport. The separate overview opens with a concise ten-lesson directory and mounts zero Canvas elements.
FORM: Ten routes for sixteen recipes. Noise/color share a page and keep the seven-step ring; glass/chroma share one; stars/grain/dither/halftone/ASCII-mosaic share a pixel-style page. Waves, SDF shapes, ribbons, Bloom, feedback, ray marching and vertex displacement have individual pages. Selection stays within its family. Previous/next navigation follows the sidebar. Legacy handbook effect URLs open their matching new lesson.
FINISH: Mandatory checks, desktop/mobile captures and a fresh independent finish review completed with disposition ship. This brief records the final implementation and the verification boundary. No global design-system changes.

## Implemented surface

`src/demo/effectLessons.ts` owns the ten families, their membership, titles, leads, reading times, principle anchors and reference links. Every existing recipe has exactly one owner:

| Lesson route | Local recipes | Local principle anchors |
| --- | --- | --- |
| `shader-waves` | `waves` | `effect-waves` |
| `shader-sdf` | `sdf` | `effect-sdf` |
| `shader-noise` | `clouds`, `color` | `effect-noise`, `effect-color`; seven-step ring at `handbook-experiment` |
| `shader-ribbons` | `ribbons` | `effect-glow` |
| `shader-glass` | `glass`, `chroma` | `effect-material`, `effect-sampling` |
| `shader-pixel-style` | `stars`, `grain`, `dither`, `halftone`, `cells` | `effect-stylization` |
| `shader-bloom` | `bloom` | `effect-bloom` |
| `shader-feedback` | `feedback` | `effect-feedback` |
| `shader-raymarch` | `raymarch` | `effect-3d` |
| `shader-geometry` | `geometry` | `effect-geometry` |

- `src/demo/App.tsx` mounts `ShaderEffectArticle` for the selected family and keys it by `lesson.id`. Cross-family navigation unmounts the previous article and its experiments before mounting the new family. Each article mounts one `EffectGalleryLab`; `shader-noise` additionally mounts the retained `ShaderHandbookLab` below its local principles. The overview mounts neither experiment.
- `src/demo/components/ShaderEffectArticle.tsx` passes `lesson.effects` to `EffectGalleryLab` and `lesson.principles` to `ShaderEffectPrinciples`. Multi-recipe families expose “本页案例” and desktop previous/next case buttons bounded to that family. Single-recipe pages show their recipe name. `src/demo/shader-handbook.css` hides the case arrow pair on narrow layouts while retaining the selector. Recipe variants remain inside their existing recipe controls.
- `effectForLesson` accepts only a member of the active family. Missing, invalid or unrelated `effect` values render that family's first recipe. Local selection updates `effect` with History `replaceState`; popstate and the lesson-navigation event restore selection from the URL. Cross-page `LessonLink` navigation uses `pushState`, preserving browser back/forward and copyable `lesson`, `effect` and hash URLs.
- `legacyEffectLesson` and `src/demo/navigation.ts` recognize the former handbook's valid `effect` values and local principle hashes, plus `#handbook-experiment`. `App.tsx` canonicalizes the `lesson` parameter to the owner while retaining the other query parameters and hash. A valid legacy effect takes priority; otherwise a recognized case hash supplies the owner. A bare handbook link, or an invalid effect without a case hash, remains on the overview.
- `src/demo/components/ShaderEffectPrinciples.tsx` renders only the requested anchors. The seven-step coordinates → SDF → Value noise → fBM → domain warping → palette → ring/glow progression lives on `shader-noise`; its parameters and same-parameter comparison behavior are retained. The A/B binding diagram belongs to `shader-feedback`, alongside that page's real GPU history experiment.
- Each course receives its own table of contents from `src/demo/navigation.ts`, the existing lesson pagination, a breadcrumb and return link to the overview, and its relevant external reading link. The sidebar and lesson pagination use the same course order. `LessonLink.tsx` scrolls and focuses the destination anchor after navigation.
- `src/demo/components/EffectGalleryLab.tsx` retains effect-specific controls, paused defaults, explicit playback/reset, same-time baseline comparison, observations and the actual render pipeline. Source tabs use Base UI and actual runtime sources from `src/core/effectGallery.ts`, `src/core/effectGalleryRenderer.ts` and its exported GLSL sources. Labels remain `fragment.glsl`, `vertex.glsl`, `vertex-data.ts`, `renderer.ts`, `scene.glsl` and `post.glsl`. `src/demo/openshaders.css` bounds the source viewport at 22rem with scrolling.
- The existing renderer and GLSL were reused without modification in this split. Bloom's five passes, feedback's alternating history textures, indexed geometry and the teaching approximations for glass/chroma retain their prior implementations. The Lab effect cleanup cancels animation, disconnects resize/intersection observers, removes visibility/motion/DPR/context listeners and calls `renderer.dispose()`. Keyed page changes therefore release the previous family's resources and initialize the new page's resources. This lifecycle statement comes from source inspection.
- Existing title/section/body hierarchy, laboratory blue, neutral surfaces, both themes, focus treatments and the lab workbench remain authoritative. Wide layouts keep parameters beside the Canvas; narrow layouts stack them below and retain bounded table/source scrolling. `docs/shader-effects-handbook.md` now lists the ten course entries and explains compatible legacy links.

## Finish evidence — current route split

Latest disposition: **ship**. A fresh independent read-only finish reviewer opened all 26 split captures and inspected the supplied implementation. Its five-part result was persistence pass, fidelity matching the incumbent lesson world, ceiling reached within this organization change, no material fixes, and keep the local family boundaries, actual runtime sources and compatible sharing. The reviewer did not independently run the browser or test suite. No approved visual comp was supplied; the QUALITY BAR card/decision critique reference was unavailable, so the review used the existing DESIGN.md and the surface contract.

- Producer-reported required checks: **169 tests across 19 files**, `npm run check:types`, `npm run build` and `git diff --check` passed. Build retained the existing large-chunk warning (1,830.41 KB; gzip 359.88 KB). `src/demo/effectLessons.test.tsx` covers unique recipe ownership, family-bounded defaults, old/new deep links, zero Canvas elements on the overview and local selectors. `src/demo/lessonAnchors.test.tsx` includes every new lesson's table-of-contents anchors and single title anchor.
- Producer-completed browser checks: all ten routes rendered real WebGL2 output at 1280 × 720 and 390 × 844 with no rendering alerts or document-level horizontal overflow. Most mobile previews showed their complete 304 CSS px Canvas in the first viewport; feedback exposed 287 CSS px there. These measurements describe the captured routes and viewport only.
- Behavior checks: a legacy waves link canonicalized to `shader-waves`; the overview table opened `shader-noise&effect=color`, back returned to the zero-Canvas overview, and forward restored `color`. Local previous/next and query selection worked. The actual `renderer.ts` tab was selected, the color principle link reached `#effect-color`, ring step 5 worked, and lesson pagination reached ribbons with focus on `lesson-title`. Chroma and the four non-default pixel-style recipes rendered without alerts. A light-theme glass capture was checked; the session ended in the default viewport and dark theme.
- Overview captures: `.impeccable/review/split-overview-desktop.jpg` and `split-overview-mobile.jpg`.
- Ten-course captures: under `.impeccable/review/`, each route ID in the table above has `split-<lesson-id>-desktop.jpg` and `split-<lesson-id>-mobile.jpg` (20 files). The IDs are `shader-waves`, `shader-sdf`, `shader-noise`, `shader-ribbons`, `shader-glass`, `shader-pixel-style`, `shader-bloom`, `shader-feedback`, `shader-raymarch` and `shader-geometry`.
- Supplemental captures, in the same directory: `split-noise-color-desktop.jpg`, `split-noise-ring-desktop.jpg`, `split-glass-chroma-light-desktop.jpg` and `split-overview-directory-desktop.jpg`. These 26 images are local QA evidence, opened by the producer and fresh reviewer, and have no shipping-raster role.

Verification boundary: this documenter pass inspected code, styles, tests and the local capture inventory; browser/test results and the fresh review above are recorded from the completed producer handoff. Full keyboard traversal, 200% zoom, forced context loss/restoration, cross-display DPR changes, the RGBA8 fallback and every pre-existing recipe variant were not exercised in this split's browser pass. The underlying GPU code is unchanged; the historical variant and seven-step checks remain scoped to their original stages in the overview brief. Resource disposal and listener cleanup are source evidence. The UI edit hook reported no deterministic issues in the new Article/Principles surfaces; its EffectGalleryLab hints were suppressed after the session exceeded six edits, and no second detector was run.

Documentation boundary: this task adds no identity, external image, shipping raster, asset entry, system token or global design rule. `DESIGN.md`, `PRODUCT.md` and `.impeccable/design.json` retain their existing authority. Deliberately not canonized: the captured mobile Canvas visibility values (304/287 CSS px), which are viewport-specific QA measurements and do not establish a global layout minimum.
