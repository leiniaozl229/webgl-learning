import { memo, useEffect, useRef } from 'react';

export const TwoslashHighlightedCode = memo(function TwoslashHighlightedCode({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const codeContainer = container;
    const hoverTargets = codeContainer.querySelectorAll<HTMLElement>('.twoslash-hover');

    let activeTarget: HTMLElement | null = null;
    let hideTimer: number | undefined;
    let repositionFrame: number | undefined;

    function cancelHide() {
      if (hideTimer !== undefined) {
        window.clearTimeout(hideTimer);
        hideTimer = undefined;
      }
    }

    function hidePopup(target: HTMLElement | null) {
      if (!target) return;
      target.querySelector<HTMLElement>(':scope > .twoslash-popup-container')?.removeAttribute('data-open');
    }

    function scheduleHide() {
      cancelHide();
      hideTimer = window.setTimeout(() => {
        if (!activeTarget) return;

        const popup = activeTarget.querySelector<HTMLElement>(':scope > .twoslash-popup-container');
        const pointerInside = activeTarget.matches(':hover') || popup?.matches(':hover');
        const focusInside = activeTarget.matches(':focus-within') || popup?.contains(document.activeElement);
        if (pointerInside || focusInside) return;

        hidePopup(activeTarget);
        activeTarget = null;
        hideTimer = undefined;
      }, 180);
    }

    function positionPopup(target: HTMLElement) {
      const popup = target.querySelector<HTMLElement>(':scope > .twoslash-popup-container');
      if (!popup) return;

      const boundaryRect = codeContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const safeInset = 12;
      const availableWidth = Math.max(
        240,
        Math.min(
          window.innerWidth - safeInset * 2,
          boundaryRect.width - safeInset * 2,
        ),
      );
      popup.style.setProperty('--twoslash-popup-max-width', `${availableWidth}px`);
      const popupRect = popup.getBoundingClientRect();
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
      cancelHide();
      const nextTarget = event.currentTarget as HTMLElement;
      if (activeTarget && activeTarget !== nextTarget) hidePopup(activeTarget);
      activeTarget = nextTarget;
      const popup = activeTarget.querySelector<HTMLElement>(':scope > .twoslash-popup-container');
      popup?.setAttribute('data-open', 'true');
      positionPopup(activeTarget);
    }

    function getPositionTarget() {
      if (activeTarget?.isConnected) return activeTarget;
      activeTarget = Array.from(hoverTargets).find((target) => (
        target.matches(':hover') || target.matches(':focus-within')
      )) ?? null;
      return activeTarget;
    }

    const repositionPopup = () => {
      const target = getPositionTarget();
      if (target) positionPopup(target);
    };

    const scheduleReposition = () => {
      if (repositionFrame !== undefined) window.cancelAnimationFrame(repositionFrame);
      repositionFrame = window.requestAnimationFrame(() => {
        repositionFrame = undefined;
        repositionPopup();
      });
    };

    const themeObserver = new MutationObserver(scheduleReposition);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    hoverTargets.forEach((target) => {
      target.tabIndex = 0;
      target.addEventListener('mouseenter', showPopup);
      target.addEventListener('focus', showPopup);
      target.addEventListener('mouseleave', scheduleHide);
      target.addEventListener('blur', scheduleHide);

      const popup = target.querySelector<HTMLElement>(':scope > .twoslash-popup-container');
      popup?.addEventListener('mouseenter', cancelHide);
      popup?.addEventListener('mouseleave', scheduleHide);
    });
    window.addEventListener('resize', repositionPopup);
    document.addEventListener('scroll', repositionPopup, true);

    return () => {
      hoverTargets.forEach((target) => {
        target.removeEventListener('mouseenter', showPopup);
        target.removeEventListener('focus', showPopup);
        target.removeEventListener('mouseleave', scheduleHide);
        target.removeEventListener('blur', scheduleHide);
        const popup = target.querySelector<HTMLElement>(':scope > .twoslash-popup-container');
        popup?.removeEventListener('mouseenter', cancelHide);
        popup?.removeEventListener('mouseleave', scheduleHide);
      });
      cancelHide();
      if (repositionFrame !== undefined) window.cancelAnimationFrame(repositionFrame);
      themeObserver.disconnect();
      hidePopup(activeTarget);
      window.removeEventListener('resize', repositionPopup);
      document.removeEventListener('scroll', repositionPopup, true);
    };
  }, [html]);

  return <div ref={containerRef} className="twoslash-code" dangerouslySetInnerHTML={{ __html: html }} />;
});
