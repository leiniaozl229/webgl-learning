import { useState, type KeyboardEvent } from 'react';

import {
  INTERPOLATION_FRAGMENT_SHADER,
  INTERPOLATION_VERTEX_DATA_SOURCE,
  INTERPOLATION_VERTEX_SHADER,
} from '../../core/interpolation';
import { HighlightedCode } from './HighlightedCode';

type SourceTab = 'data' | 'vertex' | 'fragment';

const sourceTabs: Array<{ id: SourceTab; label: string }> = [
  { id: 'data', label: 'vertex-data.ts' },
  { id: 'vertex', label: 'vertex.glsl' },
  { id: 'fragment', label: 'fragment.glsl' },
];

const sources: Record<SourceTab, { code: string; language: 'typescript' | 'glsl' }> = {
  data: { code: INTERPOLATION_VERTEX_DATA_SOURCE, language: 'typescript' },
  vertex: { code: INTERPOLATION_VERTEX_SHADER, language: 'glsl' },
  fragment: { code: INTERPOLATION_FRAGMENT_SHADER, language: 'glsl' },
};

export function InterpolationSources() {
  const [activeTab, setActiveTab] = useState<SourceTab>('data');

  function switchTab(event: KeyboardEvent<HTMLButtonElement>, current: SourceTab) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = sourceTabs.findIndex((tab) => tab.id === current);
    let targetIndex = currentIndex;
    if (event.key === 'Home') targetIndex = 0;
    if (event.key === 'End') targetIndex = sourceTabs.length - 1;
    if (event.key === 'ArrowLeft') targetIndex = (currentIndex - 1 + sourceTabs.length) % sourceTabs.length;
    if (event.key === 'ArrowRight') targetIndex = (currentIndex + 1) % sourceTabs.length;
    const target = sourceTabs[targetIndex].id;
    setActiveTab(target);
    document.getElementById(`interpolation-tab-${target}`)?.focus();
  }

  const source = sources[activeTab];

  return (
    <section className="interpolation-sources" aria-labelledby="interpolation-sources-title">
      <header>
        <span className="playground__status-dot" aria-hidden="true" />
        <strong id="interpolation-sources-title">Vertex Colors</strong>
        <small>JavaScript 数据 + GLSL</small>
      </header>
      <div className="editor-tabs" role="tablist" aria-label="颜色插值源码">
        {sourceTabs.map((tab) => (
          <button
            id={`interpolation-tab-${tab.id}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`interpolation-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => switchTab(event, tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`interpolation-panel-${activeTab}`}
        className="interpolation-sources__code"
        role="tabpanel"
        aria-labelledby={`interpolation-tab-${activeTab}`}
      >
        <HighlightedCode code={source.code} language={source.language} />
      </div>
    </section>
  );
}
