import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {behanceProject} from '../../../lib/behance';
import {authorized,content,cookie,db,digest,hex,reply} from '../../../lib/portfolio-server';
const url=z.string().max(2048).refine(v=>!v||/^\/(projects|samples|media)\/[a-zA-Z0-9_.-]+$/.test(v)||(()=>{try{return new URL(v).protocol==='https:'}catch{return false}})());
const pair=z.tuple([z.string().min(1).max(4000),z.string().min(1).max(4000)]);
const schema=z.object({revision:z.number().int().nonnegative(),email:z.union([z.literal(''),z.string().email().max(200)]),projects:z.array(z.object({id:z.string().min(1).max(80),name:pair,kind:pair,description:pair,type:z.enum(['web','app','design','video']),url,image:url,mobile:url.optional(),video:url.optional(),color:z.string().regex(/^#[a-fA-F0-9]{6}$/),behance:z.string().max(2048).refine(v=>!v||!!behanceProject(v)).optional(),demo:z.boolean().optional()})).max(200)}).refine(d=>new Set(d.projects.map(p=>p.id)).size===d.projects.length);
export async function GET(r:Request){if(!await authorized(r))return reply({error:'سجّل الدخول'},401);return reply(await content())}
export async function POST(r:Request){try{
 if(r.headers.get('origin')!==new URL(r.url).origin)return reply({error:'طلب غير مسموح'},403);
 const body=await r.text();if(body.length>2000000)return reply({error:'الطلب كبير جدًا'},413);const data=JSON.parse(body);
 if(data.action==='login'){
 if(!env.ADMIN_EMAIL||!env.ADMIN_PASSWORD_HASH||!env.ADMIN_PASSWORD_SALT)return reply({error:'الدخول غير مُعد'},503);
 const now=Date.now(),key=await digest('login:'+(r.headers.get('cf-connecting-ip')||'shared'));
 await db().prepare('INSERT INTO admin_attempts(key,count,reset) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset<? THEN 1 ELSE count+1 END,reset=CASE WHEN reset<? THEN excluded.reset ELSE reset END').bind(key,now+900000,now,now).run();
 const a=await db().prepare('SELECT count FROM admin_attempts WHERE key=?').bind(key).first<{count:number}>();if(a&&a.count>8)return reply({error:'محاولات كثيرة. حاول بعد ١٥ دقيقة.'},429);
 if(typeof data.password!=='string'||data.password.length>200||typeof data.email!=='string')return reply({error:'بيانات غير صحيحة'},400);
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(data.password),'PBKDF2',false,['deriveBits']);const h=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(env.ADMIN_PASSWORD_SALT),iterations:100000,hash:'SHA-256'},k,256));let diff=h.length^env.ADMIN_PASSWORD_HASH.length;for(let i=0;i<h.length;i++)diff|=h.charCodeAt(i)^(env.ADMIN_PASSWORD_HASH.charCodeAt(i)||0);
 if(diff||data.email.trim().toLowerCase()!==env.ADMIN_EMAIL.toLowerCase())return reply({error:'البريد أو كلمة المرور غير صحيحة'},401);
 const token=hex(crypto.getRandomValues(new Uint8Array(32)).buffer);await db().batch([db().prepare('INSERT INTO admin_sessions(token,expires) VALUES(?,?)').bind(await digest(token),now+28800000),db().prepare('DELETE FROM admin_sessions WHERE expires<?').bind(now),db().prepare('DELETE FROM admin_attempts WHERE key=? OR reset<?').bind(key,now)]);return reply({ok:true},200,{'Set-Cookie':cookie(token,r)});
 }
 if(!await authorized(r))return reply({error:'سجّل الدخول'},401);
 if(data.action==='logout'){const t=r.headers.get('cookie')?.match(/mega_admin=([a-f0-9]{64})/)?.[1];if(t)await db().prepare('DELETE FROM admin_sessions WHERE token=?').bind(await digest(t)).run();return reply({ok:true},200,{'Set-Cookie':cookie('',r,0)})}
 const p=schema.safeParse(data);if(!p.success)return reply({error:'راجع الحقول والروابط. استخدم روابط HTTPS.'},400);const {revision,...value}=p.data;
 await db().prepare('INSERT OR IGNORE INTO portfolio_content(id,payload,revision) VALUES(1,?,0)').bind(JSON.stringify(await content())).run();const result=await db().prepare('UPDATE portfolio_content SET payload=?,revision=revision+1 WHERE id=1 AND revision=?').bind(JSON.stringify(value),revision).run();if(!result.meta.changes)return reply({error:'تم التعديل من نافذة أخرى. حدّث الصفحة قبل الحفظ.'},409);return reply({...value,revision:revision+1});
 }catch{return reply({error:'تعذّر تنفيذ الطلب. حاول مرة أخرى.'},500)}}
