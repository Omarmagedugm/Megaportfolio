# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every path not explicitly matched under `/databases/{database}/documents` is denied (`allow read, write: if false;`).
2. **Verified Admin Gate (`isAdmin`)**: Only authenticated users with `request.auth.token.email_verified == true` who have an existing document at `/admins/$(request.auth.uid)` may create, update, or delete portfolio projects or settings.
3. **Path Variable Hardening (`isValidId`)**: Every single-document operation (`get`, `create`, `update`, `delete`) validates its path ID parameter against `^[a-zA-Z0-9_\-]+$` with length `1..128` (and `1..80` for `projectId`).
4. **Strict Blueprint Validation (`isValidPortfolioProject` & `isValidPortfolioSettings`)**:
   - Every string field is bounded by `.size()` matching `firebase-blueprint.json`.
   - `color` must match `^#[a-fA-F0-9]{6}$`.
   - `type` must be one of `['web', 'app', 'design', 'video']`.
   - `ownerId` must match `request.auth.uid` on creation and remain immutable (`incoming().ownerId == existing().ownerId`) on update.
   - `createdAt` must equal `request.time` on creation and remain immutable (`incoming().createdAt == existing().createdAt`) on update.
   - `updatedAt` must equal `request.time` on both creation and update.
5. **Query Enforcer on `/projects` (`allow list`)**: `allow list` explicitly checks `resource.data.published == true || isAdmin()`, preventing unauthorized scraping of unpublished drafts.
6. **No Blanket List on `/settings` or `/admins`**: `list` is never granted on `/settings/{settingId}` or `/admins/{adminId}`.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Unauthenticated Write)**: `auth = null` attempting `create` on `/projects/p1`.
2. **Payload 2 (Unverified Admin Email Spoof)**: `auth = { uid: 'u1', token: { email: 'admin@example.com', email_verified: false } }` attempting `create` on `/projects/p1`.
3. **Payload 3 (Non-Admin Authenticated Write)**: `auth = { uid: 'attacker', token: { email: 'attacker@example.com', email_verified: true } }` attempting `create` on `/projects/p1`.
4. **Payload 4 (Shadow Field Injection on Create)**: Admin sending valid project fields plus `{ "isSuperAdmin": true }` to `/projects/p1`.
5. **Payload 5 (Owner Spoofing on Create)**: Admin (`uid: 'admin1'`) sending `{ "ownerId": "someone_else" }` on `/projects/p1`.
6. **Payload 6 (Owner Mutation on Update)**: Admin attempting to change `ownerId` from `'admin1'` to `'admin2'` during `update` on `/projects/p1`.
7. **Payload 7 (Immutable `createdAt` Tampering)**: Admin attempting to modify `createdAt` during `update` on `/projects/p1`.
8. **Payload 8 (Client Timestamp Forgery)**: Admin sending a forged past/future `updatedAt` != `request.time` on `/projects/p1`.
9. **Payload 9 (Value Poisoning / Oversized String)**: Admin updating `nameAr` with a 5,000-character string (`maxLength: 200`) or invalid `color: "red"` (`pattern: ^#[a-fA-F0-9]{6}$`).
10. **Payload 10 (ID Poisoning)**: Admin creating a project where path `{projectId}` (`p1`) does not match `incoming().id` (`p2`) or contains illegal characters.
11. **Payload 11 (Unpublished Project Read by Public)**: Unauthenticated user attempting `get` on `/projects/draft1` where `published == false`.
12. **Payload 12 (Self-Assigned Admin Escalation)**: Non-admin user (`uid: 'attacker'`) attempting `create` on `/admins/attacker`.
