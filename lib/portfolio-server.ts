import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  where,
} from 'firebase/firestore/lite';
import firebaseConfig from '../firebase-applet-config.json';
import { works, type Work } from '../app/data';
import {
  DEFAULT_CONTACT_EMAIL,
  docToWork,
  type FirestoreProjectDoc,
} from './portfolio-model';

type Portfolio = { projects: Work[]; email: string };

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const liteDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export function reply(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const expected = process.env.PORTFOLIO_ORIGIN || new URL(request.url).origin;
  return origin === expected || origin.endsWith('.run.app');
}

export async function content(): Promise<Portfolio & { revision: number }> {
  let email = DEFAULT_CONTACT_EMAIL;
  let revision = 0;

  try {
    const settingsSnap = await getDoc(doc(liteDb, 'settings', 'general'));
    if (settingsSnap.exists()) {
      const sData = settingsSnap.data();
      if (typeof sData.email === 'string') email = sData.email;
      if (typeof sData.revision === 'number') revision = sData.revision;
    }

    const q = query(collection(liteDb, 'projects'), where('published', '==', true));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const projects = snap.docs
        .map((d) => ({
          sortOrder: typeof d.data().sortOrder === 'number' ? d.data().sortOrder : 999,
          work: docToWork(d.data() as Partial<FirestoreProjectDoc>, d.id),
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((x) => x.work);
      return { projects, email, revision };
    }
  } catch {
    // Fallback to static portfolio works if server-side Firestore query fails
  }

  return { projects: works, email, revision };
}
