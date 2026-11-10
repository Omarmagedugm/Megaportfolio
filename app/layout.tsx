import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'ميجا | تصميم، تطوير، وحكايات بصرية',description:'Mega — مصمم ومطوّر وصانع محتوى من إسكندرية. Websites, apps, design and video.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body>{children}</body></html>}
