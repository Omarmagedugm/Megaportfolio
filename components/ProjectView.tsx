'use client';
import {useState,useEffect} from 'react';
import type {Work} from '../app/data';
import BehanceProject from './BehanceProject';
import {behanceProject} from '../lib/behance';
export default function ProjectView({project:p}:{project:Work}){const [en,setEn]=useState(false);useEffect(()=>{setEn(localStorage.getItem('mega-lang')==='en')},[]);const n=en?1:0;const link=p.behance||(p.type==='design'&&behanceProject(p.url)?p.url:'');return <main className="project-page" dir={en?'ltr':'rtl'}><div className="project-page-nav"><a href="/#design">{en?'← Back to portfolio':'العودة للأعمال ←'}</a><button onClick={()=>setEn(!en)}>{en?'عربي':'EN'}</button></div><small>MEGA / VISUAL IDENTITY</small><h1>{p.name[n]}</h1><p>{p.description[n]}</p>{p.demo&&<span className="tag">{en?'Fictional concept':'نموذج تجريبي'}</span>}{link?<BehanceProject url={link} title={p.name[n]} english={en}/>:p.image?<img className="project-full-image" src={p.image} alt={p.name[n]}/>:null}</main>}
