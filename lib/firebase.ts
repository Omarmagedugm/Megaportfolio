import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { works, type Work } from '../app/data';
import {
  BLUEPRINT_LIMITS,
  DEFAULT_CONTACT_EMAIL,
  docToWork,
  sanitizeProjectId,
  sanitizeWorkForBlueprint,
  type FirestoreProjectDoc,
} from './portfolio-model';

export {
  BLUEPRINT_LIMITS,
  DEFAULT_CONTACT_EMAIL,
  docToWork,
  sanitizeProjectId,
  sanitizeWorkForBlueprint,
  type FirestoreProjectDoc,
};

// Silence noisy internal WebChannel transport logs in sandboxed/iframe environments
setLogLevel('silent');

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: typeof window !== 'undefined',
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isOfflineOrTransientError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    msg.includes('client is offline') ||
    msg.includes('could not reach cloud firestore backend') ||
    msg.includes('operation could not be completed') ||
    msg.includes('network error')
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = typeof window !== 'undefined' ? auth.currentUser : null;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId ?? null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  if (!isOfflineOrTransientError(error)) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

let connectionTested = false;
export async function testFirestoreConnection(): Promise<void> {
  if (connectionTested || typeof window === 'undefined') return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'settings', 'general'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is operating in offline fallback mode.');
    }
  }
}

export async function checkIsUserAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  const adminPath = `admins/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch (error) {
    if (isOfflineOrTransientError(error)) return false;
    handleFirestoreError(error, OperationType.GET, adminPath);
  }
}

export async function fetchPortfolioFromFirestore(): Promise<{
  projects: Work[];
  email: string;
  revision: number;
  seeded: boolean;
}> {
  let email = DEFAULT_CONTACT_EMAIL;
  let revision = 0;

  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
    if (settingsSnap.exists()) {
      const sData = settingsSnap.data();
      if (typeof sData.email === 'string') email = sData.email;
      if (typeof sData.revision === 'number') revision = sData.revision;
    }
  } catch (error) {
    if (!isOfflineOrTransientError(error)) {
      handleFirestoreError(error, OperationType.GET, 'settings/general');
    }
  }

  try {
    const q = query(collection(db, 'projects'), where('published', '==', true));
    const snap = await getDocs(q);
    if (snap.empty) {
      return { projects: works, email, revision, seeded: false };
    }
    const items = snap.docs
      .map((d) => ({
        sortOrder: typeof d.data().sortOrder === 'number' ? d.data().sortOrder : 999,
        work: docToWork(d.data() as Partial<FirestoreProjectDoc>, d.id),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((x) => x.work);
    return { projects: items, email, revision, seeded: true };
  } catch (error) {
    if (isOfflineOrTransientError(error)) {
      return { projects: works, email, revision, seeded: false };
    }
    handleFirestoreError(error, OperationType.LIST, 'projects');
  }
}

export function subscribeToPortfolio(
  onData: (payload: { projects: Work[]; email: string; revision: number; seeded: boolean }) => void
): () => void {
  const q = query(collection(db, 'projects'), where('published', '==', true));
  let currentProjects: Work[] = works;
  let currentEmail = DEFAULT_CONTACT_EMAIL;
  let currentRevision = 0;
  let isSeeded = false;

  const unsubProjects = onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        currentProjects = works;
        isSeeded = false;
      } else {
        isSeeded = true;
        currentProjects = snap.docs
          .map((d) => ({
            sortOrder: typeof d.data().sortOrder === 'number' ? d.data().sortOrder : 999,
            work: docToWork(d.data() as Partial<FirestoreProjectDoc>, d.id),
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((x) => x.work);
      }
      onData({
        projects: currentProjects,
        email: currentEmail,
        revision: currentRevision,
        seeded: isSeeded,
      });
    },
    (error) => {
      if (!isOfflineOrTransientError(error)) {
        handleFirestoreError(error, OperationType.LIST, 'projects');
      }
    }
  );

  const unsubSettings = onSnapshot(
    doc(db, 'settings', 'general'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.email === 'string') currentEmail = data.email;
        if (typeof data.revision === 'number') currentRevision = data.revision;
      }
      onData({
        projects: currentProjects,
        email: currentEmail,
        revision: currentRevision,
        seeded: isSeeded,
      });
    },
    (error) => {
      if (!isOfflineOrTransientError(error)) {
        handleFirestoreError(error, OperationType.GET, 'settings/general');
      }
    }
  );

  return () => {
    unsubProjects();
    unsubSettings();
  };
}

export async function seedDefaultProjectsIfNeeded(user: User): Promise<void> {
  const q = query(collection(db, 'projects'), where('published', '==', true));
  let snap;
  try {
    snap = await getDocs(q);
  } catch (error) {
    if (isOfflineOrTransientError(error)) return;
    handleFirestoreError(error, OperationType.LIST, 'projects');
  }
  if (!snap.empty) return;

  for (let i = 0; i < works.length; i++) {
    const w = works[i];
    const base = sanitizeWorkForBlueprint(w, i, user.uid);
    const path = `projects/${base.id}`;
    try {
      await setDoc(doc(db, 'projects', base.id), {
        ...base,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  const settingsPath = 'settings/general';
  try {
    const existingSettings = await getDoc(doc(db, 'settings', 'general'));
    if (!existingSettings.exists()) {
      await setDoc(doc(db, 'settings', 'general'), {
        email: (user.email || DEFAULT_CONTACT_EMAIL).slice(0, BLUEPRINT_LIMITS.EMAIL_MAX),
        revision: 1,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, settingsPath);
  }
}

export async function saveProjectToFirestore(
  work: Work,
  sortOrder: number,
  user: User
): Promise<Work> {
  const base = sanitizeWorkForBlueprint(work, sortOrder, user.uid);
  const ref = doc(db, 'projects', base.id);
  const path = `projects/${base.id}`;

  let existingSnap;
  try {
    existingSnap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (existingSnap.exists()) {
    const { id: _id, ownerId: _ownerId, ...mutableFields } = base;
    void _id;
    void _ownerId;
    try {
      await updateDoc(ref, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(ref, {
        ...base,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  return docToWork(base, base.id);
}

export async function deleteProjectFromFirestore(projectId: string): Promise<void> {
  const id = sanitizeProjectId(projectId);
  const path = `projects/${id}`;
  try {
    await deleteDoc(doc(db, 'projects', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveSettingsToFirestore(email: string, user: User): Promise<number> {
  const cleanEmail = email.trim().slice(0, BLUEPRINT_LIMITS.EMAIL_MAX);
  const ref = doc(db, 'settings', 'general');
  const path = 'settings/general';

  let existingSnap;
  try {
    existingSnap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (existingSnap.exists()) {
    const currentRevision =
      typeof existingSnap.data().revision === 'number' ? existingSnap.data().revision : 0;
    const nextRevision = currentRevision + 1;
    try {
      await updateDoc(ref, {
        email: cleanEmail,
        revision: nextRevision,
        updatedAt: serverTimestamp(),
      });
      return nextRevision;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  } else {
    try {
      await setDoc(ref, {
        email: cleanEmail,
        revision: 1,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return 1;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

export { onAuthStateChanged, signInWithPopup, signOut, type User };
