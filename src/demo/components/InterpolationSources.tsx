import { Tabs } from '@base-ui/react/tabs';

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
  return (
    <Tabs.Root className="code-workbench interpolation-sources" defaultValue="data" aria-labelledby="interpolation-sources-title">
      <header className="code-workbench__header">
        <div className="code-workbench__heading">
          <span className="playground__status-dot" aria-hidden="true" />
          <strong id="interpolation-sources-title">Vertex Colors</strong>
          <small>JavaScript 数据 + GLSL</small>
        </div>
      </header>
      <Tabs.List className="editor-tabs" aria-label="颜色插值源码">
        {sourceTabs.map((tab) => (
          <Tabs.Tab
            key={tab.id}
            value={tab.id}
          >
            {tab.label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="editor-tabs__indicator" />
      </Tabs.List>
      {sourceTabs.map((tab) => (
        <Tabs.Panel key={tab.id} className="interpolation-sources__code" value={tab.id}>
          <HighlightedCode code={sources[tab.id].code} language={sources[tab.id].language} />
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
