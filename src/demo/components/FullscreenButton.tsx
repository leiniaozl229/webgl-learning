import { Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function findFullscreenTarget(button: HTMLButtonElement | null): HTMLElement | null {
  return button?.closest<HTMLElement>('[data-fullscreen-target]') ?? null;
}

export function FullscreenButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const syncState = () => {
      const target = findFullscreenTarget(buttonRef.current);
      setIsFullscreen(document.fullscreenElement === target);
      setIsSupported(Boolean(target?.requestFullscreen) && document.fullscreenEnabled !== false);
    };

    syncState();
    document.addEventListener('fullscreenchange', syncState);
    return () => document.removeEventListener('fullscreenchange', syncState);
  }, []);

  async function toggleFullscreen() {
    const target = findFullscreenTarget(buttonRef.current);
    if (!target || !isSupported) return;

    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
        return;
      }

      if (document.fullscreenElement) await document.exitFullscreen();
      await target.requestFullscreen();
    } catch {
      setIsSupported(false);
    }
  }

  const label = isFullscreen ? '退出全屏' : '全屏查看';
  return (
    <button
      ref={buttonRef}
      className="fullscreen-button"
      type="button"
      onClick={toggleFullscreen}
      disabled={!isSupported}
      aria-label={label}
      title={isSupported ? label : '当前环境不支持全屏'}
      aria-pressed={isFullscreen}
    >
      {isFullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
}
