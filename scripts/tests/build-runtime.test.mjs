import test from 'node:test';
import assert from 'node:assert/strict';

const enabled=Boolean(process.env.DECK_PRESENTATIONS_SKILL_DIR);
const run=(name,fn)=>test(name,{skip:!enabled},fn);
const base={mode:'single-slide',style:{profile:'generic',purpose:'presentation'}};
run('presentation mode builds short captions and timeline phases at larger sizes',async()=>{
 const {buildPresentation}=await import('../build-deck.mjs');
 const chart={...base,slides:[{layout:'A01',title:'投入比较',chart:{categories:['甲','乙'],series:[{name:'投入',values:[.2,.3]}],unit:'万元'},caption:'注'}]};
 const built=await buildPresentation(chart);
 const text=built.deck.slides.items[0].shapes.items.find(shape=>shape.name==='analysis-caption');
 assert.ok(text.position.height>=26);
 assert.equal(built.deck.slides.items.length,1);
 assert.equal(built.deck.slides.items[0].images.items.length,0);
 const timeline={...base,slides:[{layout:'T08',title:'试点安排',periods:['一','二','三','四'],rows:[['分析','定','查','验','核'],['治理','定','备','批','核']],phases:[{name:'试点',span:4}],takeaway:'按实际证据复核'}]};
 assert.equal((await buildPresentation(timeline)).deck.slides.items.length,1);
});
run('presentation purpose reaches T03 chart axes and custom font family',async()=>{
 const {buildPresentation}=await import('../build-deck.mjs');
 const built=await buildPresentation({...base,style:{...base.style,fonts:{title:'Arial',body:'Arial'}},slides:[{layout:'T03',title:'投入比较',chart:{heading:'同口径投入',categories:['甲','乙'],values:[2,3],unit:'元'},facts:[{label:'条件',text:'效果未知'}]}]});
 const chart=built.deck.slides.items[0].charts.items[0];
 assert.equal(chart.xAxis.textStyle.typeface,'Arial');
 assert.ok(chart.xAxis.textStyle.fontSize>18);
});
