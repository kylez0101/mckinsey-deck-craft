// Six analytical compositions. All business values enter through resolved JSON.
// The host owns titles, sources, notes, cover, theme creation, and finalization.
import {allowedDataPageFields,templateSpec} from './template-contract.mjs';
import {numericScale} from './chart-scale.mjs';
export {allowedDataPageFields};
const LEFT=58, WIDTH=1164, FONT='Arial Unicode MS';
const font=(H,size)=>H.fontSize?H.fontSize(size):size;
const validScalar=v=>typeof v==='string'||(typeof v==='number'&&Number.isFinite(v));
const units=s=>Array.from(String(s)).reduce((n,c)=>n+(/[\u2E80-\u9FFF\uF900-\uFAFF\uFF01-\uFF60]/u.test(c)?1:/\s/u.test(c)?.3:.56),0);
const ensure=(condition,message)=>{if(!condition)throw new Error(message);};
const bounded=(value,label,maxUnits,maxLines=1)=>{
 ensure(typeof value==='string'&&value.trim().length>0,`${label}: supply non-empty text.`);
 ensure(!/[\u0000]/u.test(value),`${label}: null character is not allowed.`);
 const lines=value.split('\n').reduce((n,s)=>n+Math.max(1,Math.ceil(units(s)/maxUnits)),0);
 ensure(lines<=maxLines,`${label}: about ${lines} lines exceed ${maxLines}; shorten, split the page, or choose the wider layout. No font shrinking or text dropping is applied.`);
 return value;
};
function rejectUnknown(object,allowed,label){
 ensure(object&&typeof object==='object'&&!Array.isArray(object),`${label}: an object is required.`);
 const unknown=Object.keys(object).filter(k=>!allowed.has(k));
 ensure(!unknown.length,`${label}: unknown fields ${unknown.join(', ')}. They must not be silently discarded.`);
}
function parsePeriod(value){
 const s=String(value).trim();let m;
 if((m=/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/u.exec(s)))return Number(m[1])*372+Number(m[2])*31+Number(m[3]||1);
 if((m=/^(\d{4})\s*[Qq]([1-4])$/u.exec(s)))return Number(m[1])*4+Number(m[2]);
 if((m=/^(?:第)?(\d{1,2})(?:月|周|期)$/u.exec(s)))return Number(m[1]);
 return null;
}
function validateChart(d,layout,rail,scale=1){
 const fields=templateSpec(layout).fields.chart.fields;
 rejectUnknown(d,new Set(Object.keys(fields)),`${layout}.chart`);
 const trend=['A03','A04'].includes(layout),{minItems:lowCount,maxItems:highCount}=fields.categories;
 ensure(Array.isArray(d.categories)&&d.categories.length>=lowCount&&d.categories.length<=highCount,`${layout}: ${trend?'trend':'comparison'} needs ${lowCount}–${highCount} categories.`);
 d.categories.forEach((s,i)=>bounded(s,`${layout}.category[${i}]`,(trend?(rail?5:7):(rail?10:15))/scale));
 ensure(new Set(d.categories).size===d.categories.length,`${layout}: category labels must be distinct.`);
 const {minItems:minSeries,maxItems:maxSeries}=fields.series;
 ensure(Array.isArray(d.series)&&d.series.length>=minSeries&&d.series.length<=maxSeries,`${layout}: supply ${minSeries}–${maxSeries} series; use another page for more series.`);
 d.series.forEach((s,i)=>{
  rejectUnknown(s,new Set(Object.keys(fields.series.items.fields)),`${layout}.series[${i}]`);
  bounded(s.name,`${layout}.series[${i}].name`,rail?14:22);
  ensure(Array.isArray(s.values)&&s.values.length===d.categories.length,`${layout}: every series must match all categories.`);
  ensure(s.values.every(v=>typeof v==='number'&&Number.isFinite(v)),`${layout}: values must be complete finite numbers; unknown values are not zero. Resolve missing data or choose a table.`);
 });
 bounded(d.unit,`${layout}.chart.unit`,rail?32:55);
 if(d.format!==undefined)ensure(typeof d.format==='string'&&d.format.length>0&&d.format.length<=80,`${layout}: chart.format must be a short PowerPoint number format.`);
 const all=d.series.flatMap(s=>s.values),minimum=Math.min(...all),maximum=Math.max(...all);
 for(const key of ['min','max'])if(d[key]!==undefined)ensure(typeof d[key]==='number'&&Number.isFinite(d[key]),`${layout}: chart.${key} must be finite.`);
 if(!trend){
  ensure(d.min===undefined||d.min<=0,`${layout}: bar comparisons must include zero; a positive truncated minimum is misleading.`);
  ensure(minimum>=0||d.min!==undefined,`${layout}: negative comparisons require an explicit chart.min that includes all values and zero.`);
 }
 const ratioFormat=typeof d.format==='string'&&d.format.includes('%')&&minimum>=0&&maximum<=1;
 const {min,max,majorUnit}=numericScale(all,{min:d.min,max:d.max??(ratioFormat?1:undefined),includeZero:!trend||(d.min===undefined&&d.max===undefined)});
 ensure(min<=minimum&&max>=maximum&&max>min,`${layout}: axis bounds must cover every value with max > min.`);
 if(!trend)ensure(min<=0&&max>=0,`${layout}: comparison scale must contain zero.`);
 if(d.emphasisIndex!==undefined){
  ensure(Number.isInteger(d.emphasisIndex)&&d.emphasisIndex>=0&&d.emphasisIndex<d.categories.length,`${layout}: emphasisIndex must identify one existing category.`);
  bounded(d.emphasisReason,`${layout}.chart.emphasisReason`,rail?31:55,2);
 }else ensure(d.emphasisReason===undefined,`${layout}: emphasisReason requires emphasisIndex.`);
 if(trend){
  const ordered=d.categories.map(parsePeriod);
  if(ordered.every(v=>v!==null))ensure(ordered.every((v,i)=>i===0||v>ordered[i-1]),`${layout}: trend categories must be chronological. Input order is preserved; it is not sorted automatically.`);
 }
 return {min,max,trend,majorUnit};
}
function wrapRailText(value,label,scale=1){
 bounded(value,label,14/scale,3);
 const lines=[],capacity=13/scale;
 for(const paragraph of value.split('\n')){
  // Keep complete numbers (including a following unit) and English words together.
  const tokens=paragraph.match(/[+\-−]?\d+(?:[,.]\d+)*(?:\s*(?:亿元|万元|元|小时|天|周|店|个|件|台|次|人|%|％))?|[A-Za-z][A-Za-z0-9’'._/+−-]*|[\s\S]/gu)??[];
  let current=[];
  for(const token of tokens){
   ensure(units(token)<=capacity,`${label}: an indivisible number or English token is wider than the analysis rail; shorten its display format or choose the wider layout.`);
   while(current.length&&units(current.join(''))+units(token)>capacity){
    // Closing punctuation may use the one-unit safety margin.
    if(/^[，；：。！？、,;:!?]$/u.test(token)&&units(current.join(''))+units(token)<=14/scale)break;
    let cut=-1;
    for(let j=current.length-2;j>=0;j--)if(/^[，；。！？,;!?]$/u.test(current[j])&&units(current.slice(0,j+1).join(''))>=capacity/2){cut=j+1;break;}
    if(cut>0){lines.push(current.slice(0,cut).join(''));current=current.slice(cut);}
    else{lines.push(current.join(''));current=[];}
   }
   current.push(token);
  }
  lines.push(current.join(''));
 }
 ensure(lines.length<=3,`${label}: safe wrapping needs ${lines.length} lines; shorten, split the page, or choose the wider layout. No characters were dropped.`);
 return lines.join('\n');
}
function validateInsights(insights,layout,scale=1){
 const {minItems,maxItems,items}=templateSpec(layout).fields.insights;
 ensure(Array.isArray(insights)&&insights.length>=minItems&&insights.length<=maxItems,`${layout}: the analysis rail needs ${minItems}–${maxItems} focused insights.`);
 insights.forEach((item,i)=>{
  rejectUnknown(item,new Set(Object.keys(items.fields)),`${layout}.insights[${i}]`);
  bounded(item.heading,`${layout}.insight[${i}].heading`,14/scale,1);
  wrapRailText(item.text,`${layout}.insight[${i}].text`,scale);
 });
}
function addRail(slide,insights,C,H){
 // One editorial rail with open separators; no decorative card grid.
 H.shape(slide,'analysis-rail-divider',899,180,0,390,'none',C.rule,.8,'line');
 const rowHeight=390/insights.length,bodyHeight=Math.max(76,Math.ceil(3*font(H,19.5)*1.18));
 const separatorShift=font(H,19.5)>19.5?4:0;
 insights.forEach((item,i)=>{
  const y=186+i*rowHeight;
  H.tx(slide,`analysis-heading-${i}`,item.heading,928,y,294,29,20,{bold:true,color:C.primaryText||C.ink});
  H.tx(slide,`analysis-text-${i}`,wrapRailText(item.text,`analysis-text-${i}`,H.textScale??1),928,y+37,294,bodyHeight,19.5,{color:C.ink});
  if(i<insights.length-1)H.rule(slide,`analysis-rule-${i}`,928,y+rowHeight-9+separatorShift,294,C.rule,.6);
 });
}
function chartSeries(d,C,trend,rail,H){
 return d.series.map((s,i)=>{
  const fill=i===0?C.blue:(C.accent??C.gray);
  const format=d.format??(d.series.every(item=>item.values.every(Number.isInteger))?'#,##0':'#,##0.00');
  const labels={showValue:true,position:trend?(i===0?'top':'bottom'):'outEnd',numberFormatCode:format,textStyle:{typeface:H.fontFamily??FONT,fontSize:font(H,18),fill:C.ink}};
  const config={name:s.name,values:[...s.values],fill,line:{fill:trend?fill:'none',width:trend?2.6:0,style:'solid'},dataLabels:labels,valuesFormatCode:format};
  if(trend){
   config.marker={symbol:i===0?'circle':'diamond',size:6,fill};
   // Paired series label only endpoints, leaving the trajectory legible.
   if(d.series.length===2)config.dataLabelOverrides=s.values.map((v,k)=>({idx:k,showValue:k===0||k===s.values.length-1,position:v<0||i===0?'top':'bottom'}));
  }else if(d.series.length===1){
   config.points=s.values.map((v,k)=>({idx:k,fill:d.emphasisIndex===undefined?C.blue:k===d.emphasisIndex?C.blue:C.gray,line:{fill:'none',width:0,style:'solid'}}));
  }
  return config;
 });
}
function renderChart(slide,p,C,H,rail){
 const d=p.chart,{min,max,trend,majorUnit}=validateChart(d,p.layout,rail,H.textScale??1),family=H.fontFamily??FONT;
 if(rail)validateInsights(p.insights,p.layout,H.textScale??1);
 const width=rail?806:WIDTH;
 const format=d.format??(d.series.every(item=>item.values.every(Number.isInteger))?'#,##0':'#,##0.00');
 H.tx(slide,'analysis-unit',d.unit,LEFT,178,width,26,18,{color:C.gray});
 const ch=slide.charts.add(trend?'line':'bar',{
  position:{left:LEFT,top:218,width,height:350},categories:[...d.categories],series:chartSeries(d,C,trend,rail,H),
  hasLegend:d.series.length===2,
  legend:{position:'top',overlay:false,textStyle:{typeface:family,fontSize:font(H,18),fill:C.gray},line:{fill:'none',width:0}},
  chartFill:C.white,plotAreaFill:C.white,chartLine:{fill:'none',width:0},plotAreaLine:{fill:'none',width:0},
  ...(trend?{lineOptions:{grouping:'standard',smooth:false}}:{barOptions:{direction:'bar',grouping:'clustered',gapWidth:d.series.length===1?95:65}}),
  xAxis:{visible:true,tickLabelPosition:'low',textStyle:{typeface:family,fontSize:font(H,18),fill:C.ink},line:{fill:trend?C.rule:'none',width:trend?.7:0},majorGridlines:null},
  yAxis:{visible:true,min,max,majorUnit,numberFormatCode:format,textStyle:{typeface:family,fontSize:font(H,17),fill:C.gray},line:{fill:'none',width:0},majorGridlines:{fill:C.rule,width:.5}},
  dataLabels:{showValue:true,position:trend?'top':'outEnd',numberFormatCode:format,textStyle:{typeface:family,fontSize:font(H,18),fill:C.ink}},
 });
 H.applyPresentationChartFont(ch,{fontFamily:family});
 if(rail)addRail(slide,p.insights,C,H);
 const caption=p.caption??d.emphasisReason;
 if(caption)H.tx(slide,'analysis-caption',bounded(caption,`${p.layout}.caption`,55,1),LEFT,581,WIDTH,25,18,{color:C.gray});
 if(p.takeaway)H.takeaway(slide,bounded(p.takeaway,`${p.layout}.takeaway`,55,2),615);
 return {hasChart:true,hasTable:false};
}
function tableWidths(p,width,rail){
 if(p.columnWidths!==undefined){
  const minimum=templateSpec(p.layout).fields.columnWidths.items.minimum;
  ensure(Array.isArray(p.columnWidths)&&p.columnWidths.length===p.headers.length&&p.columnWidths.every(w=>Number.isFinite(w)&&w>=minimum),`${p.layout}: columnWidths needs one width >= ${minimum} px per column.`);
  ensure(Math.abs(p.columnWidths.reduce((a,b)=>a+b,0)-width)<.1,`${p.layout}: columnWidths must sum to ${width} px.`);
  return [...p.columnWidths];
 }
 const count=p.headers.length;
 const keyWidth=count===2?Math.round(width*.30):Math.min(rail?224:280,Math.round(width*.25));
 return [keyWidth,...p.headers.slice(1).map(()=>(width-keyWidth)/(count-1))];
}
function renderTable(slide,p,C,H,rail){
 const fields=templateSpec(p.layout).fields,width=rail?806:WIDTH;
 const {minItems:minRows,maxItems:maxRows}=fields.rows,{minItems:minCols,maxItems:maxCols}=fields.headers;
 ensure(Array.isArray(p.headers)&&p.headers.length>=minCols&&p.headers.length<=maxCols,`${p.layout}: supply ${minCols}–${maxCols} column headers.`);
 ensure(Array.isArray(p.rows)&&p.rows.length>=minRows&&p.rows.length<=maxRows,`${p.layout}: supply ${minRows}–${maxRows} body rows; split denser evidence across pages.`);
 const widths=tableWidths(p,width,rail),numeric=p.numericColumns??[];
 ensure(Array.isArray(numeric)&&new Set(numeric).size===numeric.length&&numeric.every(i=>Number.isInteger(i)&&i>=0&&i<p.headers.length),`${p.layout}: numericColumns must contain distinct zero-based column indices.`);
 if(p.highlightRow!==undefined)ensure(Number.isInteger(p.highlightRow)&&p.highlightRow>=0&&p.highlightRow<p.rows.length,`${p.layout}: highlightRow is a zero-based body row index.`);
 if(rail)validateInsights(p.insights,p.layout,H.textScale??1);
 const tableFont=font(H,19.5);
 const bodyMaxLines=rail?3:2;

 const values=[p.headers,...p.rows].map((row,r)=>{
  ensure(Array.isArray(row)&&row.length===p.headers.length,`${p.layout}: row ${r} must retain all ${p.headers.length} columns.`);
  return row.map((v,c)=>{
   ensure(validScalar(v),`${p.layout}: table cell ${r}/${c} is missing or not finite. Supply an explicit unknown label; do not coerce it to zero.`);
   return bounded(String(v),`${p.layout}.cell[${r},${c}]`,(widths[c]-26)/tableFont,r===0?2:bodyMaxLines);
  });
 });
 const estimatedLines=(v,c)=>String(v).split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(units(line)/((widths[c]-26)/tableFont))),0);
 const headerLines=Math.max(...p.headers.map(estimatedLines));
 const headerHeight=Math.max(headerLines>1?66:50,Math.ceil(headerLines*tableFont*1.16+14));
 const bodyLines=Math.max(...p.rows.flatMap(row=>row.map(estimatedLines)));
 const rowHeight=Math.max(rail?(bodyLines>=3?92:82):(bodyLines>=2?78:64),Math.ceil(bodyLines*tableFont*1.16+14));
 const tableBottom=190+headerHeight+p.rows.length*rowHeight;
 ensure(tableBottom<=(p.caption?568:600),`${p.layout}: multi-line cells exceed the available table height; shorten, split rows across slides, or choose a wider layout. No content was dropped.`);
 const t=H.nativeTable(slide,'analytical-decision-table',values,LEFT,190,width,[headerHeight,...p.rows.map(()=>rowHeight)],widths,{header:true,highlightRow:p.highlightRow===undefined?-1:p.highlightRow+1,numericColumns:numeric,fontSize:19.5});
 // Pin the style explicitly: no full-column color slabs, numeric columns align by magnitude.
 for(let r=0;r<values.length;r++)for(let c=0;c<widths.length;c++){
  const head=r===0,selected=!head&&r===p.highlightRow+1,cell=t.getCell(r,c);
  cell.fill=selected?C.pale:C.white;
  cell.text.style={typeface:H.fontFamily??FONT,fontSize:tableFont,bold:head||c===0||selected,color:C.ink,alignment:numeric.includes(c)?'right':'left',verticalAlignment:'middle',lineSpacing:1.16,insets:{left:12,right:12,top:7,bottom:7},wrap:'square',autoFit:'none'};
 }
 if(p.highlightRow!==undefined){
  const y=190+headerHeight+p.highlightRow*rowHeight;
  H.shape(slide,'decision-selected-rule',LEFT,y,3,rowHeight,C.blue);
 }
 if(rail)addRail(slide,p.insights,C,H);
 if(p.caption)H.tx(slide,'analysis-caption',bounded(p.caption,`${p.layout}.caption`,55,1),LEFT,581,WIDTH,25,18,{color:C.gray});
 if(p.takeaway)H.takeaway(slide,bounded(p.takeaway,`${p.layout}.takeaway`,55,2),615);
 return {hasChart:false,hasTable:true};
}
export function renderDataPage({slide,p,theme,helpers}){
 ensure(allowedDataPageFields[p?.layout],`Unsupported data layout ${p?.layout}.`);
 ensure(theme?.C,`${p.layout}: pass the result of createTheme().`);
 for(const key of ['ink','blue','pale','gray','rule','white'])ensure(typeof theme.C[key]==='string',`${p.layout}: theme.C.${key} is required.`);
 for(const key of ['tx','rule','shape','nativeTable','takeaway','applyPresentationChartFont'])ensure(typeof helpers?.[key]==='function',`${p.layout}: helpers.${key} is required.`);
 const rail=['A02','A04','A06'].includes(p.layout);
 return ['A05','A06'].includes(p.layout)?renderTable(slide,p,theme.C,helpers,rail):renderChart(slide,p,theme.C,helpers,rail);
}
