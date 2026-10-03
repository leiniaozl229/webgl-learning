import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CommonApisArticle } from './components/CommonApisArticle';
import { ConvolutionMatrixArticle } from './components/ConvolutionMatrixArticle';
import { GettingWebgl2Article } from './components/GettingWebgl2Article';
import { HowItWorksArticle } from './components/HowItWorksArticle';
import {
  ConvolutionKernelsArticle,
  ImageEffectsArticle,
  ImageProcessingBasicsArticle,
  MultiPassImageProcessingArticle,
  TextureSamplingArticle,
} from './components/ImageProcessingArticles';
import { LessonArticle } from './components/LessonArticle';
import { DotAndCrossArticle, InverseAndNormalsArticle, TrigonometryArticle, VectorsArticle } from './components/MathArticles';
import { MatrixMathArticle } from './components/MatrixMathArticle';
import { OpenShadersArticle } from './components/OpenShadersArticle';
import { ShaderHandbookArticle } from './components/ShaderHandbookArticle';
import { ShadersAndGlslArticle } from './components/ShadersAndGlslArticle';
import { StateDiagramArticle } from './components/StateDiagramArticle';
import { Matrices2DArticle, Rotation2DArticle, Scale2DArticle, Translation2DArticle, Unified2DTransformsArticle } from './components/Transform2DArticles';
import { Camera3DArticle, MatrixNaming3DArticle, ModelViewProjectionArticle, Orthographic3DArticle, Perspective3DArticle } from './components/Transform3DArticles';
import { type LessonId, lessonIds, tableOfContentsByLesson } from './navigation';

const articles: Record<LessonId, ComponentType> = {
  'getting-webgl2': GettingWebgl2Article,
  'common-apis': CommonApisArticle,
  fundamentals: LessonArticle,
  'how-it-works': HowItWorksArticle,
  'shaders-and-glsl': ShadersAndGlslArticle,
  'state-diagram': StateDiagramArticle,
  vectors: VectorsArticle,
  trigonometry: TrigonometryArticle,
  'dot-and-cross': DotAndCrossArticle,
  'matrix-math': MatrixMathArticle,
  'inverse-and-normals': InverseAndNormalsArticle,
  'texture-sampling': TextureSamplingArticle,
  'image-processing-basics': ImageProcessingBasicsArticle,
  'convolution-kernels': ConvolutionKernelsArticle,
  'convolution-matrix-guide': ConvolutionMatrixArticle,
  'image-effects': ImageEffectsArticle,
  'multi-pass-image-processing': MultiPassImageProcessingArticle,
  'translation-2d': Translation2DArticle,
  'rotation-2d': Rotation2DArticle,
  'scale-2d': Scale2DArticle,
  'matrices-2d': Matrices2DArticle,
  'unified-2d-transforms': Unified2DTransformsArticle,
  'orthographic-3d': Orthographic3DArticle,
  'perspective-3d': Perspective3DArticle,
  'camera-3d': Camera3DArticle,
  'matrix-naming-3d': MatrixNaming3DArticle,
  'model-view-projection': ModelViewProjectionArticle,
  'openshaders-breakdown': OpenShadersArticle,
  'shader-effects-handbook': ShaderHandbookArticle,
};

describe.each(lessonIds)('lesson %s', (lessonId) => {
  const Article = articles[lessonId];
  const html = renderToStaticMarkup(<Article />);

  it('renders every table of contents anchor', () => {
    for (const item of tableOfContentsByLesson[lessonId]) {
      expect(html, `${lessonId} is missing ${item.href}`).toContain(`id="${item.href.slice(1)}"`);
    }
  });

  it('renders the lesson title anchor exactly once', () => {
    expect(html.match(/id="lesson-title"/g)).toHaveLength(1);
  });
});
