'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Work } from '../app/data';
import BehanceProject from './BehanceProject';
import { behanceProject } from '../lib/behance';

export default function ProjectView({ project: p }: { project: Work }) {
  const [en, setEn] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mega-lang') === 'en';
      queueMicrotask(() => setEn(saved));
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const n = en ? 1 : 0;
  const link = p.behance || (p.type === 'design' && behanceProject(p.url) ? p.url : '');

  return (
    <main className="project-page" dir={en ? 'ltr' : 'rtl'}>
      <div className="project-page-nav">
        <Link href="/#design">{en ? '← Back to portfolio' : 'العودة للأعمال ←'}</Link>
        <button onClick={() => setEn(!en)}>{en ? 'عربي' : 'EN'}</button>
      </div>
      <small>MEGA / VISUAL IDENTITY</small>
      <h1>{p.name[n]}</h1>
      <p>{p.description[n]}</p>
      {p.demo && <span className="tag">{en ? 'Fictional concept' : 'نموذج تجريبي'}</span>}
      {link ? (
        <BehanceProject url={link} title={p.name[n]} english={en} />
      ) : p.image ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="project-full-image" src={p.image} alt={p.name[n]} />
      ) : null}
    </main>
  );
}
