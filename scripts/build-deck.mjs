import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {execFileSync} from 'node:child_process';
import {createTheme} from './theme.mjs';
import {allowedDataPageFields,renderDataPage} from './data-pages.mjs';

// Use the currently installed presentation runtime; no dependency or cache path is bundled.
const skillRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtimeSkill=process.env.DECK_PRESENTATIONS_SKILL_DIR;
if(!runtimeSkill)throw new Error('Set DECK_PRESENTATIONS_SKILL_DIR to the current Presentations skill directory returned by the runtime.');
const {importRuntimeModule}=await import(pathToFileURL(path.join(runtimeSkill,'container_tools/runtime_helpers.mjs')));
const {finalizePresentation,applyPresentationChartFont}=await import(pathToFileURL(path.join(runtimeSkill,'container_tools/artifact_tool_utils.mjs')));
const {Presentation,PresentationFile,FileBlob}=await importRuntimeModule('@oai/artifact-tool');
const F={title:'Songti SC',body:'Arial Unicode MS'};
const WIDTH=1164,LEFT=58;
const fields={T01:['kicker','status','date'],T02:['sections','metrics','decision'],T03:['chart','facts','takeaway','caveat'],T04:['headers','rows','highlightColumn','takeaway'],T05:['headers','rows','takeaway'],T06:['steps','emphasisStep','exception','roles','roleHeaders','takeaway','releaseConditions','gateLabel'],T07:['stages','takeaway'],T08:['periods','rows','phases','gates','takeaway'],T09:['metrics','rows','headers','takeaway'],T10:['unit','rows','headers','total','decisions','decisionHeading','takeaway']};
const units=s=>Array.from(String(s)).reduce((n,c)=>n+(/[\u2E80-\u9FFF\uF900-\uFAFF\uFF01-\uFF60]/u.test(c)?1:/\s/u.test(c)?.3:.56),0);
function check(value,condition,message){if(!condition)throw new Error(message);return value;}
function copy(value,label,maxUnits,maxLines=1){
 const text=Array.isArray(value)?value.join('\n'):String(value??'');
 check(text,!/\u0000/.test(text),`${label}: null character`);
 let lines=0;
 for(const p of text.split('\n'))lines+=Math.max(1,Math.ceil(units(p)/maxUnits));
 check(text,lines<=maxLines,`${label}: about ${lines} lines exceed ${maxLines}; rewrite, split, or choose another template. No text was dropped.`);
 return text;
}
function createHelpers(C){
function shape(s,name,x,y,w,h,fill='none',stroke='none',sw=0,geometry='rect'){
 return s.shapes.add({name,geometry,position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:sw,style:'solid'}});
}
function tx(s,name,value,x,y,w,h,size=20,o={}){
 const t=shape(s,name,x,y,w,h);t.text=String(value??'');
 t.text.style={typeface:o.serif?F.title:F.body,fontSize:size,bold:!!o.bold,color:o.color||C.ink,autoFit:'none',wrap:o.nowrap?'none':'square',insets:0,lineSpacing:o.leading||1.18,alignment:o.align||'left',verticalAlignment:o.valign||'top'};return t;
}
function rule(s,name,x,y,w,color=C.rule,sw=.7){return shape(s,name,x,y,w,0,'none',color,sw,'line');}
async function image(s,relative,name,x,y,w,h){
 const bytes=await fs.readFile(path.join(skillRoot,relative));
 s.images.add({blob:new Uint8Array(bytes),contentType:relative.endsWith('.jpg')?'image/jpeg':'image/png',alt:name,fit:'contain',position:{left:x,top:y,width:w,height:h}});
}
async function icon(s,key,x,y,size=42){
 if(key){check(key,['target','gear','people','bulb','books','clock','checklist','quality'].includes(key),`Unknown icon ${key}`);await image(s,`assets/icons/${key}.png`,key,x,y,size,size);}
}
function nativeTable(s,name,data,x,y,width,heights,widths,{header=true,highlightCol=-1,highlightRow=-1,keyFill=false,fontSize=19.5,numericColumns=[]}={}){
 check(data,data.length===heights.length&&data.every(r=>r.length===widths.length),`${name}: inconsistent table dimensions`);
 const t=s.tables.add({rows:data.length,columns:widths.length,left:x,top:y,width,height:heights.reduce((a,b)=>a+b,0),columnWidths:widths,values:data});
 t.styleOptions={headerRow:false,bandedRows:false};t.borders.assign({fill:'none',width:0,style:'solid'});
 for(let r=0;r<data.length;r++){
  t.rows[r].height=heights[r];
  for(let c=0;c<widths.length;c++){
   const head=header&&r===0,cell=t.getCell(r,c);
   cell.fill=c===highlightCol?(head?C.blue:C.pale):r===highlightRow?C.pale:head?C.white:c===0&&keyFill?C.light:C.white;
   cell.text.style={typeface:F.body,fontSize:head?19.5:fontSize,bold:head||c===0||r===highlightRow,color:head&&c===highlightCol?C.onPrimary:C.ink,alignment:!head&&numericColumns.includes(c)?'right':'left',verticalAlignment:'middle',lineSpacing:1.16,insets:{left:12,right:12,top:7,bottom:7}};
  }
 }
 let yy=y;rule(s,`${name}-top`,x,y,width,C.gray,.8);
 for(let r=0;r<heights.length;r++){yy+=heights[r];rule(s,`${name}-line-${r}`,x,yy,width,r===0&&header?C.gray:C.rule,r===0&&header?.8:.55);}
 return t;
}
function note(s,p){const source=String(p.source??'').replace(/^来源[：:]\s*/u,'');s.speakerNotes.text=[p.notes,source?`来源：${source}`:''].filter(Boolean).join('\n\n');}
function base(deck,p,index){
 const s=deck.slides.add();s.background.fill=C.white;
 tx(s,'slide-title',copy(p.title,'title',36),LEFT,33,WIDTH,46,31,{serif:true,bold:true,nowrap:true});
 rule(s,'header-rule',LEFT,98,WIDTH,C.gray,.75);
 if(p.subtitle)tx(s,'slide-subtitle',copy(p.subtitle,'subtitle',56),LEFT,124,WIDTH,34,20.5,{color:C.gray});
 rule(s,'footer-rule',LEFT,676,WIDTH,C.gray,.65);
 tx(s,'source',copy(p.source,'source',83),LEFT,688,1090,18,13,{color:C.gray,nowrap:true});
 tx(s,'page-number',String(index),1182,686,40,22,14,{color:C.gray,align:'right'});note(s,p);return s;
}
function takeaway(s,text,y=614){if(text)tx(s,'takeaway',copy(text,'takeaway',55,2),LEFT,units(text)>55?Math.min(y,607):y,WIDTH,52,20,{bold:true});}
function cellText(s,w,label,lines=2){return copy(s,label,(w-26)/19.5,lines);}
function hasDoubleLine(data,widths){return data.some(row=>row.some((v,c)=>String(v).includes('\n')||units(v)>(widths[c]-26)/19.5));}

 return {shape,tx,rule,image,icon,nativeTable,note,base,takeaway,cellText,hasDoubleLine,check,copy,applyPresentationChartFont};
}

export async function buildPresentation(input){
 check(input,Array.isArray(input.slides)&&input.slides.length>0,'slides must be a non-empty array');
 check(input,input.slides[0].layout==='T01','A full deck starts with the fixed cover T01.');
 const theme=createTheme(input.theme??{}),C=theme.C;
 const helpers=createHelpers(C);const {shape,tx,rule,image,icon,nativeTable,note,base,takeaway,cellText,hasDoubleLine}=helpers;
 const deck=Presentation.create({slideSize:{width:1280,height:720}}),tableOwners=[],chartOwners=[],arithmetic=[];
 deck.theme.colorScheme={name:`Consulting ${C.primary}`,themeColors:{accent1:C.blue,accent2:C.accent??C.primaryDark,accent3:theme.chart.comparison,accent4:C.primaryDark,accent5:theme.chart.context,accent6:C.gray,bg1:C.white,bg2:C.light,tx1:C.ink,tx2:C.gray,dk1:C.ink,dk2:C.primaryDark,lt1:C.white,lt2:C.light,hlink:C.primaryText,folHlink:C.primaryText}};
 for(let i=0;i<input.slides.length;i++){
  const p=input.slides[i];check(p,/^T(0[1-9]|10)$/.test(p.layout)||Object.hasOwn(allowedDataPageFields,p.layout),`Unsupported layout ${p.layout}`);
  const allowed=new Set(['layout','title','subtitle','source','notes',...(fields[p.layout]??allowedDataPageFields[p.layout])]);
  const unsupported=Object.keys(p).filter(k=>!allowed.has(k));
  check(p,unsupported.length===0,`${p.layout}: unknown fields ${unsupported.join(', ')}. Use the paired extension builder; extra evidence must not be silently ignored.`);
  let s;
  if(p.layout==='T01'){
   s=deck.slides.add();s.background.fill='#03091E';await image(s,'assets/brand/cover-background.jpg','用户指定的深蓝封面背景',0,0,1280,720);
   if(p.kicker)tx(s,'cover-kicker',copy(p.kicker,'kicker',28),64,171,780,32,20,{color:C.white});
   tx(s,'cover-title',copy(p.title,'cover title',22),64,242,1128,80,48,{serif:true,bold:true,nowrap:true,color:C.white});
   if(p.subtitle)tx(s,'cover-subtitle',copy(p.subtitle,'cover subtitle',47,2),66,350,1050,66,23,{color:C.white});
   if(p.status)tx(s,'cover-status',copy(p.status,'cover status',48),66,451,1000,30,19,{color:C.white});
   if(p.date)tx(s,'cover-date',copy(p.date,'cover date',48),66,608,1000,26,18,{color:C.white});
   note(s,p);continue;
  }
  s=base(deck,p,i);
  if(Object.hasOwn(allowedDataPageFields,p.layout)){const made=renderDataPage({slide:s,p,theme,helpers});if(made.hasChart)chartOwners.push(i+1);if(made.hasTable)tableOwners.push(i+1);if(made.arithmetic)arithmetic.push(...made.arithmetic.map(a=>({...a,slide:i+1})));continue;}
  if(p.layout==='T02'){
   check(p,p.sections?.length===3,'T02 needs three concise sections.');
   for(let j=0;j<3;j++){
    const x=LEFT+j*412,sec=p.sections[j];await icon(s,sec.icon,x,184);
    tx(s,`summary-heading-${j}`,copy(sec.heading,'section heading',13),x+(sec.icon?58:0),188,330-(sec.icon?46:0),32,22,{bold:true});
    tx(s,`summary-text-${j}`,copy(sec.text,'section text',17,5),x,247,340,145,20.5);
    if(j<2)shape(s,`summary-divider-${j}`,x+376,184,0,208,'none',C.rule,.7,'line');
   }
   rule(s,'summary-middle-rule',LEFT,430,WIDTH);
   if(p.metrics){check(p,p.metrics.length<=3,'T02 max three metrics');for(let j=0;j<p.metrics.length;j++){const x=LEFT+j*412,m=p.metrics[j];tx(s,`summary-value-${j}`,copy(m.value,'metric value',10),x,456,340,52,35,{color:j===0?C.primaryText:C.ink});tx(s,`summary-label-${j}`,copy(m.label,'metric label',18),x,519,340,28,18.5,{color:C.gray});}}
   if(p.decision){shape(s,'decision-band',LEFT,579,WIDTH,77,C.pale);tx(s,'decision-text',copy(p.decision,'decision',54,2),78,596,1124,56,20,{bold:true});}
  }
  if(p.layout==='T03'){
   const d=p.chart;check(d,d&&d.categories.length===d.values.length&&d.values.length>=2&&d.values.length<=5,'T03 needs 2–5 paired categories and values');
   check(d,d.values.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0),'T03 requires complete non-negative literal numeric data');
   d.categories.forEach(v=>copy(v,'chart category',13));
   const maximum=d.max??Math.ceil(Math.max(...d.values)*1.25/5)*5;check(maximum,maximum>=Math.max(...d.values)&&maximum>0,'chart max must cover values');
   tx(s,'chart-heading',copy(d.heading,'chart heading',31),LEFT,185,670,32,21,{bold:true});
   const ch=s.charts.add('bar',{position:{left:LEFT,top:238,width:675,height:300},categories:d.categories,series:[{name:d.unit||'数值',values:d.values,fill:C.blue,points:d.values.map((v,k)=>({idx:k,fill:k===(d.emphasisIndex??-1)?C.blue:(theme.chart.context??C.gray)}))}],barOptions:{direction:'bar',grouping:'clustered',gapWidth:100},hasLegend:false,chartFill:C.white,chartLine:{fill:'none',width:0},plotAreaFill:C.white,plotAreaLine:{fill:'none',width:0},xAxis:{visible:true,textStyle:{fontSize:18,fill:C.ink},line:{fill:'none',width:0},majorGridlines:null},yAxis:{min:0,max:maximum,majorUnit:d.majorUnit??maximum/4,textStyle:{fontSize:16,fill:C.gray},line:{fill:'none',width:0},majorGridlines:{fill:C.rule,width:.6},numberFormatCode:d.format||'0'},dataLabels:{showValue:true,position:'outEnd',numberFormatCode:(d.format||'0')+(d.unit?`"${d.unit.replaceAll('"','')}"`:''),textStyle:{fontSize:20,fill:C.ink}}});
   applyPresentationChartFont(ch,{fontFamily:F.body});chartOwners.push(i+1);
   check(p,p.facts?.length>=1&&p.facts.length<=3,'T03 needs 1–3 facts');
   const rows=p.facts.map(f=>[copy(f.label,'fact label',4,2),copy(f.text,'fact text',14,3)]);
   nativeTable(s,'facts',rows,835,185,387,p.facts.map(()=>116),[95,292],{header:false});tableOwners.push(i+1);
   for(let j=0;j<p.facts.length;j++)await icon(s,p.facts[j].icon,768,218+j*116);
   takeaway(s,p.takeaway,568);
   if(p.caveat){rule(s,'chart-caveat-rule',LEFT,613,WIDTH);tx(s,'chart-caveat',copy(p.caveat,'chart caveat',58,2),LEFT,631,WIDTH,38,19,{color:C.gray});}
  }
  if(p.layout==='T04'){
   check(p,p.headers?.length>=3&&p.headers.length<=5&&p.rows?.length>=2&&p.rows.length<=5,'T04 requires 2–4 options plus a dimension column and 2–5 rows');
   const widths=[174,...p.headers.slice(1).map(()=>(WIDTH-174)/(p.headers.length-1))];const data=[p.headers,...p.rows].map((row,r)=>row.map((v,c)=>cellText(v,widths[c],`comparison ${r}/${c}`,r===0?1:2)));
   nativeTable(s,'comparison',data,LEFT,190,WIDTH,[48,...p.rows.map(()=>72)],widths,{highlightCol:p.highlightColumn??-1});tableOwners.push(i+1);takeaway(s,p.takeaway,620);
  }
  if(p.layout==='T05'){
   check(p,p.rows?.length>=2&&p.rows.length<=5,'T05 needs 2–5 dimensions');
   const widths=[224,470,470],headers=p.headers||['维度','现状','目标与条件'];
   const data=[headers,...p.rows].map((row,r)=>row.map((v,c)=>cellText(v,widths[c],`from-to ${r}/${c}`,r===0?1:2)));
   nativeTable(s,'from-to',data,LEFT,195,WIDTH,[48,...p.rows.map(()=>73)],widths,{highlightCol:2,keyFill:true});tableOwners.push(i+1);takeaway(s,p.takeaway,620);
  }
  if(p.layout==='T06'&&p.releaseConditions){
   check(p,p.releaseConditions.length>=2&&p.releaseConditions.length<=4&&p.steps?.length===3&&!p.roles?.length&&!p.exception,'T06 condition mode needs 2–4 AND conditions and exactly 3 execution steps. Put detailed exceptions on a separate page.');
   const widths=[205,959],data=p.releaseConditions.map((r,j)=>r.map((v,c)=>cellText(v,widths[c],`release ${j}/${c}`,2)));
   const rowHeight=hasDoubleLine(data,widths)?66:60;
   nativeTable(s,'release-conditions',data,LEFT,185,WIDTH,data.map(()=>rowHeight),widths,{header:false,keyFill:true,fontSize:20});tableOwners.push(i+1);
   const gateY=185+data.length*rowHeight+27;
   tx(s,'release-gate-label',copy(p.gateLabel||`${data.length}项条件均满足后，进入下方执行流程`,'gate label',55),LEFT,gateY,WIDTH,30,20,{bold:true,color:C.primaryText,align:'center'});
   const nodes=[];
   for(let j=0;j<3;j++){
    const node=shape(s,`release-node-${j}`,LEFT+j*412,gateY+53,340,76,j===0?C.pale:C.white,j===0?C.blue:C.rule,.8);
    node.text=copy(p.steps[j],'release step',15,2);node.text.style={typeface:F.body,fontSize:20,color:C.ink,bold:j===0,alignment:'center',verticalAlignment:'middle',insets:8,autoFit:'none',wrap:'square',lineSpacing:1.15};nodes.push(node);
   }
   for(let j=0;j<2;j++)s.shapes.connect(nodes[j],nodes[j+1],{kind:'straight',fromSide:'right',toSide:'left',line:{fill:C.gray,width:1.1},tail:{type:'triangle',width:'sm',length:'sm'}});
   takeaway(s,p.takeaway,615);
  }
  if(p.layout==='T06'&&!p.releaseConditions){
   check(p,p.steps?.length>=3&&p.steps.length<=5,'T06 needs 3–5 steps');
   const gap=30,n=p.steps.length,w=(WIDTH-gap*(n-1))/n,nodes=[];
   for(let j=0;j<n;j++){
    const x=LEFT+j*(w+gap);tx(s,`flow-number-${j}`,String(j+1).padStart(2,'0'),x,185,w,28,17,{color:C.gray});
    const node=shape(s,`flow-node-${j}`,x,230,w,74,j===(p.emphasisStep??-1)?C.pale:C.white,j===(p.emphasisStep??-1)?C.blue:C.rule,.8);
    node.text=copy(p.steps[j],'flow step',(w-20)/20,2);node.text.style={typeface:F.body,fontSize:20,color:C.ink,bold:j===p.emphasisStep,alignment:'center',verticalAlignment:'middle',insets:8,autoFit:'none',wrap:'square',lineSpacing:1.15};nodes.push(node);
   }
   for(let j=0;j<n-1;j++)s.shapes.connect(nodes[j],nodes[j+1],{kind:'straight',fromSide:'right',toSide:'left',line:{fill:C.gray,width:1.1},tail:{type:'triangle',width:'sm',length:'sm'}});
   if(p.exception){
    const e=p.exception,k=e.fromStep??Math.floor(n/2);check(k,k>=0&&k<n,'exception.fromStep is a zero-based step index');
    const mid=LEFT+k*(w+gap)+w/2,ew=560,ex=Math.max(LEFT,Math.min(mid-ew/2,1222-ew));
    const dest=shape(s,'exception-destination',ex,330,ew,66,C.light,C.blue,.9);dest.text=copy(e.text,'exception text',27,2);dest.text.style={typeface:F.body,fontSize:19,color:C.primaryText,alignment:'center',verticalAlignment:'middle',insets:6,autoFit:'none',wrap:'square',lineSpacing:1.15};
    s.shapes.connect(nodes[k],dest,{kind:'straight',fromSide:'bottom',toSide:'top',line:{fill:C.blue,width:1.1,style:'dashed'},tail:{type:'triangle',width:'sm',length:'sm'}});
   }
   if(p.roles?.length){check(p,p.roles.length<=3,'T06 max three role rows');const widths=[205,410,549];const data=[p.roleHeaders||['责任人','关键动作','权限与边界'],...p.roles].map((row,r)=>row.map((v,c)=>cellText(v,widths[c],`role ${r}/${c}`,r===0?1:2)));const rowHeight=hasDoubleLine(data,widths)?61:59;nativeTable(s,'flow-roles',data,LEFT,414,WIDTH,[38,...p.roles.map(()=>rowHeight)],widths,{keyFill:true,fontSize:19});tableOwners.push(i+1);}
   if(p.takeaway)tx(s,'flow-takeaway',copy(p.takeaway,'flow takeaway',59),LEFT,641,WIDTH,25,18.5,{color:C.gray});
  }
  if(p.layout==='T07'){
   check(p,p.stages?.length>=2&&p.stages.length<=4,'T07 needs 2–4 stages');
   const n=p.stages.length,w=(WIDTH-180)/n;
   for(let j=0;j<n;j++){const x=LEFT+180+j*w;tx(s,`stage-number-${j}`,String(j+1).padStart(2,'0'),x+12,183,w-24,30,18,{color:C.primaryText});tx(s,`stage-heading-${j}`,copy(p.stages[j].name,'stage name',(w-26)/22),x+12,225,w-24,35,22,{bold:true});}
   const rows=[['阶段',...p.stages.map(v=>v.name)],['交付物',...p.stages.map(v=>v.deliverable)],['完成条件',...p.stages.map(v=>v.criteria)],['责任人',...p.stages.map(v=>v.owner)]];
   const widths=[180,...p.stages.map(()=>w)];const data=rows.slice(1).map((row,r)=>row.map((v,c)=>cellText(v,widths[c],`stage ${r}/${c}`,r===2?2:3)));
   nativeTable(s,'stages',data,LEFT,289,WIDTH,[88,88,67],widths,{header:false,keyFill:true});tableOwners.push(i+1);takeaway(s,p.takeaway,613);
  }
  if(p.layout==='T08'){
   check(p,p.periods?.length>=4&&p.periods.length<=6&&p.rows?.length>=2&&p.rows.length<=3,'T08 needs 4–6 periods and 2–3 workstreams');
   const n=p.periods.length,w=(WIDTH-196)/n,widths=[196,...p.periods.map(()=>w)];
   if(p.phases){let at=0;for(let j=0;j<p.phases.length;j++){const g=p.phases[j];check(g,Number.isInteger(g.span)&&g.span>0,'phase span is a positive period count');shape(s,`phase-band-${j}`,254+at*w,178,g.span*w,31,j%2?C.pale:C.light);tx(s,`phase-name-${j}`,copy(g.name,'phase name',g.span*w/18-2),262+at*w,184,g.span*w-16,22,17,{align:'center',color:j%2?C.blue:C.gray});at+=g.span;}check(at,at===n,'phase spans must equal period count');}
   const rows=[['工作流',...p.periods],...p.rows];const data=rows.map((row,r)=>row.map((v,c)=>cellText(v,widths[c],`timeline ${r}/${c}`,r===0?1:2)));
   nativeTable(s,'timeline',data,LEFT,232,WIDTH,[44,...p.rows.map(()=>78)],widths,{keyFill:true,fontSize:19});tableOwners.push(i+1);
   if(p.gates){check(p,p.gates.length<=3,'T08 max three gates');await icon(s,'checklist',LEFT,536,38);for(let j=0;j<p.gates.length;j++){const x=140+j*362,g=p.gates[j];tx(s,`gate-heading-${j}`,copy(g.heading,'gate heading',15),x,537,330,30,21,{bold:true,color:C.primaryText});tx(s,`gate-text-${j}`,copy(g.text,'gate text',17,2),x,579,330,54,19);}}
   if(p.takeaway)tx(s,'timeline-takeaway',copy(p.takeaway,'timeline takeaway',58),LEFT,637,WIDTH,25,19,{bold:true});
  }
  if(p.layout==='T09'){
   check(p,p.metrics?.length>=2&&p.metrics.length<=3&&p.rows?.length>=2&&p.rows.length<=4,'T09 needs 2–3 metrics and 2–4 criteria rows');
   for(let j=0;j<p.metrics.length;j++){const x=LEFT+j*412,m=p.metrics[j];tx(s,`metric-label-${j}`,copy(m.label,'metric label',18),x,184,365,28,19,{color:C.gray});tx(s,`metric-value-${j}`,copy(m.value,'metric value',13),x,226,365,57,38,{color:j===1?C.primaryText:C.ink});}
   const widths=[205,395,564],data=[p.headers||['评价维度','指标与口径','标准与限制'],...p.rows].map((row,r)=>row.map((v,c)=>cellText(v,widths[c],`criterion ${r}/${c}`,r===0?1:2)));
   const doubleLine=hasDoubleLine(data,widths);
   nativeTable(s,'criteria',data,LEFT,doubleLine?294:321,WIDTH,[43,...p.rows.map(()=>doubleLine?66:60)],widths,{keyFill:true});tableOwners.push(i+1);takeaway(s,p.takeaway,doubleLine?632:625);
  }
  if(p.layout==='T10'){
   check(p,p.rows?.length>=2&&p.rows.length<=4&&p.decisions?.length>=1&&p.decisions.length<=3,'T10 needs 2–4 budget rows and 1–3 decisions');
   const widths=[184,190,370],rows=[p.headers||[`金额（${p.unit||'元'}）`,'用途','条件'],...p.rows];
   if(p.total){check(p,p.rows.every(r=>typeof r[0]==='number')&&Number.isFinite(p.total.value),'A numeric total requires numeric components; do not total unknown costs.');const sum=p.rows.reduce((v,r)=>v+r[0],0);check(sum,Math.abs(sum-p.total.value)<.005,'Budget components do not match total');rows.push([p.total.value,p.total.label,p.total.condition]);arithmetic.push({slide:i+1,table:1,label_column:1,total_row:rows.length-1,value_columns:[0],component_rows:p.rows.map((v,j)=>j+1)});}
   const data=rows.map((row,r)=>row.map((v,c)=>typeof v==='number'?v:cellText(v,widths[c],`budget ${r}/${c}`,r===0?1:2)));
   nativeTable(s,'budget',data,LEFT,195,744,[46,...rows.slice(1).map(()=>69)],widths,{highlightRow:p.total?rows.length-1:-1});tableOwners.push(i+1);
   shape(s,'budget-side-rule',846,195,0,385,'none',C.rule,.7,'line');tx(s,'decision-heading',copy(p.decisionHeading||'需要确认','decision heading',16),887,201,335,35,23,{bold:true});
   for(let j=0;j<p.decisions.length;j++){const d=p.decisions[j],y=268+j*108;tx(s,`decision-number-${j}`,String(j+1).padStart(2,'0'),887,y,45,30,20,{color:C.primaryText});tx(s,`decision-item-${j}`,copy(d.heading,'decision item',13),940,y,282,31,21,{bold:true});tx(s,`decision-detail-${j}`,copy(d.text,'decision detail',14,2),940,y+43,282,58,19);}
   takeaway(s,p.takeaway,620);
  }
 }
 return {deck,tableOwners,chartOwners,arithmetic,themeAudit:theme.audit};
}

export async function exportDeck(input,{workspaceDir,workDir,finalPath}){
 const within=(child,parent)=>{const rel=path.relative(parent,child);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
 const outputDir=path.dirname(finalPath);
 check(finalPath,within(workDir,workspaceDir)&&within(finalPath,workspaceDir),'Work and final output must be inside the task workspace.');
 check(finalPath,!within(workDir,outputDir)&&!within(outputDir,workDir),'Use separate sibling trees: <workspace>/working/build-01 and <workspace>/output/final.pptx. Validation receipts cannot be under the final output directory.');
 for(const d of [workDir,path.dirname(finalPath),path.join(workDir,'final-renders')])await fs.mkdir(d,{recursive:true});
 const {deck,tableOwners,chartOwners,arithmetic}=await buildPresentation(input);
 const raw=path.join(workDir,'raw.pptx'),candidate=path.join(workDir,'candidate.pptx');await (await PresentationFile.exportPptx(deck)).save(raw);
 const py=process.env.DECK_RUNTIME_PYTHON;check(py,!!py,'Set DECK_RUNTIME_PYTHON from load_workspace_dependencies.');
 execFileSync(py,[path.join(skillRoot,'scripts/normalize-native-charts.py'),raw,candidate],{stdio:'pipe'});
 const receipt=await finalizePresentation({workspaceDir,candidatePath:candidate,finalPath,explicitTotalSlideCount:input.slides.length,requiredNativeTableOwnerSlides:tableOwners,requiredNativeChartOwnerSlides:chartOwners,tableArithmeticContracts:arithmetic,materializeLiteralChartWorkbooks:true,verifyArtifactToolImport:true,pythonExecutable:py,integrityValidatorPath:path.join(runtimeSkill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(runtimeSkill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--cover-role','cover','--validate-heading-fit',...tableOwners.flatMap(v=>['--require-native-table-slide',String(v)])],fontPolicy:{basis:'design',families:[F.title,F.body]},receiptPath:path.join(workDir,'finalization.json')});
 const exact=await PresentationFile.importPptx(await FileBlob.load(finalPath));
 for(let i=0;i<exact.slides.items.length;i++){const slide=exact.slides.items[i];await fs.writeFile(path.join(workDir,'final-renders',`slide-${i+1}.png`),Buffer.from(await(await exact.export({slide,format:'png',scale:1.5})).arrayBuffer()));}
 const inventory=exact.slides.items.map((s,i)=>({page:i+1,layout:input.slides[i].layout,title:input.slides[i].title,tables:s.tables.items.length,charts:s.charts.items.length,notes:String(s.speakerNotes.text),shapes:s.shapes.items.map(v=>({id:v.id,name:v.name,text:String(v.text??'')}))}));
 await fs.writeFile(path.join(workDir,'inventory.json'),JSON.stringify(inventory,null,2));
 return {status:'pass',file:finalPath,sha256:receipt.finalSha256,pages:input.slides.length,tables:tableOwners,charts:chartOwners,renders:path.join(workDir,'final-renders'),theme:createTheme(input.theme??{})};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {values}=parseArgs({options:{input:{type:'string'},out:{type:'string'},work:{type:'string'},workspace:{type:'string'}}});
 for(const k of ['input','out','work','workspace'])check(k,!!values[k],`Missing --${k}`);
 const input=JSON.parse(await fs.readFile(values.input,'utf8'));
 console.log(JSON.stringify(await exportDeck(input,{workspaceDir:path.resolve(values.workspace),workDir:path.resolve(values.work),finalPath:path.resolve(values.out)})));
}
