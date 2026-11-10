import { authorized, mediaBucket, reply, sameOrigin } from '../../../lib/portfolio-server';

const extensions = new Map([
  ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'],
  ['video/mp4', 'mp4'], ['video/webm', 'webm'],
]);

export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: 'طلب غير مسموح' }, 403);
  if (!await authorized(request)) return reply({ error: 'سجّل الدخول' }, 401);
  if (Number(request.headers.get('content-length')) > 26_000_000) {
    return reply({ error: 'أقصى حجم ٢٥ ميجابايت' }, 413);
  }
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.size || file.size > 25_000_000) {
      return reply({ error: 'اختار ملف صالح حجمه لحد ٢٥ ميجابايت' }, 400);
    }
    const extension = extensions.get(file.type);
    if (!extension) return reply({ error: 'صيغة غير مدعومة' }, 400);
    const key = crypto.randomUUID() + '.' + extension;
    await mediaBucket().file('portfolio/' + key).save(Buffer.from(await file.arrayBuffer()), {
      resumable: false,
      metadata: { contentType: file.type },
      preconditionOpts: { ifGenerationMatch: 0 },
    });
    return reply({ url: '/media/' + key });
  } catch {
    return reply({ error: 'تعذّر رفع الملف. حاول مرة أخرى.' }, 503);
  }
}
