'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Work } from '../data';
import { videoEmbed } from '../../lib/video';
import { behanceProject } from '../../lib/behance';
import BehanceProject from '../../components/BehanceProject';
import {
  auth,
  BLUEPRINT_LIMITS,
  BOOTSTRAPPED_ADMIN_EMAIL,
  checkIsUserAdmin,
  deleteProjectFromFirestore,
  googleProvider,
  onAuthStateChanged,
  saveProjectToFirestore,
  saveSettingsToFirestore,
  seedDefaultProjectsIfNeeded,
  signInWithPopup,
  signOut,
  subscribeToPortfolio,
  type User,
} from '../../lib/firebase';
import './admin.css';

type Content = { projects: Work[]; email: string; revision: number };

const labels = {
  web: 'المواقع',
  app: 'التطبيقات',
  design: 'التصميمات',
  video: 'الفيديوهات',
};

const empty = (): Work => ({
  id: crypto.randomUUID(),
  name: ['', ''],
  kind: ['', ''],
  description: ['', ''],
  type: 'design',
  url: '',
  image: '',
  video: '',
  mobile: '',
  color: '#e7e3da',
  demo: false,
  behance: '',
});

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<Content>({
    projects: [],
    email: BOOTSTRAPPED_ADMIN_EMAIL,
    revision: 0,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [item, setItem] = useState<Work | null>(null);
  const [filter, setFilter] = useState('all');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const allowed = await checkIsUserAdmin(currentUser);
          setIsAdmin(allowed);
          if (allowed) {
            await seedDefaultProjectsIfNeeded(currentUser);
          } else {
            setMessage(
              `هذا الحساب (${currentUser.email || ''}) غير مصرح له بإدارة المحتوى. استخدم حساب الإدارة (${BOOTSTRAPPED_ADMIN_EMAIL}).`
            );
          }
        } catch {
          setIsAdmin(false);
          setMessage('تعذّر التحقق من صلاحيات الحساب.');
        }
      } else {
        setIsAdmin(false);
      }
      setAuthReady(true);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authReady || !user || !isAdmin) return;
    const unsubData = subscribeToPortfolio((next) => {
      setData({
        projects: next.projects,
        email: next.email,
        revision: next.revision,
      });
    });
    return () => unsubData();
  }, [authReady, user, isAdmin]);

  async function handleGoogleLogin() {
    setBusy(true);
    setMessage('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setMessage('تعذّر تسجيل الدخول بحساب Google. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setMessage('');
    try {
      await signOut(auth);
      setItem(null);
    } catch {
      setMessage('تعذّر تسجيل الخروج');
    } finally {
      setBusy(false);
    }
  }

  async function saveProject(project: Work) {
    if (!user || !isAdmin) return;
    if (project.behance && !behanceProject(project.behance)) {
      setMessage(
        'استخدم رابط مشروع بيهانس صحيح: https://www.behance.net/gallery/…'
      );
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const existingIndex = data.projects.findIndex((p) => p.id === project.id);
      const sortOrder =
        existingIndex >= 0 ? existingIndex : data.projects.length;
      await saveProjectToFirestore(project, sortOrder, user);
      setItem(null);
      setMessage('تم الحفظ على قاعدة البيانات (Firestore) بنجاح.');
    } catch {
      setMessage('تعذّر حفظ المشروع. تأكد من صلاحيات الحساب والبيانات.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteProject(project: Work) {
    if (!user || !isAdmin) return;
    setBusy(true);
    setMessage('');
    try {
      await deleteProjectFromFirestore(project.id);
      setPendingDeleteId(null);
      setMessage(`تم حذف «${project.name[0]}» بنجاح.`);
    } catch {
      setMessage('تعذّر حذف المشروع.');
    } finally {
      setBusy(false);
    }
  }

  async function saveContactEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !isAdmin) return;
    setBusy(true);
    setMessage('');
    try {
      const nextRev = await saveSettingsToFirestore(data.email, user);
      setData((prev) => ({ ...prev, revision: nextRev }));
      setMessage('تم حفظ بيانات التواصل بنجاح.');
    } catch {
      setMessage('تعذّر حفظ بيانات التواصل.');
    } finally {
      setBusy(false);
    }
  }

  async function upload(f: File, field: 'image' | 'mobile' | 'video') {
    if (f.size > 25_000_000) {
      setMessage('أقصى حجم ٢٥ ميجابايت');
      return;
    }
    setBusy(true);
    setMessage('جاري رفع الملف…');
    try {
      const form = new FormData();
      form.set('file', f);
      const r = await fetch('/api/upload', { method: 'POST', body: form });
      const d = (await r.json()) as { error?: string; url: string };
      if (!r.ok) throw Error(d.error || 'تعذّر تنفيذ الطلب');
      setItem((p) => (p ? { ...p, [field]: d.url } : p));
      setMessage('تم الرفع. اضغط حفظ المشروع لتطبيق التغيير.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const field = (key: 'name' | 'kind' | 'description', title: string) => (
    <div className="admin-pair">
      {[0, 1].map((n) => (
        <label key={n}>
          {title} {n ? 'بالإنجليزي' : 'بالعربي'}
          {key === 'description' ? (
            <textarea
              required
              maxLength={BLUEPRINT_LIMITS.DESCRIPTION_MAX}
              value={item![key][n]}
              dir={n ? 'ltr' : 'rtl'}
              onChange={(e) =>
                setItem({
                  ...item!,
                  [key]: item![key].map((v, i) =>
                    i === n ? e.target.value : v
                  ) as [string, string],
                })
              }
            />
          ) : (
            <input
              required
              maxLength={BLUEPRINT_LIMITS.TITLE_MAX}
              value={item![key][n]}
              dir={n ? 'ltr' : 'rtl'}
              onChange={(e) =>
                setItem({
                  ...item!,
                  [key]: item![key].map((v, i) =>
                    i === n ? e.target.value : v
                  ) as [string, string],
                })
              }
            />
          )}
        </label>
      ))}
    </div>
  );

  return (
    <main className="admin-shell" dir="rtl">
      <div className="admin-top">
        <Link href="/" className="admin-brand">
          m<span>✷</span> <small>MEGA STUDIO</small>
        </Link>
        <a href="/" target="_blank" rel="noopener noreferrer">
          معاينة الموقع ↗
        </a>
      </div>

      {!authReady ? (
        <p>جاري التحميل…</p>
      ) : !user || !isAdmin ? (
        <section className="login-panel">
          <span className="admin-kicker">PRIVATE WORKSPACE</span>
          <h1>
            أعمالك، تحت سيطرتك<span>.</span>
          </h1>
          <p>
            سجّل الدخول بحساب Google المعتمد لإدارة محتوى البورتفوليو عبر
            Firebase.
          </p>
          <div className="admin-auth-actions">
            <button type="button" disabled={busy} onClick={handleGoogleLogin}>
              {busy ? 'جاري الدخول…' : 'الدخول باستخدام Google ←'}
            </button>
            {user && !isAdmin && (
              <button
                type="button"
                className="light"
                disabled={busy}
                onClick={handleLogout}
              >
                تبديل الحساب
              </button>
            )}
          </div>
        </section>
      ) : (
        <>
          <div className="admin-heading">
            <div>
              <span className="admin-kicker">CONTENT STUDIO · FIREBASE</span>
              <h1>
                كل شغلك. من مكان واحد<span>.</span>
              </h1>
              <p>
                إضافة وتعديل المشاريع والصور والفيديوهات بالعربي والإنجليزي
                مباشرة على Firestore.
              </p>
            </div>
            <button disabled={busy} onClick={handleLogout}>
              تسجيل الخروج
            </button>
          </div>

          <div className="admin-stats">
            {Object.entries(labels).map(([k, v]) => (
              <button
                key={k}
                className={filter === k ? 'selected' : ''}
                onClick={() => setFilter(k)}
              >
                <b>{data.projects.filter((p) => p.type === k).length}</b>
                {v}
              </button>
            ))}
          </div>

          <div className="admin-tools">
            <button
              onClick={() => {
                setItem(empty());
                setMessage('');
              }}
            >
              ＋ إضافة مشروع
            </button>
            <button className="light" onClick={() => setFilter('all')}>
              كل المشاريع
            </button>
            <button
              className="light"
              onClick={() => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(
                  new Blob([JSON.stringify(data, null, 2)], {
                    type: 'application/json',
                  })
                );
                a.download = 'mega-content.json';
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
              }}
            >
              تصدير نسخة
            </button>
          </div>

          {item && (
            <section className="edit-panel">
              <div className="admin-tools">
                <h2>
                  {data.projects.some((p) => p.id === item.id)
                    ? 'تعديل المشروع'
                    : 'مشروع جديد'}
                </h2>
                <button
                  className="light"
                  disabled={busy}
                  onClick={() => setItem(null)}
                >
                  إلغاء
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveProject(item);
                }}
              >
                {field('name', 'الاسم')}
                <label>
                  القسم
                  <select
                    value={item.type}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        type: e.target.value as Work['type'],
                      })
                    }
                  >
                    {Object.entries(labels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                {item.type === 'design' && (
                  <div className="behance-editor">
                    <label>
                      رابط مشروع بيهانس (اختياري)
                      <input
                        type="url"
                        dir="ltr"
                        maxLength={BLUEPRINT_LIMITS.URL_MAX}
                        value={item.behance || ''}
                        placeholder="https://www.behance.net/gallery/123456789/Project-name"
                        onChange={(e) => {
                          const value = e.target.value;
                          const p = behanceProject(value);
                          setItem({
                            ...item,
                            behance: value,
                            ...(p
                              ? {
                                  name: item.name.map(
                                    (v) => v || p.title
                                  ) as [string, string],
                                  kind: [
                                    item.kind[0] || 'هوية بصرية',
                                    item.kind[1] || 'Visual identity',
                                  ],
                                  description: [
                                    item.description[0] ||
                                      'استعرض مشروع الهوية البصرية من بيهانس.',
                                    item.description[1] ||
                                      'Explore this visual identity project on Behance.',
                                  ],
                                }
                              : {}),
                          });
                        }}
                      />
                    </label>
                    <p className="admin-help">
                      الصق رابط المشروع، وسيظهر داخل تفاصيله تلقائيًا. يمكنك
                      إضافة صورة غلاف للكارت. لازم يكون المشروع عامًا وصاحبه
                      يسمح بالتضمين.
                    </p>
                    {item.behance && !behanceProject(item.behance) && (
                      <p role="alert">
                        الرابط غير صالح. استخدم رابط مشروع /gallery/ وليس رابط
                        البروفايل.
                      </p>
                    )}
                    {behanceProject(item.behance || '') && (
                      <BehanceProject
                        url={item.behance!}
                        title={item.name[0] || 'معاينة بيهانس'}
                      />
                    )}
                  </div>
                )}
                {field('kind', 'نوع العمل')}
                {field('description', 'الوصف')}
                <div className="admin-pair">
                  <label>
                    رابط المشروع
                    <input
                      value={item.url}
                      dir="ltr"
                      maxLength={BLUEPRINT_LIMITS.URL_MAX}
                      placeholder="https://…"
                      onChange={(e) =>
                        setItem({ ...item, url: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    لون الخلفية
                    <input
                      type="color"
                      value={item.color}
                      onChange={(e) =>
                        setItem({ ...item, color: e.target.value })
                      }
                    />
                  </label>
                </div>
                {(
                  [
                    'image',
                    'mobile',
                    ...(item.type === 'video' ? ['video'] : []),
                  ] as ('image' | 'mobile' | 'video')[]
                ).map((k) => (
                  <label key={k}>
                    {k === 'image'
                      ? 'صورة الغلاف'
                      : k === 'mobile'
                        ? 'لقطة الموبايل (اختياري)'
                        : 'رابط الفيديو — Facebook / YouTube / MP4 / WebM'}
                    <input
                      dir="ltr"
                      maxLength={BLUEPRINT_LIMITS.URL_MAX}
                      value={item[k] || ''}
                      onChange={(e) =>
                        setItem({ ...item, [k]: e.target.value })
                      }
                      placeholder={
                        k === 'video'
                          ? 'https://www.facebook.com/…/videos/…'
                          : 'https://…'
                      }
                    />
                    <input
                      type="file"
                      disabled={busy}
                      accept={
                        k === 'video'
                          ? 'video/mp4,video/webm'
                          : 'image/jpeg,image/png,image/webp'
                      }
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void upload(f, k);
                      }}
                    />
                    <small>رفع ملف حتى ٢٥ ميجابايت أو لصق رابط مباشر.</small>
                  </label>
                ))}
                {item.type === 'video' && (
                  <p className="admin-help">
                    فيسبوك: استخدم رابط الفيديو العام أو الرابط من كود التضمين.
                    روابط المشاركة المختصرة قد تحتاج استبدالها بالرابط الأصلي.
                    يتوفر زر لفتح الفيديو على فيسبوك.
                  </p>
                )}
                {item.video && videoEmbed(item.video) && (
                  <iframe
                    className="admin-video"
                    src={videoEmbed(item.video)!.src}
                    title="معاينة الفيديو"
                    allowFullScreen
                  />
                )}
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={!!item.demo}
                    onChange={(e) =>
                      setItem({ ...item, demo: e.target.checked })
                    }
                  />{' '}
                  نموذج تجريبي (مشروع وهمي)
                </label>
                <button disabled={busy}>
                  {busy ? 'جاري الحفظ…' : 'حفظ المشروع ونشر التعديل'}
                </button>
              </form>
            </section>
          )}

          <div className="admin-list">
            {data.projects
              .filter((p) => filter === 'all' || p.type === filter)
              .map((p) => (
                <article key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image || '/favicon.svg'} alt="" />
                  <div>
                    <h3>{p.name[0]}</h3>
                    <p>
                      {labels[p.type]} {p.demo ? '· نموذج تجريبي' : ''}
                    </p>
                  </div>
                  <button
                    className="light"
                    disabled={busy}
                    onClick={() => {
                      setItem(structuredClone(p));
                      setMessage('');
                      window.scrollTo({ top: 200, behavior: 'smooth' });
                    }}
                  >
                    تعديل
                  </button>
                  {pendingDeleteId === p.id ? (
                    <>
                      <button
                        className="danger"
                        disabled={busy}
                        onClick={() => void confirmDeleteProject(p)}
                      >
                        تأكيد الحذف
                      </button>
                      <button
                        className="light"
                        disabled={busy}
                        onClick={() => setPendingDeleteId(null)}
                      >
                        تراجع
                      </button>
                    </>
                  ) : (
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() => setPendingDeleteId(p.id)}
                    >
                      حذف
                    </button>
                  )}
                </article>
              ))}
          </div>

          <section className="edit-panel">
            <h2>بيانات التواصل</h2>
            <form onSubmit={saveContactEmail}>
              <label>
                البريد الظاهر للزوار
                <input
                  type="email"
                  dir="ltr"
                  maxLength={BLUEPRINT_LIMITS.EMAIL_MAX}
                  value={data.email}
                  onChange={(e) =>
                    setData({ ...data, email: e.target.value })
                  }
                />
              </label>
              <button disabled={busy}>حفظ بيانات التواصل</button>
            </form>
          </section>
        </>
      )}

      {message && (
        <div className="admin-message" role="status">
          {message}
        </div>
      )}
    </main>
  );
}
