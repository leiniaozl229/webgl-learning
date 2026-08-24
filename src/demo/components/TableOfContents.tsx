import { tableOfContents } from '../navigation';

export function TableOfContents() {
  return (
    <aside className="toc" aria-label="本页目录">
      <strong>本页内容</strong>
      <nav><ol>{tableOfContents.map((item) => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}</ol></nav>
      <a className="toc__source" href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html" target="_blank" rel="noreferrer">查看参考原文</a>
    </aside>
  );
}
