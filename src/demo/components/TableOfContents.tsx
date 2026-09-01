import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { TableOfContentsItem } from '../navigation';

interface TableOfContentsProps {
  items: TableOfContentsItem[];
  sourceHref: string;
  variant?: 'inline' | 'sidebar';
}

export function TableOfContents({ items, sourceHref, variant = 'sidebar' }: TableOfContentsProps) {
  const [activeHref, setActiveHref] = useState(items[0]?.href ?? '');
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    setActiveHref(window.location.hash || items[0]?.href || '');
    const targets = items
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((target): target is HTMLElement => target !== null);
    if (targets.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActiveHref(`#${visible.target.id}`);
    }, {
      rootMargin: '-96px 0px -68% 0px',
      threshold: [0, 1],
    });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [items]);

  const links = (
    <nav aria-label="本页章节">
      <ol>
        {items.map((item) => (
          <li key={item.href}>
            <a
              className={activeHref === item.href ? 'toc__link--active' : undefined}
              href={item.href}
              aria-current={activeHref === item.href ? 'location' : undefined}
              onClick={() => {
                setActiveHref(item.href);
                if (detailsRef.current) detailsRef.current.open = false;
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );

  if (variant === 'inline') {
    return (
      <details ref={detailsRef} className="toc toc--inline">
        <summary>本页内容 <ChevronDown aria-hidden="true" /></summary>
        <div className="toc__popover">
          {links}
          <a className="toc__source" href={sourceHref} target="_blank" rel="noreferrer">参考原文</a>
        </div>
      </details>
    );
  }

  return (
    <aside className="toc toc--sidebar" aria-label="本页目录">
      <strong>本页内容</strong>
      {links}
      <a className="toc__source" href={sourceHref} target="_blank" rel="noreferrer">参考原文</a>
    </aside>
  );
}
