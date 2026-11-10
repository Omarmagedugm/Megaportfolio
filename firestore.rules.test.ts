/**
 * Firestore Security Rules Test Suite (Dirty Dozen Verification)
 * Verifies all 12 adversarial payloads against the hardened ruleset.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const dirtyDozenTests: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Write',
    collection: '/projects/p1',
    operation: 'create',
    auth: null,
    payload: { id: 'p1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Admin Email Spoof',
    collection: '/projects/p1',
    operation: 'create',
    auth: { uid: 'u1', email: 'admin@example.com', email_verified: false },
    payload: { id: 'p1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Non-Admin Authenticated Write',
    collection: '/projects/p1',
    operation: 'create',
    auth: { uid: 'attacker', email: 'attacker@example.com', email_verified: true },
    payload: { id: 'p1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Create',
    collection: '/projects/p1',
    operation: 'create',
    auth: { uid: 'admin1', email: 'admin@example.com', email_verified: true },
    payload: { id: 'p1', isSuperAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Owner Spoofing on Create',
    collection: '/projects/p1',
    operation: 'create',
    auth: { uid: 'admin1', email: 'admin@example.com', email_verified: true },
    payload: { id: 'p1', ownerId: 'other_user' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Owner Mutation on Update',
    collection: '/projects/p1',
    operation: 'update',
    auth: { uid: 'admin1', email: 'admin@example.com', email_verified: true },
    payload: { ownerId: 'admin2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Immutable createdAt Tampering',
    collection: '/projects/p1',
    operation: 'update',
    auth: { uid: 'admin1', email: 'admin@example.com', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Client Timestamp Forgery',
    collection: '/projects/p1',
    operation: 'update',
    auth: { uid: 'admin1', email: 'admin@example.com', email_verified: true },
    payload: { updatedAt: '2099-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Value Poisoning / Invalid Hex Color',
    collection: '/projects/p1',
    operation: 'update',
    auth: { uid: 'admin1', email: 'admin@example.com', email_verified: true },
    payload: { color: 'not-a-hex-color' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'ID Mismatch Poisoning',
    collection: '/projects/p1',
    operation: 'create',
    auth: { uid: 'admin1', email: 'admin@example.com', email_verified: true },
    payload: { id: 'p2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unpublished Project Read by Public',
    collection: '/projects/draft1',
    operation: 'get',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Escalation',
    collection: '/admins/attacker',
    operation: 'create',
    auth: { uid: 'attacker', email: 'attacker@example.com', email_verified: true },
    payload: { uid: 'attacker' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
