import {createTheme} from './theme.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const skillDir=process.env.DECK_PRESENTATIONS_SKILL_DIR;
if(!skillDir)throw new Error('Set DECK_PRESENTATIONS_SKILL_DIR to the installed presentations skill directory');
const {applyPresentationChartFont}=await import(pathToFileURL(path.join(skillDir,'container_tools/artifact_tool_utils.mjs')));

function themedAdvanced(config){
const theme=config?.C?config:createTheme(config??{});
const C={...theme.C,gray:theme.chart.context,line:theme.C.rule,negative:theme.chart.negative};
const fmt=v=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(v);
const line=(fill,width=1)=>({fill,width,style:'solid'});
const text=(fill=C.ink,bold=false)=>({typeface:'Arial Unicode MS',fontSize:18,fill:fill===C.blue?C.primaryText:fill===C.gray?theme.C.gray:fill===C.accent?C.accentText:fill,bold});
const point=(idx,label,position,fill=C.ink,bold=false)=>({idx,text:label,position,showValue:false,showSeriesName:false,showCategoryName:false,textStyle:text(fill,bold)});
function finite(v,label){if(!Number.isFinite(v))throw new Error(`${label} must be finite`);return v;}
// Source arithmetic can contain IEEE-754 noise. Currency is retained to cents.
const money=(v,label)=>Math.round(finite(v,label)*100)/100;
function options(data){
 if(!Array.isArray(data.options)||!data.options.length)throw new Error('data.options is required');
 return data.options.map(o=>({...o,low:money(o.low,'low'),base:money(o.base,'base'),high:money(o.high,'high'),cost:money(o.cost,'cost'),external:finite(o.external,'external')}));
}
function chart(slide,rect,series,xAxis,yAxis){
 const ch=slide.charts.add('scatter',{
  position:{...rect},series,scatterOptions:{style:'lineWithMarkers',varyColors:false},hasLegend:false,
  xAxis:{visible:true,position:'bottom',numberFormatCode:'#,##0',textStyle:text(C.gray),line:line(C.line,.7),majorGridlines:line(C.line,.6),...xAxis},
  yAxis:{visible:false,position:'left',line:line('none',0),majorGridlines:null,...yAxis},
  dataLabels:{visible:true,showValue:false,showSeriesName:false,showCategoryName:false,textStyle:text()},
  chartFill:'#FFFFFF',chartLine:line('none',0),plotAreaFill:'#FFFFFF',plotAreaLine:line('none',0),
 });
 applyPresentationChartFont(ch,{fontFamily:'Arial Unicode MS'});
 return ch;
}

/** Native XY scenario ranges. low/base/high are demand scenarios, not probabilities. */
function addRangeChart(slide,rect,data){
 const rows=options(data).filter(o=>data.baselineId===undefined||o.id!==data.baselineId);
 if(!rows.length)throw new Error('Range chart needs non-baseline options');
 const low=Math.min(0,...rows.map(o=>o.low)),high=Math.max(0,...rows.map(o=>o.high));
 const step=high-low>10000?10000:1000;
 const span=high-low||step;
 const min=Math.floor((low-span*.18)/step)*step;
 const max=Math.ceil((high+span*.1)/step)*step;
 const series=[];
 rows.forEach((o,i)=>{
  const y=rows.length-i,color=o.id===data.highlightId?C.blue:C.gray;
  series.push({name:`${o.id} ${o.name}：需求低高情景`,xValues:[o.low,o.high],values:[y,y],line:line(color,3),marker:{symbol:'circle',size:7,fill:color},
   dataLabelOverrides:[point(0,`${o.id} ${o.name}\n${fmt(o.low)}`,'left',o.low<0?C.negative:C.ink),point(1,fmt(o.high),'right')]});
  series.push({name:`${o.id} 基准情景`,xValues:[o.base],values:[y],line:line('none',0),marker:{symbol:'circle',size:11,fill:color},
   dataLabelOverrides:[point(0,`${fmt(o.base)} 基准`,'top',color,true)]});
 });
 return chart(slide,rect,series,{min,max,majorUnit:step},{min:0,max:rows.length+1,majorUnit:1});
}

/** Native XY dumbbells. Values retain gross and net sales at the two ends. */
function addDumbbellChart(slide,rect,data){
 if(!Array.isArray(data.hourly)||!data.hourly.length)throw new Error('data.hourly is required');
 const rows=data.hourly.map(o=>({...o,gross:money(o.gross,'gross'),net:money(o.net,'net')}));
 const high=Math.max(0,...rows.flatMap(o=>[o.gross,o.net])),step=high>1000?500:100;
 const comparison=C.accent??C.gray;
 const series=rows.map((o,i)=>({name:o.name,xValues:[o.net,o.gross],values:[rows.length-i,rows.length-i],line:line(C.line,3),marker:{symbol:'circle',size:10,fill:comparison},
  points:[{idx:0,fill:C.blue,line:line(C.blue,1)},{idx:1,fill:comparison,line:line(comparison,1)}],
  dataLabelOverrides:[point(0,`${o.name}\n${data.netLabel??'净新增'} ${fmt(o.net)}`,'left',C.blue,true),point(1,`${data.grossLabel??'需求估计'} ${fmt(o.gross)}`,'right')]}));
 return chart(slide,rect,series,{min:Math.min(0,...rows.flatMap(o=>[o.gross,o.net])),max:Math.max(step,Math.ceil(high*1.15/step)*step),majorUnit:step},{min:0,max:rows.length+1,majorUnit:1});
}

/** Native cost × contribution scatter. No categorical x substitution. */
function addInvestmentChart(slide,rect,data){
 const rows=options(data),highX=Math.max(...rows.map(o=>o.cost)),highY=Math.max(...rows.map(o=>o.base));
 const xValues=rows.map(o=>o.cost),yValues=rows.map(o=>o.base);
 const xStep=Math.max(0,...xValues)-Math.min(0,...xValues)>20000?10000:5000,yStep=Math.max(0,...yValues)-Math.min(0,...yValues)>10000?5000:2000;
 const domain=(values,step)=>{let min=Math.min(0,...values),max=Math.max(0,...values),span=max-min;if(!span)return {min:0,max:step};return {min:min<0?Math.floor((min-span*.08)/step)*step:0,max:max>0?Math.ceil((max+span*.2)/step)*step:0};};
 const xDomain=domain(xValues,xStep),yDomain=domain(yValues,yStep);
 const series=rows.map(o=>{
  const color=o.id===data.highlightId?C.blue:o.id===data.baselineId?C.gray:C.ink;
  const position=data.labelPositions?.[o.id]??(o.id===data.highlightId?'bottom':'top');
  return {name:`${o.id} ${o.name}`,xValues:[o.cost],values:[o.base],line:line('none',0),marker:{symbol:'circle',size:o.id===data.highlightId?13:10,fill:color},
   dataLabelOverrides:[point(0,data.labelText?.[o.id]??`${o.id} ${o.name}\n投入 ${fmt(o.cost)} / 贡献 ${fmt(o.base)}\n外援 ${fmt(o.external)} 人时/周末`,position,color,o.id===data.highlightId)]};
 });
 return chart(slide,rect,series,
  {...xDomain,majorUnit:xStep},
  {visible:true,...yDomain,majorUnit:yStep,numberFormatCode:'#,##0',textStyle:text(C.gray),line:line(C.line,.7),majorGridlines:line(C.line,.6)});
}

return {addRangeChart,addDumbbellChart,addInvestmentChart};
}
export function addRangeChart(slide,rect,data){return themedAdvanced(data.theme).addRangeChart(slide,rect,data);}
export function addDumbbellChart(slide,rect,data){return themedAdvanced(data.theme).addDumbbellChart(slide,rect,data);}
export function addInvestmentChart(slide,rect,data){return themedAdvanced(data.theme).addInvestmentChart(slide,rect,data);}
