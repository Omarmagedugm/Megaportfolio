import { type Work } from '../app/data';

export const DEFAULT_CONTACT_EMAIL = process.env.NEXT_PUBLIC_PORTFOLIO_CONTACT_EMAIL || '';

// Blueprint validation constants (mirrored verbatim from firebase-blueprint.json)
export const BLUEPRINT_LIMITS = {
  ID_MAX: 80,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 4000,
  URL_MAX: 2048,
  EMAIL_MAX: 200,
  COLOR_PATTERN: /^#[a-fA-F0-9]{6}$/,
} as const;

export interface FirestoreProjectDoc {
  id: string;
  nameAr: string;
  nameEn: string;
  kindAr: string;
  kindEn: string;
  descriptionAr: string;
  descriptionEn: string;
  type: 'web' | 'app' | 'design' | 'video';
  url: string;
  image: string;
  mobile: string;
  video: string;
  color: string;
  behance: string;
  demo: boolean;
  published: boolean;
  sortOrder: number;
  ownerId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export function sanitizeProjectId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, BLUEPRINT_LIMITS.ID_MAX);
  return cleaned || 'project-' + Date.now();
}

export function docToWork(data: Partial<FirestoreProjectDoc>, fallbackId: string): Work {
  const type =
    data.type === 'web' || data.type === 'app' || data.type === 'design' || data.type === 'video'
      ? data.type
      : 'design';
  return {
    id: data.id || fallbackId,
    name: [data.nameAr || 'مشروع', data.nameEn || 'Project'],
    kind: [data.kindAr || 'عمل إبداعي', data.kindEn || 'Creative work'],
    description: [data.descriptionAr || '-', data.descriptionEn || '-'],
    type,
    url: data.url || '',
    image: data.image || '',
    mobile: data.mobile || undefined,
    video: data.video || undefined,
    color:
      typeof data.color === 'string' && BLUEPRINT_LIMITS.COLOR_PATTERN.test(data.color)
        ? data.color
        : '#e7e3da',
    behance: data.behance || undefined,
    demo: Boolean(data.demo),
  };
}

export function sanitizeWorkForBlueprint(work: Work, sortOrder: number, ownerId: string) {
  const id = sanitizeProjectId(work.id);
  const nameAr = (work.name[0]?.trim() || work.name[1]?.trim() || 'مشروع').slice(
    0,
    BLUEPRINT_LIMITS.TITLE_MAX
  );
  const nameEn = (work.name[1]?.trim() || work.name[0]?.trim() || 'Project').slice(
    0,
    BLUEPRINT_LIMITS.TITLE_MAX
  );
  const kindAr = (work.kind[0]?.trim() || work.kind[1]?.trim() || 'تصميم').slice(
    0,
    BLUEPRINT_LIMITS.TITLE_MAX
  );
  const kindEn = (work.kind[1]?.trim() || work.kind[0]?.trim() || 'Design').slice(
    0,
    BLUEPRINT_LIMITS.TITLE_MAX
  );
  const descriptionAr = (
    work.description[0]?.trim() ||
    work.description[1]?.trim() ||
    'مشروع من أعمال ميجا.'
  ).slice(0, BLUEPRINT_LIMITS.DESCRIPTION_MAX);
  const descriptionEn = (
    work.description[1]?.trim() ||
    work.description[0]?.trim() ||
    'A project by Mega.'
  ).slice(0, BLUEPRINT_LIMITS.DESCRIPTION_MAX);
  const color = BLUEPRINT_LIMITS.COLOR_PATTERN.test(work.color) ? work.color : '#e7e3da';

  return {
    id,
    nameAr,
    nameEn,
    kindAr,
    kindEn,
    descriptionAr,
    descriptionEn,
    type: work.type,
    url: (work.url || '').trim().slice(0, BLUEPRINT_LIMITS.URL_MAX),
    image: (work.image || '').trim().slice(0, BLUEPRINT_LIMITS.URL_MAX),
    mobile: (work.mobile || '').trim().slice(0, BLUEPRINT_LIMITS.URL_MAX),
    video: (work.video || '').trim().slice(0, BLUEPRINT_LIMITS.URL_MAX),
    color,
    behance: (work.behance || '').trim().slice(0, BLUEPRINT_LIMITS.URL_MAX),
    demo: Boolean(work.demo),
    published: true,
    sortOrder,
    ownerId,
  };
}
