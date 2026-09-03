/// <reference types="vitest/config" />
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { transformerTwoslash } from '@shikijs/twoslash';
import react from '@vitejs/plugin-react';
import { codeToHtml } from 'shiki';
import typescriptTwoslash from 'typescript-twoslash';
import { defineConfig, type Plugin } from 'vite';

const textureSamplingArticlePath = fileURLToPath(
  new URL('./src/demo/components/ImageProcessingArticles.tsx', import.meta.url),
);
const textureSamplingModuleId = 'virtual:texture-sampling-twoslash';
const resolvedTextureSamplingModuleId = `\0${textureSamplingModuleId}`;

function readTextureSamplingSource(articleSource: string): string {
  const match = articleSource.match(
    /const textureSamplingCompleteCode = `([\s\S]*?)`;\n\nconst textureSourceTabs/,
  );
  if (!match) throw new Error('无法从课程文章中读取纹理采样完整源码。');

  // 课程源码由仓库内的静态模板字符串提供，这里还原其中的转义字符。
  const evaluateTemplate = new Function(`return \`${match[1]}\`;`) as () => string;
  return evaluateTemplate();
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
      const code = readTextureSamplingSource(articleSource);
      const typeReferences = [
        '/// <reference path="./node_modules/typescript-twoslash/lib/lib.es5.d.ts" />',
        '/// <reference path="./node_modules/typescript-twoslash/lib/lib.es2022.d.ts" />',
        '/// <reference path="./node_modules/typescript-twoslash/lib/lib.dom.d.ts" />',
        '/// <reference path="./vite-raw.d.ts" />',
        '',
      ].join('\n');

      const html = await codeToHtml(code, {
        lang: 'ts',
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
        transformers: [
          transformerTwoslash({
            tsModule: typescriptTwoslash as unknown as NonNullable<Parameters<typeof transformerTwoslash>[0]>['tsModule'],
            twoslashOptions: {
              compilerOptions: { noLib: true },
              extraFiles: {
                'index.ts': { prepend: typeReferences },
                'vite-raw.d.ts': "declare module '*?raw' { const source: string; export default source; }",
              },
            },
          }),
        ],
      });

      return `export default ${JSON.stringify(html)};`;
    },
  };
}

export default defineConfig({
  plugins: [textureSamplingTwoslash(), react()],
  server: {
    port: 5193,
    strictPort: true,
  },
  test: {
    environment: 'node',
    exclude: ['node_modules/**', 'dist/**'],
  },
});
