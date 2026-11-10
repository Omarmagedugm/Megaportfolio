# Mega Portfolio
Bilingual Arabic/English portfolio. Seven real projects retain fourteen browser screenshots. Fifteen clearly labelled fictional concepts: five apps, five designs, five six-second motion clips.

## Content management
Private route `/mega-control`, absent from public navigation, noindex. Email/password checked server-side with salted PBKDF2 (100,000 iterations); 8-hour HttpOnly SameSite session, Secure on HTTPS. Login throttled to eight attempts per 15 minutes. Production secrets: ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT. Never commit their values. Sites owner-private gate is preserved independently.

Shared D1 content with optimistic revision checking. R2 image/video upload supports JPEG/PNG/WebP/MP4/WebM up to 25 MB. Deleting a project removes its listing, not uploaded object bytes. Content export available. Edit both languages, categories, cover/mobile images, video URLs, concept flags and public contact email.

Facebook public video iframe support and fallback source link; direct video URLs recommended over share links. YouTube and MP4/WebM supported. No Facebook API credentials needed. Playback depends on source visibility and embedding permissions.

Use npm run db:generate for schema changes. Apply pending SQL locally after build using Wrangler. Sites applies hosted migrations on publish. Local credentials and content are isolated from production.
