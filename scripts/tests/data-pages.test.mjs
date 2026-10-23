import test from 'node:test';
import assert from 'node:assert/strict';
import {renderDataPage} from '../data-pages.mjs';

function fixture(){
 const seen={charts:[],tables:[],texts:[],shapes:[],fontCalls:0};
 const cells=new Map();
 const slide={charts:{add:(type,options)=>{const chart={type,options};seen.charts.push(chart);return chart;}}};
 const theme={C:{ink:'ink',blue:'blue',pale:'pale',gray:'gray',rule:'rule',white:'white',primaryText:'text-primary'}};
 const helpers={
  tx:(...args)=>seen.texts.push(args),rule:()=>{},shape:(...args)=>seen.shapes.push(args),takeaway:()=>{},applyPresentationChartFont:()=>seen.fontCalls++,
  nativeTable:(...args)=>{
   seen.tables.push(args);
   return {getCell:(r,c)=>{const k=`${r}/${c}`;if(!cells.has(k))cells.set(k,{text:{}});return cells.get(k);}};
  },
 };
 return {slide,theme,helpers,seen,cells};
}
const comparison=()=>({layout:'A01',chart:{categories:['甲','乙','丙'],series:[{name:'贡献',values:[0,12,18]}],unit:'单位：万元',format:'#,##0.0'}});
test('zero is retained, comparison starts at zero, and no last-category winner is invented',()=>{
 const f=fixture();assert.deepEqual(renderDataPage({...f,p:comparison()}),{hasChart:true,hasTable:false});
 const o=f.seen.charts[0].options;assert.deepEqual(o.series[0].values,[0,12,18]);assert.equal(o.yAxis.min,0);assert.deepEqual(o.series[0].points.map(p=>p.fill),['blue','blue','blue']);assert.equal(f.seen.fontCalls,1);
});
test('missing data cannot silently become zero',()=>{
 for(const value of [null,undefined,NaN,Infinity]){const p=comparison();p.chart.series[0].values[1]=value;assert.throws(()=>renderDataPage({...fixture(),p}),/complete finite numbers/u);}
});
test('bars preserve negative values only on an explicit truthful scale',()=>{
 const p=comparison();p.chart.series[0].values=[-4,0,12];assert.throws(()=>renderDataPage({...fixture(),p}),/negative comparisons require/u);
 p.chart.min=-5;const f=fixture();renderDataPage({...f,p});assert.equal(f.seen.charts[0].options.yAxis.min,-5);assert.equal(f.seen.charts[0].options.series[0].values[0],-4);assert.equal(f.seen.charts[0].options.xAxis.tickLabelPosition,'low');
 p.chart.min=1;assert.throws(()=>renderDataPage({...fixture(),p}),/must include zero/u);
});
test('emphasis needs a reason; malformed nested inputs are rejected',()=>{
 const p=comparison();p.chart.emphasisIndex=1;assert.throws(()=>renderDataPage({...fixture(),p}),/emphasisReason/u);
 p.chart.emphasisReason='乙满足执行条件';const f=fixture();renderDataPage({...f,p});assert.deepEqual(f.seen.charts[0].options.series[0].points.map(p=>p.fill),['gray','blue','gray']);
 p.chart.pretendScore=100;assert.throws(()=>renderDataPage({...fixture(),p}),/unknown fields pretendScore/u);
});
test('trend retains chronology and unsmoothed native line semantics',()=>{
 const p={layout:'A03',chart:{categories:['2026-01','2026-02','2026-03'],series:[{name:'续费率',values:[.73,.75,.8]}],unit:'单位：%',format:'0%'}};
 const f=fixture();renderDataPage({...f,p});assert.equal(f.seen.charts[0].type,'line');assert.equal(f.seen.charts[0].options.lineOptions.smooth,false);assert.deepEqual(f.seen.charts[0].options.series[0].values,[.73,.75,.8]);assert.equal(f.seen.charts[0].options.yAxis.max,1);
 p.chart.categories=['2026-02','2026-01','2026-03'];assert.throws(()=>renderDataPage({...fixture(),p}),/must be chronological/u);
});
test('paired trend labels endpoints and preserves both series',()=>{
 const p={layout:'A04',chart:{categories:['1月','2月','3月'],series:[{name:'试点',values:[2,3,4]},{name:'对照',values:[1,2,2]}],unit:'单位：万元'},insights:[{heading:'差异扩大',text:'基于相同观测周期比较'}]};
 const f=fixture();renderDataPage({...f,p});const o=f.seen.charts[0].options;assert.equal(o.hasLegend,true);assert.deepEqual(o.series[0].dataLabelOverrides.map(d=>d.showValue),[true,false,true]);assert.deepEqual(o.series[1].values,[1,2,2]);assert.equal(f.seen.texts.find(t=>t[1]==='analysis-heading-0')[8].color,'text-primary');
});
test('decision table right-aligns numbers, preserves negative display and highlights supplied body row',()=>{
 const p={layout:'A05',headers:['方案','净贡献'],rows:[['甲','−1.2'],['乙','0.0']],numericColumns:[1],highlightRow:1};
 const f=fixture();renderDataPage({...f,p});assert.equal(f.seen.tables[0][2][1][1],'−1.2');assert.equal(f.cells.get('1/1').text.style.alignment,'right');assert.equal(f.cells.get('2/0').fill,'pale');assert.equal(f.cells.get('1/0').fill,'white');
});
test('density and invalid width contracts fail with an actionable error',()=>{
 const p={layout:'A06',headers:['方案','条件'],rows:[['甲','持续'.repeat(60)],['乙','可执行']],insights:[{heading:'决策',text:'按明确条件推进'}]};
 assert.throws(()=>renderDataPage({...fixture(),p}),/shorten, split the page/u);
 p.rows[0][1]='可执行';p.columnWidths=[200,500];assert.throws(()=>renderDataPage({...fixture(),p}),/must sum to 806/u);
 p.columnWidths=[224,582];p.rows[0][1]=null;assert.throws(()=>renderDataPage({...fixture(),p}),/missing or not finite/u);
});
test('mixed-sign automatic trend scale shares a natural step and includes zero as a tick',()=>{
 const p={layout:'A03',chart:{categories:['第1周','第2周','第3周'],series:[{name:'贡献',values:[2400,3000,4560]},{name:'扣成本后',values:[-1240,1360,2920]}],unit:'单位：元',format:'#,##0'}};
 const f=fixture();renderDataPage({...f,p});const o=f.seen.charts[0].options;
 assert.equal(o.yAxis.min,-2000);assert.equal(o.yAxis.max,6000);assert.equal(o.yAxis.majorUnit,2000);assert.equal((0-o.yAxis.min)%o.yAxis.majorUnit,0);assert.equal(o.series[1].dataLabelOverrides[0].position,'top');
 p.chart.min=-1300;p.chart.max=6100;const exact=fixture();renderDataPage({...exact,p});assert.equal(exact.seen.charts[0].options.yAxis.min,-1300);assert.equal(exact.seen.charts[0].options.yAxis.max,6100);
});
test('analysis rail inserts safe line breaks without losing characters or splitting numeric and English tokens',()=>{
 const texts=['枢纽方案低需求净贡献 2,272 元','企业方案 Enterprise 增量贡献 20,160 元；净贡献 8,320 元'];
 for(const text of texts){
  const f=fixture(),p={...comparison(),layout:'A02',insights:[{heading:'判断依据',text}]};renderDataPage({...f,p});
  const wrapped=f.seen.texts.find(t=>t[1]==='analysis-text-0')[2];
  assert.equal(wrapped.replaceAll('\n',''),text);assert.ok(wrapped.split('\n').length<=3);
  for(const token of text.match(/\d+(?:,\d+)*|[A-Za-z]+/gu)||[])assert.ok(wrapped.includes(token),`${token} must be intact`);
  if(text.includes('2,272 元'))assert.ok(wrapped.includes('2,272 元'));
 }
 const p={...comparison(),layout:'A02',insights:[{heading:'判断依据',text:'Verylongunbrokenenterpriseword123456789'}]};assert.throws(()=>renderDataPage({...fixture(),p}),/indivisible number or English token/u);
});

test('explicit auxiliary color reaches paired chart series without changing the primary',()=>{
 const f=fixture();f.theme.C.accent='custom-accent';const p=comparison();p.chart.series.push({name:'参照',values:[2,8,11]});renderDataPage({...f,p});
 assert.deepEqual(f.seen.charts[0].options.series.map(s=>s.fill),['blue','custom-accent']);
});
test('two-line header leaves space for units and the selected marker uses actual row geometry',()=>{
 const f=fixture(),p={layout:'A05',headers:['方案','净贡献\n万元'],rows:[['甲','1'],['乙','2']],numericColumns:[1],highlightRow:1};renderDataPage({...f,p});
 const table=f.seen.tables[0],heights=table[6],marker=f.seen.shapes.find(x=>x[1]==='decision-selected-rule');
 assert.ok(heights[0]>=2*19.5*1.16+14);assert.equal(marker[3],table[4]+heights[0]+heights[1]);assert.equal(marker[5],heights[2]);assert.ok(table[4]+heights.reduce((a,b)=>a+b,0)<=600);
});
test('default numeric chart formats do not expose an optional decimal point on integers',()=>{
 const f=fixture(),p=comparison();delete p.chart.format;renderDataPage({...f,p});assert.equal(f.seen.charts[0].options.series[0].dataLabels.numberFormatCode,'#,##0');
 p.chart.series[0].values=[.5,1.25,2.5];const g=fixture();renderDataPage({...g,p});assert.equal(g.seen.charts[0].options.series[0].dataLabels.numberFormatCode,'#,##0.00');
});
