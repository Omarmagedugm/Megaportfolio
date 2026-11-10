import {z} from 'zod';
import {behanceProject} from '../../../lib/behance';
import {authorized,content,cookie,login,reply,sameOrigin,saveContent} from '../../../lib/portfolio-server';
const url=z.string().max(2048).refine(v=>!v||/^\/(projects|samples|media)\/[a-zA-Z0-9_.-]+$/.test(v)||(()=>{try{return new URL(v).protocol==='https:'}catch{return false}})());
const pair=z.tuple([z.string().min(1).max(4000),z.string().min(1).max(4000)]);
const schema=z.object({revision:z.number().int().nonnegative(),email:z.union([z.literal(''),z.string().email().max(200)]),projects:z.array(z.object({id:z.string().min(1).max(80),name:pair,kind:pair,description:pair,type:z.enum(['web','app','design','video']),url,image:url,mobile:url.optional(),video:url.optional(),color:z.string().regex(/^#[a-fA-F0-9]{6}$/),behance:z.string().max(2048).refine(v=>!v||!!behanceProject(v)).optional(),demo:z.boolean().optional()})).max(200)}).refine(d=>new Set(d.projects.map(p=>p.id)).size===d.projects.length);
export async function GET(request: Request) {
  try {
    if (!await authorized(request)) return reply({ error: 'سجّل الدخول' }, 401);
    return reply(await content());
  } catch {
    return reply({ error: 'تعذّر تحميل المحتوى' }, 503);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: 'طلب غير مسموح' }, 403);
  try {
    const body = await request.text();
    if (body.length > 2_000_000) return reply({ error: 'الطلب كبير جدًا' }, 413);
    const data = JSON.parse(body);
    if (data?.action === 'login') {
      if (typeof data.password !== 'string' || data.password.length > 200 ||
          typeof data.email !== 'string' || data.email.length > 200) {
        return reply({ error: 'بيانات غير صحيحة' }, 400);
      }
      const result = await login(data.email.trim(), data.password);
      if ('error' in result) return reply({ error: result.error }, result.status);
      return reply({ ok: true }, 200, { 'Set-Cookie': cookie(result.token, request) });
    }
    if (data?.action === 'logout') {
      return reply({ ok: true }, 200, { 'Set-Cookie': cookie('', request, 0) });
    }
    if (!await authorized(request)) return reply({ error: 'سجّل الدخول' }, 401);
    const parsed = schema.safeParse(data);
    if (!parsed.success) return reply({ error: 'راجع الحقول والروابط. استخدم روابط HTTPS.' }, 400);
    const { revision, ...value } = parsed.data;
    if (!await saveContent(value, revision)) {
      return reply({ error: 'تم التعديل من نافذة أخرى. حدّث الصفحة قبل الحفظ.' }, 409);
    }
    return reply({ ...value, revision: revision + 1 });
  } catch (error) {
    if (error instanceof SyntaxError) return reply({ error: 'بيانات غير صحيحة' }, 400);
    return reply({ error: 'تعذّر تنفيذ الطلب. حاول مرة أخرى.' }, 500);
  }
}
