import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const skill=process.env.DECK_PRESENTATIONS_SKILL_DIR;
const python=process.env.DECK_PYTHON;
if(!skill||!python)throw new Error('Set DECK_PRESENTATIONS_SKILL_DIR and DECK_PYTHON to the installed presentation runtime.');
const {importRuntimeModule}=await import(pathToFileURL(path.join(skill,'container_tools/runtime_helpers.mjs')));
const {finalizePresentation,applyPresentationChartFont}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')));
const {Presentation,PresentationFile,FileBlob}=await importRuntimeModule('@oai/artifact-tool');
const data=JSON.parse(await fs.readFile(path.join(root,'examples/english-showcase/source.json'),'utf8'));
const buildDir=path.join(root,'working/english-showcase');
const finalPath=path.join(root,process.env.SHOWCASE_OUTPUT||'working/english-showcase-output/report.pptx');
await fs.mkdir(buildDir,{recursive:true});
await fs.mkdir(path.dirname(finalPath),{recursive:true});
const C={bg:'#071522',ink:'#F3F8FF',muted:'#9DB2C7',rule:'#284052',blue:'#5E86FF',cyan:'#46E0DF',amber:'#FFD18A'};
const deck=Presentation.create({slideSize:{width:1280,height:720}});
const font='Avenir Next',display='DIN Condensed';
const line=(fill,width=1)=>({fill,width,style:'solid'});
function shape(s,name,x,y,w,h,fill='none',stroke='none',sw=0,geometry='rect'){
 return s.shapes.add({name,geometry,position:{left:x,top:y,width:w,height:h},fill,line:line(stroke,sw)});
}
function tx(s,name,text,x,y,w,h,size=20,opt={}){
 const t=shape(s,name,x,y,w,h);t.text=text;
 t.text.style={typeface:opt.display?display:font,fontSize:size,color:opt.color||C.ink,bold:!!opt.bold,alignment:opt.align||'left',verticalAlignment:'top',lineSpacing:1.04,insets:0,wrap:'none',autoFit:'none'};
 return t;
}
function rule(s,name,x,y,w,color=C.rule){return shape(s,name,x,y,w,0,'none',color,1,'line');}
function base(no,kicker,title,source){
 const s=deck.slides.add();s.background.fill=C.bg;
 tx(s,'eyebrow',kicker,54,35,720,22,13,{color:C.cyan,bold:true});
 tx(s,'brand','MCKINSEY-DECK-CRAFT  /  '+String(no).padStart(2,'0'),804,35,422,22,13,{color:C.muted,align:'right'});
 tx(s,'slide-title',title,52,79,1176,137,50,{bold:true});
 shape(s,'column-divider',493,254,0,366,'none',C.rule,1,'line');
 rule(s,'footer-rule',54,670,1172);
 tx(s,'source-disclosure',source,54,686,1090,19,12,{color:C.muted});
 tx(s,'page-number',String(no).padStart(2,'0'),1179,683,47,24,16,{color:C.muted,align:'right'});
 return s;
}
function label(s,text,x,y,w=680,color=C.cyan){tx(s,text,text,x,y,w,24,14,{color,bold:true});}
function small(s,name,text,x,y,w=680){tx(s,name,text,x,y,w,28,17,{color:C.muted});}
function styleChart(ch){applyPresentationChartFont(ch,{fontFamily:font});return ch;}
const num=v=>new Intl.NumberFormat('en-US').format(v);
const moneyK=v=>'CNY '+num(v/1000)+'k';
const chartBase={hasLegend:false,chartFill:C.bg,plotAreaFill:C.bg,chartLine:line('none',0),plotAreaLine:line('none',0)};
{
 const d=data.support;
 const s=base(1,'01  /  INVESTMENT DECISIONS','Demand is rising.\nMake the next move count.','SYNTHETIC DATA  /  Customer support scenario  /  Costs in CNY thousands');
 tx(s,'demand-growth',num((d.tickets.at(-1)/d.tickets[0]-1)*100)+'%',50,312,400,118,116,{display:true,color:C.cyan,bold:true});
 tx(s,'metric-label','MORE SUPPORT TICKETS',55,439,400,26,17,{bold:true});
 small(s,'demand-timeline',d.tickets.map(x=>num(x/1000)+'k').join('  →  ')+'  /  '+d.months[0]+'–'+d.months.at(-1),55,480,400);
 label(s,'COMPARE COST BEFORE COMMITTING',550,256);
 small(s,'cost-unit','Estimated investment · CNY thousands',550,291);
 const ch=styleChart(s.charts.add('bar',{
  ...chartBase,position:{left:532,top:332,width:688,height:240},
  categories:d.options.map(x=>x.name),
  series:[{name:'Estimated cost',values:d.options.map(x=>x.costThousands),fill:C.blue,line:line('none',0),
   points:d.options.map((x,idx)=>({idx,fill:idx===0?C.cyan:idx===1?C.blue:'#A6B9D0',line:line('none',0)}))}],
  barOptions:{direction:'bar',grouping:'clustered',gapWidth:110},
  xAxis:{visible:true,tickLabelPosition:'low',textStyle:{fontSize:17,fill:C.ink},line:line('none',0),majorGridlines:null},
  yAxis:{visible:true,min:0,max:320,majorUnit:100,numberFormatCode:'#,##0',textStyle:{fontSize:14,fill:C.muted},line:line('none',0),majorGridlines:line(C.rule,.7)},
  dataLabels:{showValue:true,position:'outEnd',numberFormatCode:'#,##0',textStyle:{fontSize:19,bold:true,fill:C.ink}}
 }));
 tx(s,'budget-ceiling','Budget ceiling: '+moneyK(d.budgetCeilingThousands*1000),550,590,670,28,21,{bold:true});
 small(s,'decision-boundary','Different scopes. Validate coverage and impact before selecting.',550,628);
 s.speakerNotes.text='Source: examples/english-showcase/source.json, support. Synthetic inputs derived from examples/saas-budget. January tickets 10,000; February 12,000; March 15,000; Jan-to-Mar growth=(15,000/10,000)-1=50%. Costs: knowledge base 220, process redesign 150, add capacity 280 (CNY thousands). Budget ceiling 300. Costs have different scopes and benefit estimates are unknown. This slide does not claim a preferred or proven ROI option. Text and chart are native editable elements.';
}
{
 const d=data.research;
 const s=base(2,'02  /  OPERATING MODELS','One shared service.\nThree clear conditions.','SYNTHETIC DATA  /  Shared research service  /  Launch remains conditional');
 tx(s,'request-count',num(d.monthlyRequestComponents.reduce((a,b)=>a+b,0)),50,312,400,118,116,{display:true,color:C.cyan,bold:true});
 tx(s,'metric-label','REQUESTS PER MONTH',55,439,410,26,17,{bold:true});
 small(s,'request-scope','Two departments. One shared workflow.',55,480,410);
 label(s,'ALL THREE GATES MUST BE SATISFIED',550,256);
 const rows=[
  ['01','PEOPLE',num(d.availableStaff)+' staff / minimum of '+num(d.minimumStaff)],
  ['02','BUDGET',moneyK(d.estimatedSpendCny)+' estimate / '+moneyK(d.budgetCeilingCny)+' ceiling'],
  ['03','GOVERNANCE',d.governance.slice(0,-1).join(', ')+ ' and '+d.governance.at(-1).toLowerCase()]
 ];
 rows.forEach((r,i)=>{
  const y=305+i*86;
  tx(s,'gate-number-'+i,r[0],550,y,46,43,32,{display:true,color:C.cyan});
  tx(s,'gate-label-'+i,r[1],614,y,580,20,13,{color:C.muted,bold:true});
  tx(s,'gate-value-'+i,r[2],614,y+26,580,35,22,{bold:true});
  rule(s,'gate-rule-'+i,550,y+73,670);
 });
 small(s,'gate-instruction','Once approved, move through a controlled pilot.',550,584);
 const nodes=['SCOPE','PILOT','REVIEW'].map((text,i)=>{
  const n=shape(s,'flow-'+text,550+i*238,623,186,30);
  n.text=text;n.text.style={typeface:font,fontSize:15,bold:true,color:i===1?C.cyan:C.ink,insets:0,alignment:'left',verticalAlignment:'middle',autoFit:'none',wrap:'none'};return n;
 });
 for(let i=0;i<2;i++)s.shapes.connect(nodes[i],nodes[i+1],{kind:'straight',fromSide:'right',toSide:'left',line:line(C.muted,1),tail:{type:'triangle',width:'sm',length:'sm'}});
 s.speakerNotes.text='Source: examples/english-showcase/source.json, research. Synthetic inputs derived from examples/university-service. Monthly request components 12+10+8=30 across two departments. Launch gates are conjunctive, not sequential: minimum two available staff; estimated spend CNY 90,000 within the CNY 100,000 ceiling; approved access, ownership and governance. CNY 10,000 arithmetic headroom is not a realized saving. Scope/pilot/review is the proposed sequence after gate approval. No scientific or service outcome is claimed. Text and flow are native editable elements.';
}
{
 const d=data.value;
 const net=d.grossContributionCny-d.peopleCny-d.securityCny-d.setupCny;
 if(net!==d.netContributionCny)throw new Error('Net contribution must match source arithmetic.');
 const s=base(3,'03  /  DATA STORYTELLING','From contribution\nto net value.','SYNTHETIC DATA  /  Six-weekend scenario  /  CNY  /  Contribution, not profit or ROI');
 tx(s,'currency','CNY',55,315,360,27,17,{color:C.muted,bold:true});
 tx(s,'net-contribution',num(net),50,347,421,110,103,{display:true,color:C.cyan,bold:true});
 tx(s,'metric-label','NET CONTRIBUTION',55,466,400,26,17,{bold:true});
 label(s,'MAKE EVERY DEDUCTION VISIBLE',550,256);
 small(s,'bridge-unit','Contribution bridge · CNY',550,291);
 const none={showValue:false,showSeriesName:false,showCategoryName:false,showLegendKey:false,showPercent:false};
 const lab=(idx,text,fill=C.bg)=>({idx,text,position:'outEnd',showValue:false,showSeriesName:false,showCategoryName:false,textStyle:{typeface:font,fontSize:16,bold:true,fill}});
 const ch=styleChart(s.charts.add('bar',{
  ...chartBase,position:{left:528,top:336,width:698,height:258},
  categories:['Gross','People','Security','Setup','Net'],
  series:[
   {name:'Floating base',values:[0,d.grossContributionCny-d.peopleCny,d.grossContributionCny-d.peopleCny-d.securityCny,net,0],fill:'none',line:line('none',0),dataLabels:none},
   {name:'Contribution',values:[d.grossContributionCny,0,0,0,net],fill:C.blue,line:line('none',0),points:[{idx:4,fill:C.cyan,line:line('none',0)}],dataLabels:none,dataLabelOverrides:[lab(0,num(d.grossContributionCny),C.ink),lab(4,num(net))]},
   {name:'Deductions',values:[0,d.peopleCny,d.securityCny,d.setupCny,0],fill:C.amber,line:line('none',0),dataLabels:none,dataLabelOverrides:[lab(1,'−'+num(d.peopleCny)),lab(2,'−'+num(d.securityCny)),lab(3,'−'+num(d.setupCny))]}
  ],
  barOptions:{direction:'column',grouping:'stacked',overlap:100,gapWidth:85},
  xAxis:{visible:true,tickLabelPosition:'low',textStyle:{fontSize:16,fill:C.ink},line:line('none',0),majorGridlines:null},
  yAxis:{visible:true,min:0,max:24000,majorUnit:8000,numberFormatCode:'#,##0',textStyle:{fontSize:14,fill:C.muted},line:line('none',0),majorGridlines:line(C.rule,.7)},
  dataLabels:none
 }));
 tx(s,'bridge-formula',num(d.grossContributionCny)+' − '+num(d.peopleCny)+' − '+num(d.securityCny)+' − '+num(d.setupCny)+' = '+num(net),550,616,676,32,22,{bold:true});
 s.speakerNotes.text='Source: examples/english-showcase/source.json, value. Synthetic six-weekend contribution scenario derived from assets/templates/professional-chart-gallery.pptx, physical slide 3. Gross contribution CNY 20,160 less people 6,480, security 3,360 and setup 2,000 equals net contribution 8,320. Floating bases 13,680; 10,320; 8,320 are arithmetic layout values, not additional business amounts. This is contribution, not sales profit or ROI. Text and the native bridge chart are editable elements.';
}
const draft=path.join(buildDir,'candidate-'+Date.now()+'.pptx');
await (await PresentationFile.exportPptx(deck)).save(draft);
const result=await finalizePresentation({
 workspaceDir:root,candidatePath:draft,finalPath,pythonExecutable:python,
 explicitTotalSlideCount:3,requiredNativeChartOwnerSlides:[1,3],requiredNativeTableOwnerSlides:[],
 materializeLiteralChartWorkbooks:true,
 integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],
 fontPolicy:{basis:'design',families:[font,display]},verifyArtifactToolImport:true,
 receiptPath:path.join(buildDir,path.basename(path.dirname(finalPath))+'.validation.json')
});
const exact=await PresentationFile.importPptx(await FileBlob.load(finalPath));
const renderDir=path.join(buildDir,path.basename(path.dirname(finalPath))+'-renders');
await fs.mkdir(renderDir,{recursive:true});
for(let i=0;i<exact.slides.items.length;i++){
 const slide=exact.slides.items[i];
 const png=await exact.export({slide,format:'png',scale:1.5});
 await fs.writeFile(path.join(renderDir,'slide-'+(i+1)+'.png'),new Uint8Array(await png.arrayBuffer()));
}
await fs.writeFile(path.join(buildDir,'inventory.json'),JSON.stringify(exact.slides.items.map((s,i)=>({slide:i+1,charts:s.charts.items.length,images:s.images.items.length,text:s.shapes.items.map(x=>String(x.text||'')).filter(Boolean)})),null,2)+'\n');
console.log(JSON.stringify({finalPath,renderDir,result},null,2));
