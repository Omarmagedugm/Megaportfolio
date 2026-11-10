import {env} from 'cloudflare:workers';
import {works} from '../app/data';
export const db=()=>{if(!env.DB)throw Error('Database unavailable');return env.DB};
export function reply(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}})}
export const hex=(a:ArrayBuffer)=>Array.from(new Uint8Array(a),b=>b.toString(16).padStart(2,'0')).join('');
export async function digest(s:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))}
export async function authorized(r:Request){const t=r.headers.get('cookie')?.match(/(?:^|;\s*)mega_admin=([a-f0-9]{64})(?:;|$)/)?.[1];return t?!!await db().prepare('SELECT token FROM admin_sessions WHERE token=? AND expires>?').bind(await digest(t),Date.now()).first():false}
export async function content(){const row=await db().prepare('SELECT payload,revision FROM portfolio_content WHERE id=1').first<{payload:string;revision:number}>();return row?{...JSON.parse(row.payload),revision:row.revision}:{projects:works,email:'',revision:0}}
export function cookie(t:string,r:Request,age=28800){return `mega_admin=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${new URL(r.url).protocol==='https:'?'; Secure':''}`}
