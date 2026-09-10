/// <reference types="vitest/config" />
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { transformerTwoslash } from '@shikijs/twoslash';
import react from '@vitejs/plugin-react';
import { codeToHtml } from 'shiki';
import typescriptTwoslash from 'typescript-twoslash';
import { defineConfig, type Plugin } from 'vite';
import type { ElementContent } from 'hast';

const textureSamplingArticlePath = fileURLToPath(
  new URL('./src/demo/components/ImageProcessingArticles.tsx', import.meta.url),
);
const textureSamplingModuleId = 'virtual:texture-sampling-twoslash';
const resolvedTextureSamplingModuleId = `\0${textureSamplingModuleId}`;
const startLessonsModuleId = 'virtual:start-lessons-twoslash';
const resolvedStartLessonsModuleId = `\0${startLessonsModuleId}`;

interface TwoslashSnippetSpec {
  id: string;
  path: string;
  constant: string;
  prelude?: string;
}

const componentPath = (name: string) => fileURLToPath(
  new URL(`./src/demo/components/${name}.tsx`, import.meta.url),
);
const corePath = (name: string) => fileURLToPath(
  new URL(`./src/core/${name}.ts`, import.meta.url),
);

const startLessonSnippets: TwoslashSnippetSpec[] = [
  { id: 'getting-context', path: componentPath('GettingWebgl2Article'), constant: 'contextCode' },
  {
    id: 'getting-options',
    path: componentPath('GettingWebgl2Article'),
    constant: 'optionsCode',
    prelude: 'declare const canvas: HTMLCanvasElement;',
  },
  { id: 'fundamentals-context', path: componentPath('LessonArticle'), constant: 'contextCode' },
  {
    id: 'fundamentals-program',
    path: componentPath('LessonArticle'),
    constant: 'programCode',
    prelude: [
      'declare const gl: WebGL2RenderingContext;',
      'declare const vertexSource: string;',
      'declare const fragmentSource: string;',
    ].join('\n'),
  },
  {
    id: 'fundamentals-draw',
    path: componentPath('LessonArticle'),
    constant: 'drawCode',
    prelude: [
      'declare const gl: WebGL2RenderingContext;',
      'declare const program: WebGLProgram;',
      'declare const vertexArray: WebGLVertexArrayObject;',
    ].join('\n'),
  },
  {
    id: 'fundamentals-canvas-size',
    path: componentPath('LessonArticle'),
    constant: 'canvasSizeCode',
    prelude: [
      'declare const canvas: HTMLCanvasElement;',
      'declare const gl: WebGL2RenderingContext;',
      'declare function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean;',
    ].join('\n'),
  },
  {
    id: 'triangle-vertex-data',
    path: corePath('webgl2'),
    constant: 'TRIANGLE_VERTEX_DATA_SOURCE',
    prelude: [
      'declare const gl: WebGL2RenderingContext;',
      'declare const program: WebGLProgram;',
    ].join('\n'),
  },
  {
    id: 'pixel-rectangle-data',
    path: corePath('pixelRectangles'),
    constant: 'PIXEL_RECTANGLE_DATA_SOURCE',
    prelude: [
      'declare const gl: WebGL2RenderingContext;',
      'declare const program: WebGLProgram;',
      'declare const canvas: HTMLCanvasElement;',
      'declare function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean;',
    ].join('\n'),
  },
  {
    id: 'how-draw-count',
    path: componentPath('HowItWorksArticle'),
    constant: 'drawCountCode',
    prelude: [
      'declare const gl: WebGL2RenderingContext;',
      'declare const triangleVao: WebGLVertexArrayObject;',
    ].join('\n'),
  },
  {
    id: 'how-interleaved-data',
    path: componentPath('HowItWorksArticle'),
    constant: 'interleavedCode',
    prelude: [
      'declare const gl: WebGL2RenderingContext;',
      'declare const positionLocation: number;',
      'declare const colorLocation: number;',
    ].join('\n'),
  },
  {
    id: 'interpolation-vertex-data',
    path: corePath('interpolation'),
    constant: 'INTERPOLATION_VERTEX_DATA_SOURCE',
    prelude: [
      'declare const gl: WebGL2RenderingContext;',
      'declare const program: WebGLProgram;',
      'declare const colors: readonly string[];',
    ].join('\n'),
  },
  {
    id: 'shader-program',
    path: componentPath('ShadersAndGlslArticle'),
    constant: 'compileCode',
    prelude: [
      'declare const gl: WebGL2RenderingContext;',
      'declare const vertexSource: string;',
      'declare const fragmentSource: string;',
    ].join('\n'),
  },
  {
    id: 'uniform-data',
    path: corePath('uniforms'),
    constant: 'UNIFORM_DATA_SOURCE',
    prelude: [
      'declare const gl: WebGL2RenderingContext;',
      'declare const program: WebGLProgram;',
      'declare const vao: WebGLVertexArrayObject;',
    ].join('\n'),
  },
  {
    id: 'state-vao',
    path: componentPath('StateDiagramArticle'),
    constant: 'vaoCode',
    prelude: [
      'declare const gl: WebGL2RenderingContext;',
      'declare const vao: WebGLVertexArrayObject;',
      'declare const positionBuffer: WebGLBuffer;',
      'declare const positionLocation: number;',
      'declare const indexBuffer: WebGLBuffer;',
    ].join('\n'),
  },
  {
    id: 'state-draw',
    path: componentPath('StateDiagramArticle'),
    constant: 'drawCode',
    prelude: [
      'declare const gl: WebGL2RenderingContext;',
      'declare const program: WebGLProgram;',
      'declare const vao: WebGLVertexArrayObject;',
      'declare const texture: WebGLTexture;',
      'declare const framebuffer: WebGLFramebuffer;',
      'declare const targetWidth: number;',
      'declare const targetHeight: number;',
    ].join('\n'),
  },
];

function renderMarkdownInline(markdown: string): ElementContent[] {
  const children: ElementContent[] = [];
  const tokenPattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g;
  let cursor = 0;

  for (const match of markdown.matchAll(tokenPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) children.push({ type: 'text', value: markdown.slice(cursor, index) });

    if (match[1]) {
      children.push({
        type: 'element',
        tagName: 'strong',
        properties: {},
        children: renderMarkdownInline(match[1]),
      });
    } else if (match[2]) {
      children.push({
        type: 'element',
        tagName: 'code',
        properties: {},
        children: [{ type: 'text', value: match[2] }],
      });
    } else {
      children.push({
        type: 'element',
        tagName: 'a',
        properties: {
          href: match[4],
          target: '_blank',
          rel: ['noreferrer', 'noopener'],
        },
        children: [{ type: 'text', value: match[3] }],
      });
    }
    cursor = index + match[0].length;
  }

  if (cursor < markdown.length) children.push({ type: 'text', value: markdown.slice(cursor) });
  return children;
}

function renderMarkdown(markdown: string): ElementContent[] {
  return markdown
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => ({
      type: 'element' as const,
      tagName: 'p',
      properties: {},
      children: renderMarkdownInline(paragraph.replace(/\n/g, ' ')),
    }));
}

function readTemplateConstant(source: string, constant: string): string {
  const match = source.match(new RegExp(
    `(?:export\\s+)?const\\s+${constant}\\s*=\\s*` + '`([\\s\\S]*?)`;',
  ));
  if (!match) throw new Error(`无法读取教程代码常量 ${constant}。`);

  // 课程源码由仓库内的静态模板字符串提供，这里还原其中的转义字符。
  const evaluateTemplate = new Function(`return \`${match[1]}\`;`) as () => string;
  return evaluateTemplate();
}

const typeReferences = [
  '/// <reference path="./node_modules/typescript-twoslash/lib/lib.es5.d.ts" />',
  '/// <reference path="./node_modules/typescript-twoslash/lib/lib.es2015.core.d.ts" />',
  '/// <reference path="./node_modules/typescript-twoslash/lib/lib.es2015.iterable.d.ts" />',
  '/// <reference path="./node_modules/typescript-twoslash/lib/lib.es2015.symbol.d.ts" />',
  '/// <reference path="./node_modules/typescript-twoslash/lib/lib.es2015.symbol.wellknown.d.ts" />',
  '/// <reference path="./node_modules/typescript-twoslash/lib/lib.es2019.array.d.ts" />',
  '/// <reference path="./node_modules/typescript-twoslash/lib/lib.es2022.d.ts" />',
  '/// <reference path="./node_modules/typescript-twoslash/lib/lib.dom.d.ts" />',
  '/// <reference path="./vite-raw.d.ts" />',
  '',
].join('\n');

async function renderTwoslashCode(code: string, prelude = ''): Promise<string> {
  return codeToHtml(code, {
    lang: 'ts',
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
    transformers: [
      transformerTwoslash({
        tsModule: typescriptTwoslash as unknown as NonNullable<Parameters<typeof transformerTwoslash>[0]>['tsModule'],
        rendererRich: {
          renderMarkdown,
          renderMarkdownInline,
        },
        twoslashOptions: {
          compilerOptions: { noLib: true },
          extraFiles: {
            'index.ts': { prepend: `${typeReferences}${prelude}\n` },
            'vite-raw.d.ts': "declare module '*?raw' { const source: string; export default source; }",
          },
        },
      }),
    ],
  });
}

function textureSamplingTwoslash(): Plugin {
  return {
    name: 'texture-sampling-twoslash',
    resolveId(source) {
      return source === textureSamplingModuleId ? resolvedTextureSamplingModuleId : null;
    },
    async load(id) {
      if (id !== resolvedTextureSamplingModuleId) return null;
      this.addWatchFile(textureSamplingArticlePath);

      const articleSource = await readFile(textureSamplingArticlePath, 'utf8');
      const code = readTemplateConstant(articleSource, 'textureSamplingCompleteCode');
      const html = await renderTwoslashCode(code);

      return `export default ${JSON.stringify(html)};`;
    },
  };
}

function startLessonsTwoslash(): Plugin {
  return {
    name: 'start-lessons-twoslash',
    resolveId(source) {
      return source === startLessonsModuleId ? resolvedStartLessonsModuleId : null;
    },
    async load(id) {
      if (id !== resolvedStartLessonsModuleId) return null;

      const entries = await Promise.all(startLessonSnippets.map(async (snippet) => {
        this.addWatchFile(snippet.path);
        const source = await readFile(snippet.path, 'utf8');
        const code = readTemplateConstant(source, snippet.constant);
        const html = await renderTwoslashCode(code, snippet.prelude);
        return [snippet.id, html] as const;
      }));

      return `export default ${JSON.stringify(Object.fromEntries(entries))};`;
    },
  };
}

export default defineConfig({
  plugins: [textureSamplingTwoslash(), startLessonsTwoslash(), react()],
  server: {
    port: 5193,
    strictPort: true,
  },
  test: {
    environment: 'node',
    exclude: ['node_modules/**', 'dist/**'],
  },
});
