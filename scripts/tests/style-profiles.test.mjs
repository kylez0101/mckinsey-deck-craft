import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveStyle,scaleFont} from '../style-profiles.mjs';

test('personal reading preserves the existing typography and artwork',()=>{
 const style=resolveStyle();
 assert.equal(style.profile,'personal');
 assert.equal(style.fonts.title,'Songti SC');
 assert.equal(style.fonts.body,'Arial Unicode MS');
 assert.equal(style.cover.background,'assets/brand/cover-background.jpg');
 assert.equal(scaleFont(19.5,style),19.5);
});
test('generic style removes the personal cover and supports explicit branding',()=>{
 const style=resolveStyle({profile:'generic',fonts:{title:'Noto Serif CJK SC',body:'Noto Sans CJK SC'},cover:{fill:'#FAFAFA',textColor:'#152030'},footer:{text:'Research review',showPageNumber:false}});
 assert.equal(style.cover.background,null);
 assert.equal(style.cover.textColor,'#152030');
 assert.equal(style.fonts.body,'Noto Sans CJK SC');
 assert.equal(style.footer.showPageNumber,false);
});
test('presentation typography is larger and keeps a distinct source size',()=>{
 const style=resolveStyle({purpose:'presentation'});
 assert.equal(style.sizes.title,38);
 assert.equal(scaleFont(19.5,style),24);
 assert.equal(scaleFont(13,style),15);
 assert.equal(scaleFont(48,style,{cover:true}),48);
});
test('invalid profile settings fail instead of silently dropping branding',()=>{
 for(const config of [{profile:'unknown'},{purpose:'print'},{fonts:{body:''}},{cover:{textColor:'blue'}},{footer:{showPageNumber:'no'}},{mystery:true}])assert.throws(()=>resolveStyle(config));
 assert.throws(()=>resolveStyle({cover:{background:'../other.jpg'}}),/absolute|built-in/u);
 assert.equal(resolveStyle({cover:{background:'/tmp/brand.JPEG'}}).cover.background,'/tmp/brand.JPEG');
 assert.throws(()=>resolveStyle({cover:{background:'/tmp/brand.svg'}}),/JPEG and PNG/u);
});
