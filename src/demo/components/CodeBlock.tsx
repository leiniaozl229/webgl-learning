import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import startLessonTwoslashHtml from 'virtual:start-lessons-twoslash';

import { HighlightedCode } from './HighlightedCode';
import { FullscreenButton } from './FullscreenButton';
import { TwoslashHighlightedCode } from './TwoslashHighlightedCode';

interface CodeBlockProps {
  children: string;
  language?: string;
  label?: string;
  twoslashId?: string;
}

export function CodeBlock({ children, language = 'ts', label, twoslashId }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyCode() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
  }

  return (
    <figure className="code-block" data-fullscreen-target>
      <figcaption>
        <span>{label ?? language}</span>
        <div className="code-block__actions">
          <FullscreenButton />
          <button type="button" onClick={copyCode} aria-label="复制代码">
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}<span>{copied ? '已复制' : '复制'}</span>
          </button>
        </div>
      </figcaption>
      {twoslashId
        ? <TwoslashHighlightedCode html={startLessonTwoslashHtml[twoslashId]} />
        : <HighlightedCode code={children} language={language === 'glsl' ? 'glsl' : 'typescript'} />}
    </figure>
  );
}
