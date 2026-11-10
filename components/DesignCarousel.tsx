'use client';
import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function DesignCarousel({
  children,
  english,
}: {
  children: ReactNode;
  english: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const slides = Children.toArray(children);

  useEffect(() => {
    track.current?.scrollTo({ left: 0, behavior: 'instant' });
    queueMicrotask(() => setActive(0));
  }, [english, slides.length]);

  function go(index: number) {
    const el = track.current;
    if (!el) return;
    const i = Math.max(0, Math.min(slides.length - 1, index));
    const reduced =
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.motion === 'off';
    el.scrollTo({
      left: (english ? 1 : -1) * i * (el.clientWidth + 24),
      behavior: reduced ? 'instant' : 'smooth',
    });
  }

  return (
    <div
      className="design-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={english ? 'Visual identity projects' : 'مشاريع الهوية البصرية'}
    >
      <div
        ref={track}
        className="design-track"
        tabIndex={0}
        onScroll={(e) =>
          setActive(
            Math.min(
              slides.length - 1,
              Math.round(
                Math.abs(e.currentTarget.scrollLeft) /
                  (e.currentTarget.clientWidth + 24)
              )
            )
          )
        }
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            go(active + ((e.key === 'ArrowRight') === english ? 1 : -1));
          }
          if (e.key === 'Home') {
            e.preventDefault();
            go(0);
          }
          if (e.key === 'End') {
            e.preventDefault();
            go(slides.length - 1);
          }
        }}
      >
        {slides.map((slide, i) => (
          <div
            className="design-slide"
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${slides.length}`}
            inert={i !== active}
          >
            {slide}
          </div>
        ))}
      </div>
      <div className="carousel-controls">
        <div className="carousel-arrows">
          <button
            disabled={active === 0}
            onClick={() => go(active - 1)}
            aria-label={english ? 'Previous design' : 'التصميم السابق'}
          >
            {english ? <ArrowLeft /> : <ArrowRight />}
          </button>
          <button
            disabled={active === slides.length - 1}
            onClick={() => go(active + 1)}
            aria-label={english ? 'Next design' : 'التصميم التالي'}
          >
            {english ? <ArrowRight /> : <ArrowLeft />}
          </button>
        </div>
        <div className="carousel-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={i === active ? 'active' : ''}
              aria-current={i === active ? 'true' : undefined}
              aria-label={
                english ? `Show design ${i + 1}` : `عرض التصميم ${i + 1}`
              }
              onClick={() => go(i)}
            />
          ))}
        </div>
        <span className="carousel-count" aria-live="polite" aria-atomic="true">
          {active + 1} / {slides.length}
        </span>
      </div>
    </div>
  );
}
