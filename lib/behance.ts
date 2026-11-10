export function behanceProject(value:string){
 try{const u=new URL(value.trim());if(u.protocol!=='https:'||u.username||u.password||u.port||!['behance.net','www.behance.net'].includes(u.hostname.toLowerCase()))return null;
 const m=u.pathname.match(/^\/(?:gallery|embed\/project)\/(\d+)(?:\/|$)/);if(!m)return null;const id=m[1];return {id,url:`https://www.behance.net/gallery/${id}`,embed:`https://www.behance.net/embed/project/${id}?ilo0=1`,title:decodeURIComponent(u.pathname.split('/')[3]||'Behance project').replace(/[-_]/g,' ')};
 }catch{return null}
}
