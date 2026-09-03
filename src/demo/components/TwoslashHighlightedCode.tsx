import { useEffect, useRef } from 'react';

export function TwoslashHighlightedCode({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const codeContainer = container;
    const hoverTargets = codeContainer.querySelectorAll<HTMLElement>('.twoslash-hover');

    let activeTarget: HTMLElement | null = null;

    function positionPopup(target: HTMLElement) {
      const popup = target.querySelector<HTMLElement>(':scope > .twoslash-popup-container');
      if (!popup) return;

      popup.style.setProperty('--twoslash-popup-left', '0px');
      popup.style.setProperty('--twoslash-popup-top', '0px');
      const boundaryRect = codeContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const safeInset = 12;
      const minLeft = Math.max(safeInset, boundaryRect.left + safeInset);
      const maxRight = Math.min(window.innerWidth - safeInset, boundaryRect.right - safeInset);
      const maxLeft = Math.max(minLeft, maxRight - popupRect.width);
      const left = Math.min(Math.max(targetRect.left, minLeft), maxLeft);
      let top = targetRect.bottom + 8;
      let placement = 'bottom';

      if (top + popupRect.height > window.innerHeight - safeInset) {
        top = Math.max(safeInset, targetRect.top - popupRect.height - 8);
        placement = 'top';
      }

      const arrowLeft = Math.min(
        Math.max(12, targetRect.left + targetRect.width / 2 - left),
        Math.max(12, popupRect.width - 12),
      );
      popup.dataset.placement = placement;
      popup.style.setProperty('--twoslash-popup-left', `${left}px`);
      popup.style.setProperty('--twoslash-popup-top', `${top}px`);
      popup.style.setProperty('--twoslash-popup-arrow-left', `${arrowLeft}px`);
    }

    function showPopup(event: Event) {
      activeTarget = event.currentTarget as HTMLElement;
      positionPopup(activeTarget);
    }

    const repositionPopup = () => {
      if (activeTarget) positionPopup(activeTarget);
    };

    hoverTargets.forEach((target) => {
      target.tabIndex = 0;
      target.addEventListener('mouseenter', showPopup);
      target.addEventListener('focus', showPopup);
    });
    window.addEventListener('resize', repositionPopup);
    document.addEventListener('scroll', repositionPopup, true);

    return () => {
      hoverTargets.forEach((target) => {
        target.removeEventListener('mouseenter', showPopup);
        target.removeEventListener('focus', showPopup);
      });
      window.removeEventListener('resize', repositionPopup);
      document.removeEventListener('scroll', repositionPopup, true);
    };
  }, [html]);

  return <div ref={containerRef} className="twoslash-code" dangerouslySetInnerHTML={{ __html: html }} />;
}
