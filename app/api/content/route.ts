import {content,reply} from '../../../lib/portfolio-server';
export async function GET(){try{return reply(await content())}catch{return reply({error:'تعذّر تحميل المحتوى'},503)}}
