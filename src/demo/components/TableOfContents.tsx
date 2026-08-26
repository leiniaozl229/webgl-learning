import type { TableOfContentsItem } from '../navigation';

interface TableOfContentsProps {
  items: TableOfContentsItem[];
  sourceHref: string;
}

export function TableOfContents({ items, sourceHref }: TableOfContentsProps) {
  return (
    <aside className="toc" aria-label="本页目录">
      <strong>本页内容</strong>
      <nav><ol>{items.map((item) => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}</ol></nav>
      <a className="toc__source" href={sourceHref} target="_blank" rel="noreferrer">查看参考原文</a>
    </aside>
  );
}
