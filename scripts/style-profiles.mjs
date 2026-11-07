import path from 'node:path';

const ARTWORK='assets/brand/cover-background.jpg';
function object(value,keys,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw new Error(`${label} must be a plain object`);
 const unknown=Object.keys(value).filter(key=>!keys.includes(key));
 if(unknown.length)throw new Error(`${label}: unknown fields ${unknown.join(', ')}`);
}
const hex=(value,label)=>{if(typeof value!=='string'||!/^#[\da-f]{6}$/iu.test(value))throw new Error(`${label} must be #RRGGBB`);return value.toUpperCase();};
export function resolveStyle(config={}){
 object(config,['profile','purpose','fonts','cover','footer'],'style');
 const profile=config.profile??'personal',purpose=config.purpose??'reading';
 if(!['personal','generic'].includes(profile))throw new Error('style.profile must be personal or generic');
 if(!['reading','presentation'].includes(purpose))throw new Error('style.purpose must be reading or presentation');
 const fonts=profile==='personal'?{title:'Songti SC',body:'Arial Unicode MS'}:{title:'Arial',body:'Arial Unicode MS'};
 if(config.fonts!==undefined){
  object(config.fonts,['title','body'],'style.fonts');
  for(const [role,family] of Object.entries(config.fonts)){
   if(typeof family!=='string'||!family.trim()||family.length>120||/[\n\r\0]/u.test(family))throw new Error(`style.fonts.${role} must be a bounded font family`);
   fonts[role]=family.trim();
  }
 }
 const cover=profile==='personal'?{background:ARTWORK,fill:'#03091E',textColor:'#FFFFFF'}:{background:null,fill:'#FFFFFF',textColor:'#051C2C'};
 if(config.cover!==undefined){
  object(config.cover,['background','fill','textColor'],'style.cover');
  if(Object.hasOwn(config.cover,'background')){
   const background=config.cover.background;
   if(background!==null&&(typeof background!=='string'||(!path.isAbsolute(background)&&background!==ARTWORK)))throw new Error('style.cover.background needs an absolute image path, the built-in artwork, or null');
   if(background!==null&&!/^\.(?:jpe?g|png)$/iu.test(path.extname(background)))throw new Error('style.cover.background supports JPEG and PNG files');
   cover.background=background;
  }
  for(const key of ['fill','textColor'])if(config.cover[key]!==undefined)cover[key]=hex(config.cover[key],`style.cover.${key}`);
 }
 const footer={text:'',showPageNumber:true};
 if(config.footer!==undefined){
  object(config.footer,['text','showPageNumber'],'style.footer');
  if(config.footer.text!==undefined){if(typeof config.footer.text!=='string'||config.footer.text.length>120)throw new Error('style.footer.text must be a short string');footer.text=config.footer.text;}
  if(config.footer.showPageNumber!==undefined){if(typeof config.footer.showPageNumber!=='boolean')throw new Error('style.footer.showPageNumber must be boolean');footer.showPageNumber=config.footer.showPageNumber;}
 }
 const sizes=purpose==='reading'?{title:31,body:19.5,label:18,source:13}:{title:38,body:24,label:22,source:15};
 return {profile,purpose,fonts,cover,footer,sizes,textScale:sizes.body/19.5};
}

export function scaleFont(size,style,{cover=false}={}){
 if(cover||style.purpose==='reading')return size;
 if(size===31)return style.sizes.title;
 if(size<=14)return style.sizes.source;
 return Math.round(size*style.textScale*100)/100;
}
