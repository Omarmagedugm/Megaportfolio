export function videoEmbed(value:string):{src:string;facebook:boolean}|null{
 try{const u=new URL(value);if(u.protocol!=='https:')return null;const host=u.hostname.toLowerCase();
 if(['facebook.com','www.facebook.com','m.facebook.com','fb.watch'].includes(host))return {src:'https://www.facebook.com/plugins/video.php?href='+encodeURIComponent(value)+'&show_text=false&width=960',facebook:true};
 if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(host)){const id=host==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.split('/').pop();if(id&&/^[\w-]{11}$/.test(id))return {src:'https://www.youtube-nocookie.com/embed/'+id,facebook:false}}
 }catch{}return null;
}
