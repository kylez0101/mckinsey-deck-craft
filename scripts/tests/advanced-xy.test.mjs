import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {addRangeChart, addDumbbellChart, addInvestmentChart} from '../advanced-xy.mjs';
import {numericScale} from '../chart-scale.mjs';

const rect = {left: 0, top: 0, width: 800, height: 400};
function capture() {
  let config;
  return {slide: {charts: {add(type, value) {assert.equal(type, 'scatter'); config = value; return value;}}}, get config() {return config;}};
}
const option = overrides => ({id: 'A', name: '方案甲', low: 0.1, base: 0.3, high: 0.4, cost: 0.2, external: 0, ...overrides});

test('fractional investment values retain their precision on a proportionate scale', () => {
  const c = capture();
  addInvestmentChart(c.slide, rect, {options: [option()]});
  assert.deepEqual(c.config.series[0].xValues, [0.2]);
  assert.deepEqual(c.config.series[0].values, [0.3]);
  assert.ok(c.config.xAxis.max <= 1);
  assert.ok(c.config.yAxis.max <= 1);
  const label = c.config.series[0].dataLabelOverrides[0].text;
  assert.match(label, /0\.2/);
  assert.match(label, /0\.3/);
  assert.doesNotMatch(label, /周末|外援/);
});

test('range axes cover the baseline even when scenario outcomes are nonmonotonic', () => {
  const c = capture();
  addRangeChart(c.slide, rect, {options: [option({low: 10, base: 10000, high: 20})]});
  assert.ok(c.config.xAxis.min <= 10);
  assert.ok(c.config.xAxis.max >= 10000);
  assert.deepEqual(c.config.series[0].xValues, [10, 20]);
  assert.deepEqual(c.config.series[1].xValues, [10000]);
});

test('range endpoints have annotation space on both sides while retaining the zero reference', () => {
  for (const outcomes of [{low: 10, base: 10000, high: 20}, {low: 0, base: 500, high: 1000}, {low: -1000, base: -500, high: 0}]) {
    const c = capture();
    addRangeChart(c.slide, rect, {options: [option(outcomes)]});
    const {min, max} = c.config.xAxis, width = max - min;
    assert.ok(min < Math.min(0, outcomes.low, outcomes.base, outcomes.high));
    assert.ok(max > Math.max(0, outcomes.low, outcomes.base, outcomes.high));
    assert.ok((outcomes.low - min) / width >= 0.08);
    assert.ok((max - outcomes.high) / width >= 0.08);
    assert.equal(c.config.series[0].dataLabelOverrides[0].position, 'left');
    assert.deepEqual(c.config.series[0].xValues, [outcomes.low, outcomes.high]);
  }
});

test('explicit range bounds remain exact when the caller allocates annotation space', () => {
  const c = capture();
  addRangeChart(c.slide, rect, {options: [option({low: 10, base: 10000, high: 20})], axes: {x: {min: -4000, max: 14000, majorUnit: 2000}}});
  assert.equal(c.config.xAxis.min, -4000);
  assert.equal(c.config.xAxis.max, 14000);
  assert.equal(c.config.xAxis.majorUnit, 2000);
});

test('small numeric values are not rounded to currency cents before charting', () => {
  const c = capture();
  addInvestmentChart(c.slide, rect, {options: [option({cost: 0.002, base: 0.003})]});
  assert.deepEqual(c.config.series[0].xValues, [0.002]);
  assert.deepEqual(c.config.series[0].values, [0.003]);
  assert.ok(c.config.xAxis.max < 0.02);
});

test('chart helper imports without private runtime environment variables', () => {
  const env = {...process.env};
  delete env.DECK_PRESENTATIONS_SKILL_DIR;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(new URL('../advanced-xy.mjs', import.meta.url).href)})`], {env, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
});

test('each scatter axis has explicit units, precision and labels without changing point values', () => {
  const c = capture();
  addInvestmentChart(c.slide, rect, {
    options: [option({cost: 0.234, base: 0.345})],
    axes: {x: {unit: '万元', decimals: 2, label: '成本'}, y: {unit: '%', decimals: 3, label: '比例'}},
    externalLabel: '协作', externalUnit: '人月',
  });
  assert.deepEqual(c.config.series[0].xValues, [0.234]);
  assert.deepEqual(c.config.series[0].values, [0.345]);
  assert.equal(c.config.xAxis.numberFormatCode, '#,##0.00" 万元"');
  assert.equal(c.config.yAxis.numberFormatCode, '#,##0.000" %"');
  assert.equal(c.config.series[0].dataLabelOverrides[0].text, 'A 方案甲\n成本 0.23 万元 / 比例 0.345 %\n协作 0 人月');
});

test('range values may decrease or peak between named input scenarios', () => {
  const c = capture();
  addRangeChart(c.slide, rect, {options: [option({low: 5, base: -3, high: -7})], display: {unit: '万元', decimals: 1}, labels: {base: '常态', range: '需求情景'}});
  assert.ok(c.config.xAxis.min <= -7);
  assert.ok(c.config.xAxis.max >= 5);
  assert.deepEqual(c.config.series[0].xValues, [5, -7]);
  assert.deepEqual(c.config.series[1].xValues, [-3]);
  assert.match(c.config.series[1].dataLabelOverrides[0].text, /-3\.0 万元 常态/);
});

test('dumbbell keeps negative and decimal values with explicit comparison labels', () => {
  const c = capture();
  addDumbbellChart(c.slide, rect, {hourly: [{name: '区域甲', net: -0.25, gross: 0.75}], netLabel: '调整后', grossLabel: '调整前', display: {unit: '分', decimals: 2}});
  assert.deepEqual(c.config.series[0].xValues, [-0.25, 0.75]);
  assert.ok(c.config.xAxis.min <= -0.25 && c.config.xAxis.max >= 0.75);
  assert.match(c.config.series[0].dataLabelOverrides[0].text, /调整后 -0\.25 分/);
});

test('integer bookstore input remains valid while units are explicit rather than inferred', () => {
  const c = capture();
  addInvestmentChart(c.slide, rect, {options: [option({low: 2272, base: 8320, high: 14368, cost: 11840})], display: {unit: '元'}, externalLabel: '外援', externalUnit: '人时/周末'});
  assert.deepEqual(c.config.series[0].xValues, [11840]);
  assert.deepEqual(c.config.series[0].values, [8320]);
  assert.ok(c.config.xAxis.max >= 11840 && c.config.xAxis.max < 25000);
  assert.match(c.config.series[0].dataLabelOverrides[0].text, /11,840 元/);
  assert.match(c.config.series[0].dataLabelOverrides[0].text, /外援 0 人时\/周末/);
});

test('runtime font adapter is explicit and receives the configured typeface', () => {
  const c = capture(), calls = [];
  addInvestmentChart(c.slide, rect, {options: [option()]}, {fontFamily: 'Aptos', fontSize: 24, applyChartFont(chart, config) {calls.push({chart, config});}});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].chart, c.config);
  assert.deepEqual(calls[0].config, {fontFamily: 'Aptos'});
  assert.equal(c.config.series[0].dataLabelOverrides[0].textStyle.typeface, 'Aptos');
  assert.equal(c.config.series[0].dataLabelOverrides[0].textStyle.fontSize, 24);
});

test('numeric domains work across zeros, signs and magnitudes without hiding data', () => {
  for (const values of [[0, 0], [-3, -1], [-1, 2], [0.002, 0.003], [1e-14, 3e-14], [1e12, 3e12]]) {
    const scale = numericScale(values);
    assert.ok(scale.min <= Math.min(...values, 0));
    assert.ok(scale.max >= Math.max(...values, 0));
    assert.ok(scale.max > scale.min);
    assert.ok(scale.majorUnit > 0);
  }
  assert.deepEqual(numericScale([1, 2], {min: 0, max: 3, majorUnit: 0.5}), {min: 0, max: 3, majorUnit: 0.5});
  const focused = numericScale([10, 12], {includeZero: false});
  assert.ok(focused.min > 0 && focused.min <= 10 && focused.max >= 12);
});

test('unknown, nonfinite and clipped values fail before a chart is added', () => {
  for (const cost of [null, undefined, NaN, Infinity]) {
    const c = capture();
    assert.throws(() => addInvestmentChart(c.slide, rect, {options: [option({cost})]}), /finite/);
    assert.equal(c.config, undefined);
  }
  const c = capture();
  assert.throws(() => addRangeChart(c.slide, rect, {options: [option()], axes: {x: {max: 0.25}}}), /cover every value/);
  assert.equal(c.config, undefined);
  assert.throws(() => numericScale([1], {majorUnit: 0}), /positive finite/);
  assert.throws(() => numericScale([]), /non-empty finite/);
  assert.throws(() => addInvestmentChart(c.slide, rect, {options: [option()], display: {decimals: 13}}), /0 to 12/);
});

test('tiny default labels use scientific notation instead of becoming zero', () => {
  const c = capture();
  addInvestmentChart(c.slide, rect, {options: [option({cost: 2e-14, base: 3e-14})]});
  assert.match(c.config.series[0].dataLabelOverrides[0].text, /2E-14/);
  assert.equal(c.config.xAxis.numberFormatCode, '0.######E+00');
});

test('ratio percentages use the same scaling in axis ticks and direct labels', () => {
  const c = capture();
  addInvestmentChart(c.slide, rect, {options: [option()], axes: {y: {percent: true, decimals: 1, label: '变化'}}});
  assert.equal(c.config.yAxis.numberFormatCode, '#,##0.0%');
  assert.match(c.config.series[0].dataLabelOverrides[0].text, /变化 30\.0%/);
  assert.deepEqual(c.config.series[0].values, [0.3]);
});
