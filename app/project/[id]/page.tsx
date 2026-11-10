import {notFound} from 'next/navigation';
import {content} from '../../../lib/portfolio-server';
import {works,type Work} from '../../data';
import ProjectView from '../../../components/ProjectView';
export const dynamic='force-dynamic';
export default async function Project({params}:{params:Promise<{id:string}>}){const {id}=await params;let projects:Work[];try{projects=(await content()).projects}catch{projects=works}const project=projects.find(p=>p.id===id);if(!project)notFound();return <ProjectView project={project}/>}
