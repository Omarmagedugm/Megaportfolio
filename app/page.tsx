'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDown,
  X,
  Play,
  Code2,
  Layers,
  Clapperboard,
  Menu,
  Pause,
} from 'lucide-react';
import { works, type Work } from './data';
import { videoEmbed } from '../lib/video';
import DesignCarousel from '../components/DesignCarousel';
import BehanceProject from '../components/BehanceProject';
import { behanceProject } from '../lib/behance';

const names = {
  all: ['الكل', 'All'],
  web: ['مواقع', 'Websites'],
  app: ['تطبيقات', 'Apps'],
  design: ['تصميمات', 'Design'],
  video: ['فيديوهات', 'Videos'],
};

function safeHostname(rawUrl: string): string {
  if (!rawUrl) return 'mega.studio';
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return rawUrl.replace(/^https?:\/\//, '').split('/')[0] || 'mega.studio';
  }
}

export default function Home() {
  const [lang, setLang] = useState<0 | 1>(0);
  const [projects, setProjects] = useState<Work[]>(works);
  const [filter, setFilter] = useState<keyof typeof names>('all');
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState<Work | null>(null);
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
  const [email, setEmail] = useState('');
  const [motion, setMotion] = useState(true);

  const dialog = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const t = (ar: string, en: string) => (lang ? en : ar);
  const arrow = lang ? <ArrowUpRight size={20} /> : <ArrowUpLeft size={20} />;

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('mega-lang') === 'en' ? 1 : 0;
      const savedMotion = localStorage.getItem('mega-motion') !== 'off';
      queueMicrotask(() => {
        setLang(savedLang);
        setMotion(savedMotion);
      });
    } catch {
      // Ignore storage access errors
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetch('/api/content')
      .then((r) => (r.ok ? (r.json() as Promise<{ projects: Work[]; email: string }>) : null))
      .then((d) => {
        if (active && d) {
          if (Array.isArray(d.projects)) setProjects(d.projects);
          if (typeof d.email === 'string') setEmail(d.email);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang ? 'en' : 'ar';
    document.documentElement.dir = lang ? 'ltr' : 'rtl';
    document.title = lang
      ? 'Mega | Design, development & visual stories'
      : 'ميجا | تصميم، تطوير، وحكايات بصرية';
    try {
      localStorage.setItem('mega-lang', lang ? 'en' : 'ar');
    } catch {
      // Ignore storage access errors
    }
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.motion = motion ? 'on' : 'off';
    try {
      localStorage.setItem('mega-motion', motion ? 'on' : 'off');
    } catch {
      // Ignore storage access errors
    }
  }, [motion]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('seen');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.08 }
    );
    root.current?.querySelectorAll('.reveal').forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [filter, projects, lang]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (selected) {
      lastFocus.current = document.activeElement as HTMLElement;
      if (!el.open) el.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      if (el.open) el.close();
      document.body.style.overflow = '';
      lastFocus.current?.focus();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selected]);

  function close() {
    setSelected(null);
  }

  function open(p: Work) {
    setView('desktop');
    setSelected(p);
  }

  function tilt(e: React.PointerEvent<HTMLButtonElement>) {
    if (
      !motion ||
      e.pointerType !== 'mouse' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty(
      '--rx',
      ((e.clientY - r.top) / r.height) * 5 - 2.5 + 'deg'
    );
    e.currentTarget.style.setProperty(
      '--ry',
      ((e.clientX - r.left) / r.width) * -6 + 3 + 'deg'
    );
  }

  const visible = projects.filter((p) => filter === 'all' || p.type === filter);
  const designs = projects.filter((p) => p.type === 'design');
  const videos = projects.filter((p) => p.type === 'video');

  const card = (p: Work, i: number) => (
    <button
      key={p.id}
      className="project reveal"
      style={{ '--delay': (i % 2) * 90 + 'ms' } as React.CSSProperties}
      onClick={() => open(p)}
      onPointerMove={tilt}
      onPointerLeave={(e) => {
        e.currentTarget.style.setProperty('--rx', '0deg');
        e.currentTarget.style.setProperty('--ry', '0deg');
      }}
    >
      <div className="project-cover" style={{ background: p.color }}>
        {p.image ? (
          <>
            <div className={p.mobile ? 'desktop-device' : 'single-image'}>
              {p.mobile && (
                <div className="browser-bar">
                  <i />
                  <i />
                  <i />
                  <span>{safeHostname(p.url)}</span>
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.name[lang]} loading="lazy" />
            </div>
            {p.mobile && (
              <div className="mobile-device">
                <div className="camera" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.mobile}
                  alt={t('عرض الموبايل — ', 'Mobile view — ') + p.name[lang]}
                  loading="lazy"
                />
              </div>
            )}
          </>
        ) : (
          <div className="plain-cover">
            <span>✷</span>
            <b>{p.name[lang]}</b>
          </div>
        )}
        {p.type === 'video' && (
          <span className="play-badge">
            <Play />
          </span>
        )}
        <span className="project-open">{arrow}</span>
        <span className="cover-caption">
          {p.mobile ? 'DESKTOP + MOBILE' : p.type.toUpperCase()}
        </span>
      </div>
      <div className="project-info">
        <div>
          <h3>{p.name[lang]}</h3>
          <p>{p.kind[lang]}</p>
        </div>
        <span className="tag">
          {p.demo ? t('نموذج تجريبي', 'Concept project') : names[p.type][lang]}
        </span>
      </div>
    </button>
  );

  return (
    <div ref={root}>
      <header>
        <a className="brand" href="#" aria-label={t('الرئيسية', 'Home')}>
          <span className="mark">
            m<i>✷</i>
          </span>
          <b>
            {t('ميجا', 'Mega')}
            <small>CREATIVE PORTFOLIO</small>
          </b>
        </a>
        <nav className={menu ? 'open' : ''}>
          {[
            ['work', 'الأعمال', 'Work'],
            ['design', 'التصميمات', 'Design'],
            ['videos', 'الفيديوهات', 'Video'],
            ['about', 'عنّي', 'About'],
          ].map(([id, ar, en]) => (
            <a key={id} href={'#' + id} onClick={() => setMenu(false)}>
              {t(ar, en)}
            </a>
          ))}
        </nav>
        <div className="nav-end">
          <button
            className="language"
            onClick={() => setLang(lang ? 0 : 1)}
            aria-label={t('Switch to English', 'التبديل للعربية')}
          >
            {lang ? 'عربي' : 'EN'}
          </button>
          <a className="contact-nav" href="#contact">
            {t('خلّينا نتكلم', 'Let’s talk')}
            {arrow}
          </a>
          <button
            className="menu"
            aria-expanded={menu}
            aria-label={t('القائمة', 'Menu')}
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <i />
              {t(
                'تصميم بفكرة. وتطوير بشخصية.',
                'Thoughtful design. Purposeful development.'
              )}
            </div>
            <h1>
              {lang ? (
                <>
                  Turning ideas
                  <br />
                  into <span>standout</span>
                  <br />
                  experiences<i>.</i>
                </>
              ) : (
                <>
                  أحوّل الأفكار
                  <br />
                  لتجارب <span>تِلفت</span>
                  <br />
                  وتسيب أثر<i>.</i>
                </>
              )}
            </h1>
            <p>
              {t(
                'أنا ميجا، مصمم ومطوّر وصانع محتوى من إسكندرية.',
                'I’m Mega, a designer, developer and creator from Alexandria.'
              )}
              <br />
              {t(
                'بجمع بين التصميم والتكنولوجيا، عشان كل مشروع يكون له شكل يميّزه وتجربة تستاهل.',
                'I bring design and technology together to create distinctive brands and memorable digital experiences.'
              )}
            </p>
            <div className="hero-actions">
              <a className="button" href="#work">
                {t('شوف أعمالي', 'Explore my work')}
                {arrow}
              </a>
              <a href="#about" className="text-link">
                {t('اعرفني أكتر', 'Meet Mega')}
                <ArrowDown size={17} />
              </a>
            </div>
            <div className="hero-foot">
              <span>
                {t('من إسكندرية، لكل مكان', 'From Alexandria, for everywhere')}
              </span>
              <span dir="ltr">31.2001° N · 29.9187° E</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="grid-bg" />
            <div className="art-label">THE CREATIVE SIDE OF ME</div>
            <div className="orbit one" />
            <div className="orbit two" />
            <div className="sculpture">
              m<span>✷</span>
            </div>
            <div className="floating code">
              <Code2 /> &lt; build /&gt;
            </div>
            <div className="floating design">
              <Layers /> design.
            </div>
            <div className="floating film">
              <Play /> create.
            </div>
            <span className="spark">✷</span>
            <div className="art-bottom">
              <span>IDEAS INTO EXPERIENCES</span>
              <span>↗</span>
            </div>
          </div>
        </section>
        <div className="ticker">
          <div>
            {[0, 1].map((n) => (
              <div className="ticker-set" aria-hidden={n === 1} key={n}>
                {[
                  ['تصميم مواقع', 'Web design'],
                  ['تطبيقات', 'Applications'],
                  ['هوية بصرية', 'Brand identity'],
                  ['موشن جرافيك', 'Motion graphics'],
                  ['تصوير ومونتاج', 'Filming & editing'],
                ].map(([ar, en]) => (
                  <span key={en}>
                    {t(ar, en)}
                    <i>✷</i>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <section id="work" className="work">
          <div className="section-top reveal">
            <div>
              <div className="eyebrow muted">01 / SELECTED WORK</div>
              <h2>
                {t('شغل بيحكي عنّي', 'The work speaks')}
                <i>.</i>
              </h2>
            </div>
            <p>
              {t('أفكار مختلفة، وشغف واحد.', 'Different ideas. One creative drive.')}
              <br />
              {t(
                'استكشف المشاريع حسب اللي يهمّك.',
                'Explore the work that interests you.'
              )}
            </p>
          </div>
          <div className="filters" aria-label={t('تصفية الأعمال', 'Filter projects')}>
            {Object.entries(names).map(([k, n]) => (
              <button
                aria-pressed={filter === k}
                className={filter === k ? 'active' : ''}
                key={k}
                onClick={() => setFilter(k as keyof typeof names)}
              >
                {n[lang]}
                <small>
                  {k === 'all'
                    ? projects.length
                    : projects
                        .filter((p) => p.type === k)
                        .length.toString()
                        .padStart(2, '0')}
                </small>
              </button>
            ))}
          </div>
          <div className="project-grid" key={filter}>
            {visible.map(card)}
          </div>
          {!visible.length && (
            <div className="empty">
              <Layers size={35} />
              <h3>{t('مساحة لأفكار جديدة', 'Room for new ideas')}</h3>
              <p>
                {t(
                  'القسم جاهز لإضافة أعمالك.',
                  'This collection is ready for your work.'
                )}
              </p>
            </div>
          )}
          <p className="note">
            {t(
              'المواقع الأصلية بلقطات فعلية. الأعمال الموسومة «نموذج تجريبي» أفكار وهمية للعرض.',
              'Original websites use real screenshots. Projects labelled Concept project are fictional examples.'
            )}
          </p>
        </section>
        <section id="design" className="collection reveal">
          <div className="section-top">
            <div>
              <div className="eyebrow muted">02 / VISUAL DESIGN</div>
              <h2>
                {t('تفاصيل بتعمل الفرق', 'Details make the difference')}
                <i>.</i>
              </h2>
            </div>
            <p>
              {t(
                'هويات بصرية، سوشيال ميديا ومطبوعات.',
                'Brand identities, social graphics and print.'
              )}
            </p>
          </div>
          {designs.length ? (
            <DesignCarousel english={!!lang}>{designs.map(card)}</DesignCarousel>
          ) : (
            <div className="collection-empty">
              <div className="design-art" aria-hidden="true">
                <b>Aa</b>
                <span>✷</span>
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div>
                <h3>{t('مساحة لكل فكرة بصرية.', 'A space for every visual idea.')}</h3>
                <p>
                  {t(
                    'معرض التصميمات جاهز. أضف صور أعمالك لعرضها وتكبيرها بكامل التفاصيل.',
                    'Your design gallery is ready. Add your work and explore every detail in full size.'
                  )}
                </p>
              </div>
            </div>
          )}
        </section>
        <section id="videos" className="video-section reveal">
          <div className="section-top">
            <div>
              <div className="eyebrow muted">03 / MOTION & FILM</div>
              <h2>
                {t('حكايات تستحق المشاهدة', 'Stories worth watching')}
                <i>.</i>
              </h2>
            </div>
            <p>
              {t(
                'موشن جرافيك، تصوير ومونتاج.',
                'Motion graphics, filming and editing.'
              )}
            </p>
          </div>
          {videos.length ? (
            <div className="project-grid">{videos.map(card)}</div>
          ) : (
            <div className="video-empty">
              <div className="play-art" aria-hidden="true">
                <span />
                <Play size={45} />
              </div>
              <div>
                <h3>{t('الفكرة لما تتحرّك.', 'Ideas, set in motion.')}</h3>
                <p>
                  {t(
                    'معرض فيديوهاتك جاهز لروابط يوتيوب أو ملفات MP4 وWebM.',
                    'Your video gallery supports YouTube links and MP4 or WebM videos.'
                  )}
                </p>
              </div>
            </div>
          )}
        </section>
        <section id="about" className="about reveal">
          <div>
            <div className="eyebrow muted">04 / BEHIND THE WORK</div>
            <h2>
              {t('عين مصمّم.', 'A designer’s eye.')}
              <br />
              {t('عقل مطوّر.', 'A developer’s mind.')}
              <br />
              <i>{t('وروح إسكندراني.', 'An Alexandrian soul.')}</i>
            </h2>
            <span className="about-star" aria-hidden="true">
              ✷
            </span>
          </div>
          <div className="about-copy">
            <small>{t('أهلًا، أنا ميجا 👋', 'Hello, I’m Mega 👋')}</small>
            <p>
              {t(
                'بحب أشوف الفكرة وهي بتتحول لحاجة الناس تقدر تشوفها وتستخدمها وتحس بيها.',
                'I love turning an idea into something people can see, use and connect with.'
              )}
            </p>
            <p className="secondary">
              {t(
                'مصمم جرافيك ومواقع، مبرمج ومصور. مؤسس ميجا ستوديو وصاحب منصة قناة الاتحاد السكندري. شغلي بيجمع بين الشكل والتجربة؛ من هوية لها شخصية، لموقع سهل الاستخدام، لفيديو يحكي حكاية.',
                'Graphic and web designer, developer and photographer. Founder of Mega Studio and owner of Ittihad Alexandria TV. I connect visual identity with experience, from distinctive brands and intuitive websites to stories told through film.'
              )}
            </p>
            <div className="tags">
              <span>{t('تصميم', 'Design')}</span>
              <span>{t('تطوير', 'Development')}</span>
              <span>{t('صناعة محتوى', 'Content creation')}</span>
            </div>
          </div>
        </section>
        <section className="services">
          <div className="section-top reveal">
            <div>
              <div className="eyebrow muted">05 / WHAT I DO</div>
              <h2>
                {t(
                  'من أول الفكرة، لآخر تفصيلة',
                  'From the first idea to the final detail'
                )}
                <i>.</i>
              </h2>
            </div>
          </div>
          {[
            {
              n: '01',
              ar: 'مواقع وتطبيقات',
              en: 'Websites & apps',
              d: [
                'واجهات سهلة الاستخدام وتجارب متجاوبة على كل الشاشات.',
                'Intuitive interfaces and responsive digital experiences across screens.',
              ],
              icon: <Code2 />,
            },
            {
              n: '02',
              ar: 'تصميم وهوية بصرية',
              en: 'Design & brand identity',
              d: [
                'هويات بصرية وتصميمات سوشيال ميديا ومطبوعات تعبّر عن مشروعك.',
                'Brand identities, social graphics and print that express your personality.',
              ],
              icon: <Layers />,
            },
            {
              n: '03',
              ar: 'فيديو وصناعة محتوى',
              en: 'Video & content creation',
              d: [
                'موشن جرافيك وتصوير ومونتاج يحوّلوا الفكرة لحكاية.',
                'Motion graphics, filming and editing that turn ideas into stories.',
              ],
              icon: <Clapperboard />,
            },
          ].map((s) => (
            <div key={s.n} className="service reveal">
              <span>{s.n}</span>
              <h3>{t(s.ar, s.en)}</h3>
              <p>{s.d[lang]}</p>
              {s.icon}
            </div>
          ))}
        </section>
        <section id="contact" className="contact reveal">
          <div className="eyebrow">06 / LET’S MAKE SOMETHING GREAT</div>
          <h2>
            {t('عندك فكرة؟', 'Have an idea?')}
            <br />
            {t('خلّينا نعملها', 'Let’s make it')}{' '}
            <span>{t('حقيقة.', 'real.')}</span>
          </h2>
          {email ? (
            <a className="contact-link" href={'mailto:' + email}>
              {t('ابدأ مشروعك معايا', 'Let’s build something')}
              {arrow}
            </a>
          ) : (
            <p>
              {t('بيانات التواصل هتتوفر قريبًا.', 'Contact details coming soon.')}
            </p>
          )}
          <span className="contact-star" aria-hidden="true">
            ✷
          </span>
        </section>
      </main>
      <footer>
        <a className="footer-brand" href="#">
          {t('ميجا', 'Mega')}
          <small>© {new Date().getFullYear()}</small>
        </a>
        <span>
          {t(
            'اتعمل بشغف، وبروح إسكندرية.',
            'Made with passion. Rooted in Alexandria.'
          )}
        </span>
        <div>
          <a href="/mega-control">{t('لوحة التحكم', 'Control panel')}</a>
          <button onClick={() => setMotion(!motion)} aria-pressed={!motion}>
            {motion ? <Pause size={14} /> : <Play size={14} />}{' '}
            {motion
              ? t('إيقاف الحركة', 'Pause motion')
              : t('تشغيل الحركة', 'Enable motion')}
          </button>
        </div>
      </footer>
      <dialog
        ref={dialog}
        onCancel={close}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        aria-label={selected?.name[lang]}
      >
        <div className="modal-content">
          <button
            className="close"
            onClick={close}
            aria-label={t('إغلاق', 'Close')}
            autoFocus
          >
            <X />
          </button>
          {selected && (
            <>
              <span className="tag">{names[selected.type][lang]}</span>
              <h2>{selected.name[lang]}</h2>
              <p>{selected.description[lang]}</p>
              {selected.demo && (
                <p className="demo-note">
                  {t(
                    'نموذج تجريبي — ليس مشروعًا لعميل حقيقي.',
                    'Fictional concept — not a client project.'
                  )}
                </p>
              )}
              {selected.type === 'design' &&
              behanceProject(selected.behance || selected.url) ? (
                <>
                  <BehanceProject
                    url={selected.behance || selected.url}
                    title={selected.name[lang]}
                    english={!!lang}
                  />
                  <a
                    className="button"
                    href={'/project/' + encodeURIComponent(selected.id)}
                  >
                    {t('فتح صفحة المشروع', 'Open project page')}
                    {arrow}
                  </a>
                </>
              ) : selected.video ? (
                videoEmbed(selected.video) ? (
                  <iframe
                    src={videoEmbed(selected.video)!.src}
                    title={selected.name[lang]}
                    allow="fullscreen; picture-in-picture; encrypted-media"
                    allowFullScreen
                  />
                ) : /\.(mp4|webm)(\?.*)?$/i.test(selected.video) ? (
                  <video
                    src={selected.video}
                    poster={selected.image}
                    controls
                    playsInline
                  />
                ) : (
                  <a
                    className="button"
                    href={selected.video}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('مشاهدة الفيديو', 'Watch video')}
                    {arrow}
                  </a>
                )
              ) : selected.image ? (
                <>
                  <div className="gallery-tabs">
                    <button
                      className={view === 'desktop' ? 'chosen' : ''}
                      onClick={() => setView('desktop')}
                    >
                      {selected.mobile
                        ? t('ديسكتوب', 'Desktop')
                        : t('التصميم', 'Image')}
                    </button>
                    {selected.mobile && (
                      <button
                        className={view === 'mobile' ? 'chosen' : ''}
                        onClick={() => setView('mobile')}
                      >
                        {t('موبايل', 'Mobile')}
                      </button>
                    )}
                    <a
                      href={
                        view === 'mobile' ? selected.mobile : selected.image
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('فتح الصورة كاملة ↗', 'Open full image ↗')}
                    </a>
                  </div>
                  <div className={'gallery-image ' + view}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={view === 'mobile' ? selected.mobile : selected.image}
                      alt={selected.name[lang]}
                    />
                  </div>
                </>
              ) : null}
              {selected.video && videoEmbed(selected.video)?.facebook && (
                <p>
                  {t(
                    'الفيديو لازم يكون عامًا ويسمح بالتضمين. ',
                    'This video must be public and embeddable. '
                  )}
                  <a
                    href={selected.video}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('افتح على فيسبوك ↗', 'Open on Facebook ↗')}
                  </a>
                </p>
              )}
              {selected.url && (
                <a
                  className="button"
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('زيارة المشروع', 'Visit website')}
                  {arrow}
                </a>
              )}
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
