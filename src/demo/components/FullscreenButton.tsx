import { Maximize2, Minimize2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

function findFullscreenTarget(button: HTMLButtonElement | null): HTMLElement | null {
  return button?.closest<HTMLElement>('[data-fullscreen-target]') ?? null;
}

export function FullscreenButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const target = findFullscreenTarget(buttonRef.current);
    if (!target || !isExpanded) return;

    target.dataset.codeWindowExpanded = 'true';
    document.body.classList.add('code-window-open');

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsExpanded(false);
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => {
      delete target.dataset.codeWindowExpanded;
      document.body.classList.remove('code-window-open');
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isExpanded]);

  function toggleExpanded() {
    const target = findFullscreenTarget(buttonRef.current);
    if (target) setIsExpanded((expanded) => !expanded);
  }

  const label = isExpanded ? '关闭大窗口' : '打开大窗口';
  return (
    <>
      <button
        ref={buttonRef}
        className="fullscreen-button"
        type="button"
        onClick={toggleExpanded}
        aria-label={label}
        title={label}
        aria-pressed={isExpanded}
      >
        {isExpanded ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
      </button>
      {isExpanded && createPortal(
        <div
          className="code-window-backdrop"
          aria-hidden="true"
          onMouseDown={() => setIsExpanded(false)}
        />,
        document.body,
      )}
    </>
  );
}
