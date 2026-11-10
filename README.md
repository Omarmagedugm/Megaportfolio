# Mega Portfolio

بورتفوليو عربي وإنجليزي مع كاروسيل للهوية البصرية، صفحات للمشاريع، وتضمين Behance وفيديوهات Facebook وYouTube. لوحة التحكم على `/mega-control` لتعديل المشاريع ورفع الصور والفيديوهات حتى 25 MB.

## إعداد النسخة المرفقة

- سجّل دخول الإدارة عبر Google في Firebase Authentication. في قاعدة Firestore المحددة في إعدادات التطبيق، أنشئ المستند `admins/<UID>` من Firebase Console للحساب الموثق، بالحقول `uid` و`createdAt`.
- اضبط `NEXT_PUBLIC_PORTFOLIO_CONTACT_EMAIL` لو عايز بريد تواصل عام يظهر كقيمة افتراضية.
- شغّل `bun install --frozen-lockfile` ثم `bun run dev` للتطوير المحلي.
- مسار رفع الوسائط يستخدم تخزينًا مؤقتًا. يلزم ربطه بتخزين دائم وتجهيز ملف اعتماديات npm مطابق قبل استخدام هذه النسخة مع Firebase App Hosting.
