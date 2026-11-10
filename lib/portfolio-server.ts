import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { works, type Work } from '../app/data';

type Portfolio = { projects: Work[]; email: string };
const sessionSeconds = 28_800;
const chunkSize = 800_000;
const firebase = () => getApps()[0] ?? initializeApp();

export function reply(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}

export function sameOrigin(request: Request) {
  return request.headers.get('origin') === (process.env.PORTFOLIO_ORIGIN || new URL(request.url).origin);
}

export async function authorized(request: Request) {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)__session=([\w.-]+)(?:;|$)/)?.[1];
  const uid = process.env.FIREBASE_ADMIN_UID;
  if (!token || !uid) return false;
  try {
    return (await getAuth(firebase()).verifySessionCookie(token, true)).uid === uid;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  const uid = process.env.FIREBASE_ADMIN_UID;
  if (!apiKey || !uid) return { error: 'الدخول غير مُعد', status: 503 } as const;

  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const endpoint = emulator ? `http://${emulator}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com';
  const response = await fetch(endpoint + '/v1/accounts:signInWithPassword?key=' + encodeURIComponent(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json();
  if (response.status === 429 || result.error?.message?.startsWith('TOO_MANY_ATTEMPTS')) {
    return { error: 'محاولات كثيرة. حاول لاحقًا.', status: 429 } as const;
  }
  if (response.status >= 500) return { error: 'الدخول غير متاح مؤقتًا', status: 503 } as const;
  if (!response.ok || result.localId !== uid || typeof result.idToken !== 'string') {
    return { error: 'البريد أو كلمة المرور غير صحيحة', status: 401 } as const;
  }
  const token = await getAuth(firebase()).createSessionCookie(result.idToken, { expiresIn: sessionSeconds * 1000 });
  return { token };
}

export function cookie(token: string, request: Request, age = sessionSeconds) {
  const secure = process.env.NODE_ENV === 'production' || new URL(request.url).protocol === 'https:';
  return `__session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure ? '; Secure' : ''}`;
}

function documents() {
  const db = getFirestore(firebase());
  const collection = db.collection('megaPortfolio');
  return { db, metadata: collection.doc('content'), chunk: (i: number) => collection.doc('content-' + i) };
}

export async function content(): Promise<Portfolio & { revision: number }> {
  const { db, metadata, chunk } = documents();
  return db.runTransaction(async transaction => {
    const state = (await transaction.get(metadata)).data();
    if (!state) return { projects: works, email: '', revision: 0 };
    const parts = await transaction.getAll(...Array.from({ length: state.chunks }, (_, i) => chunk(i)));
    const bytes = Buffer.concat(parts.map(part => part.get('bytes')));
    return { ...JSON.parse(bytes.toString('utf8')), revision: state.revision };
  }, { readOnly: true });
}

export async function saveContent(value: Portfolio, revision: number) {
  const { db, metadata, chunk } = documents();
  const bytes = Buffer.from(JSON.stringify(value));
  // Keep each document below Firestore's 1 MiB limit while updating a whole revision atomically.
  const chunks = Math.ceil(bytes.length / chunkSize);
  return db.runTransaction(async transaction => {
    const state = (await transaction.get(metadata)).data();
    if ((state?.revision ?? 0) !== revision) return false;
    for (let i = 0; i < chunks; i++) {
      transaction.set(chunk(i), { bytes: bytes.subarray(i * chunkSize, (i + 1) * chunkSize) });
    }
    for (let i = chunks; i < (state?.chunks ?? 0); i++) transaction.delete(chunk(i));
    transaction.set(metadata, { revision: revision + 1, chunks });
    return true;
  });
}

export function mediaBucket() {
  return getStorage(firebase()).bucket(process.env.FIREBASE_STORAGE_BUCKET || undefined);
}
