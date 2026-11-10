# Mega Portfolio

بورتفوليو عربي وإنجليزي مع كاروسيل للهوية البصرية، صفحات للمشاريع، وتضمين Behance وفيديوهات Facebook وYouTube. لوحة التحكم على `/mega-control` لتعديل المشاريع ورفع الصور والفيديوهات حتى 25 MB.

## النشر على Firebase

1. جهّز مشروع Firebase مخصص للبورتفوليو على خطة **Blaze**. فعّل Firestore (قاعدة `(default)` في Production mode)، وCloud Storage، وتسجيل الدخول Email/Password في Authentication.
2. أضف حساب الإدارة من **Authentication → Users** وانسخ الـ UID. سجّل Firebase Web App وانسخ الـ `apiKey` من إعداداته.
3. من **App Hosting**، أنشئ Backend واربطه بمستودع `Omarmagedugm/Megaportfolio` بفرع `main` ومجلد المشروع `/`، واختر Web App اللي سجلته.
4. أضف متغيرات البيئة التالية في إعدادات الـ Backend واعمل rollout:

   | المتغير | القيمة |
   | --- | --- |
   | `FIREBASE_ADMIN_UID` | UID حساب الإدارة |
   | `FIREBASE_WEB_API_KEY` | `apiKey` لتطبيق الويب |
   | `FIREBASE_STORAGE_BUCKET` | اسم الـ bucket بدون `gs://` |
   | `PORTFOLIO_ORIGIN` | رابط الموقع النهائي مثل `https://example.hosted.app` بدون شرطة في الآخر |

5. Firebase Admin SDK يستخدم حساب خدمة App Hosting تلقائيًا. يحتاج حساب الخدمة صلاحيات إدارة جلسات Firebase Authentication والقراءة والكتابة في Firestore ورفع وقراءة الملفات من الـ bucket. راجع أدوار Firebase Authentication Admin وCloud Datastore User وStorage Object User على الـ bucket إذا كانت الأذونات ناقصة.
6. اترك Firestore وStorage مقفولين على الوصول المباشر من المتصفح. القواعد المرفقة للمشروع المخصص يمكن نشرها بـ `firebase deploy --only firestore:rules,storage --project YOUR_PROJECT_ID`. لو بتستخدم مشروع مشترك، ادمج القواعد مع قواعد تطبيقاتك الحالية بدل استبدالها. التطبيق يتعامل مع البيانات من السيرفر ويعرض الملفات العامة من `/media/`.

المشاريع الأساسية ووسائطها موجودة في المستودع. أي تعديلات موجودة فقط في D1 أو وسائط مرفوعة فقط إلى R2 تحتاج نقلًا منفصلًا.

## التشغيل المحلي

باستخدام Node.js 22.13+ شغّل `npm ci` ثم `npm run dev`. استخدم المتغيرات المذكورة في `.env.local` واضبط `PORTFOLIO_ORIGIN=http://localhost:3000`. للوصول إلى خدمات Firebase محليًا استخدم Application Default Credentials مع `GCLOUD_PROJECT` لمشروع تطوير، أو Emulator Suite. بيانات تسجيل الدخول والمفاتيح الخاصة تُدار خارج المستودع.
