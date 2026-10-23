import test from 'node:test';
import assert from 'node:assert/strict';
import {compileDocument, DataBindingError} from '../data-model.mjs';

const ref = (path, format, decimals) => ({ref: path, ...(format === undefined ? {} : {format}), ...(decimals === undefined ? {} : {decimals})});
const op = (name, ...args) => ({op: name, args});
const minimal = (calculated = {}, presentation = {}, data = {}) => ({data, calculated, presentation});
const errorCode = (fn, code) => assert.throws(fn, error => error instanceof DataBindingError && error.code === code);

function bookstore() {
  return {
    data: {
      gross: 20160, costs: {labor: 6480, security: 3360, setup: 2000}, budget: 35000,
      alternative: {net: 8964, spend: 16380}, categories: ['净贡献', '总支出'],
      sourceLedger: [{source: '书店六周试点示意测算', status: 'synthetic', unit: '元', date: '2026-10-24'}],
    },
    calculated: {
      spend: op('add', ref('data.costs.labor'), ref('data.costs.security'), ref('data.costs.setup')),
      net: op('subtract', ref('data.gross'), ref('calc.spend')),
      headroom: op('subtract', ref('data.budget'), ref('calc.spend')),
      roi: op('divide', ref('calc.net'), ref('calc.spend')),
      alternativeRoi: op('divide', ref('data.alternative.net'), ref('data.alternative.spend')),
      better: op('gt', ref('calc.roi'), ref('calc.alternativeRoi')),
      recommendation: op('if', op('lt', ref('calc.headroom'), 0), '暂停：支出超过预算', op('if', ref('calc.better'), '先试点两家枢纽店', '切换至全店延长一小时')),
    },
    presentation: {
      slides: [{
        title: ref('calc.recommendation'),
        subtitle: {text: ['净贡献 ', ref('calc.net', 'integer'), ' 元；支出 ', ref('calc.spend', 'money'), ' 元']},
        chart: {categories: ref('data.categories'), values: [ref('calc.net'), ref('calc.spend')]},
        table: [['净贡献', ref('calc.net', 'money')], ['预算余量', ref('calc.headroom', 'money')]],
        notes: {text: ['推荐：', ref('calc.recommendation'), '；贡献/支出 ', ref('calc.roi', 'percent', 1)]},
      }],
    },
    assertions: [{condition: op('eq', op('add', ref('calc.net'), ref('calc.spend')), ref('data.gross')), message: '贡献桥必须闭合'}],
  };
}

test('one cost edit updates native numeric inputs, labels, table, commentary and audit together', () => {
  const input = bookstore();
  const before = compileDocument(input);
  assert.equal(before.values.spend, 11840);
  assert.equal(before.values.net, 8320);
  assert.equal(before.values.headroom, 23160);
  input.data.costs.labor = 7200;
  const after = compileDocument(input);
  assert.equal(after.values.spend, 12560);
  assert.equal(after.values.net, 7600);
  assert.equal(after.values.headroom, 22440);
  const slide = after.document.slides[0];
  assert.deepEqual(slide.chart.values, [7600, 12560]);
  assert.deepEqual(slide.table, [['净贡献', '7,600'], ['预算余量', '22,440']]);
  assert.equal(slide.subtitle, '净贡献 7,600 元；支出 12,560 元');
  assert.match(slide.notes, /60\.5%/u);
  assert.equal(slide.title, '先试点两家枢纽店');
  assert.deepEqual(after.audit.dependencies.net, ['data.gross', 'calc.spend']);
  assert.equal(after.audit.sourceData.costs.labor, 7200);
  assert.deepEqual(after.audit.sourceData.sourceLedger, input.data.sourceLedger);
  assert.deepEqual(after.audit.assertions, [{path: 'assertions[0]', message: '贡献桥必须闭合', passed: true}]);
  assert.ok(after.audit.bindings.some(binding => binding.path === 'presentation.slides[0].subtitle.text[1]' && binding.ref === 'calc.net' && binding.format === 'integer' && binding.decimals === 0));
});

test('ranking and budget changes regenerate the title and recommendation, rather than only substitute numbers', () => {
  const input = bookstore();
  input.data.costs.labor = 12000;
  const rankingFlip = compileDocument(input);
  assert.equal(rankingFlip.values.net, 2800);
  assert.equal(rankingFlip.values.better, false);
  assert.equal(rankingFlip.document.slides[0].title, '切换至全店延长一小时');
  assert.match(rankingFlip.document.slides[0].notes, /推荐：切换至全店延长一小时/u);
  input.data.budget = 17000;
  const budgetFlip = compileDocument(input);
  assert.equal(budgetFlip.values.headroom, -360);
  assert.equal(budgetFlip.document.slides[0].title, '暂停：支出超过预算');
});

test('zero is a real value; null remains unknown and a guarded if can display an explicit unknown label', () => {
  for (const [value, expected] of [[0, '0 元'], [null, '待核实']]) {
    const unknown = op('eq', ref('data.value'), null);
    const result = compileDocument(minimal({}, {label: {text: [op('if', unknown, '待核实', ref('data.value', 'money')), op('if', unknown, '', ' 元')]}}, {value}));
    assert.equal(result.document.label, expected);
  }
});

test('null does not become zero in arithmetic, numeric format, boolean condition or text concatenation', () => {
  errorCode(() => compileDocument(minimal({n: op('add', ref('data.value'), 1)}, {}, {value: null})), 'NUMBER_REQUIRED');
  errorCode(() => compileDocument(minimal({}, {n: ref('data.value', 'number')}, {value: null})), 'NUMBER_REQUIRED');
  errorCode(() => compileDocument(minimal({n: op('if', ref('data.value'), 1, 2)}, {}, {value: null})), 'BOOLEAN_REQUIRED');
  errorCode(() => compileDocument(minimal({}, {n: {text: ['值：', ref('data.value')]}}, {value: null})), 'TEXT_VALUE_REQUIRED');
});

test('raw references preserve numeric, boolean, null, array and object types', () => {
  const data = {zero: 0, no: false, unknown: null, labels: ['甲', '乙'], nested: {amount: 8}};
  const result = compileDocument(minimal({labels: ref('data.labels')}, {zero: ref('data.zero'), no: ref('data.no'), unknown: ref('data.unknown'), labels: ref('calc.labels'), nested: ref('data.nested')}, data));
  assert.deepEqual(result.document, data);
  assert.notEqual(result.document.labels, data.labels);
  assert.notEqual(result.document.nested, data.nested);
});

test('if evaluates only the selected branch, including guarded absent data and cycles', () => {
  const result = compileDocument(minimal({safe: op('if', true, 7, ref('calc.safe')), unknown: op('if', false, ref('data.missing'), null)}, {value: op('if', true, '已有证据', ref('data.missing'))}));
  assert.deepEqual(result.values, {safe: 7, unknown: null});
  assert.equal(result.document.value, '已有证据');
  assert.deepEqual(result.audit.dependencies.safe, []);
  assert.ok(!result.audit.bindings.some(binding => binding.ref === 'data.missing'));
  errorCode(() => compileDocument(minimal({unsafe: op('if', true, 7, op('execute', 'malformed inactive branch'))})), 'UNKNOWN_OPERATOR');
});

test('basic math, rounding, comparison and strict boolean operators are deterministic', () => {
  const calculated = {
    sum: op('add', 2, 3, 5), difference: op('subtract', 3, 5), product: op('multiply', 2, 3, 5), quotient: op('divide', 10, 4),
    minimum: op('min', 3, -1, 2), maximum: op('max', 3, -1, 2), absolute: op('abs', -2), rounded: op('round', 123.4567, 2),
    greater: op('gt', 3, 2), greaterEqual: op('gte', 3, 3), lesser: op('lt', 2, 3), lesserEqual: op('lte', 3, 3),
    strictEqual: op('eq', 0, false), all: op('and', true, true), any: op('or', false, true), opposite: op('not', false),
  };
  assert.deepEqual(compileDocument(minimal(calculated)).values, {sum: 10, difference: -2, product: 30, quotient: 2.5, minimum: -1, maximum: 3, absolute: 2, rounded: 123.46, greater: true, greaterEqual: true, lesser: true, lesserEqual: true, strictEqual: false, all: true, any: true, opposite: true});
  assert.equal(compileDocument(minimal({rounded: op('round', 1.005, 2)})).values.rounded, 1.01);
  for (const name of ['and', 'or']) errorCode(() => compileDocument(minimal({n: op(name, true, 1)})), 'BOOLEAN_REQUIRED');
  errorCode(() => compileDocument(minimal({n: op('not', 0)})), 'BOOLEAN_REQUIRED');
  errorCode(() => compileDocument(minimal({n: op('gte', '3', 2)})), 'NUMBER_REQUIRED');
});

test('numeric formats have explicit decimal precision and no implied currency symbol', () => {
  const result = compileDocument(minimal({}, {integer: ref('data.x', 'integer'), number: ref('data.x', 'number', 2), percent: ref('data.ratio', 'percent', 2), money: ref('data.x', 'money'), raw: ref('data.x'), precise: ref('data.ratio', 'number', 8)}, {x: 1234.5, ratio: 0.123456789}));
  assert.deepEqual(result.document, {integer: '1,235', number: '1,234.50', percent: '12.35%', money: '1,235', raw: 1234.5, precise: '0.12345679'});
  errorCode(() => compileDocument(minimal({}, {value: ref('data.x', 'money', 9)}, {x: 1})), 'INVALID_DECIMALS');
  errorCode(() => compileDocument(minimal({}, {value: ref('data.x', 'integer', 2)}, {x: 1})), 'INVALID_DECIMALS');
  errorCode(() => compileDocument(minimal({}, {value: ref('data.x', 'currency')}, {x: 1})), 'INVALID_FORMAT');
});

test('missing references, calculation cycles and malformed binding/operator syntax fail closed', () => {
  errorCode(() => compileDocument(minimal({}, {x: ref('data.absent')})), 'UNKNOWN_REFERENCE');
  errorCode(() => compileDocument(minimal({}, {x: ref('calc.absent')})), 'UNKNOWN_REFERENCE');
  errorCode(() => compileDocument(minimal({a: ref('calc.b'), b: ref('calc.a')})), 'CALCULATION_CYCLE');
  errorCode(() => compileDocument(minimal({a: op('sqrt', 4)})), 'UNKNOWN_OPERATOR');
  errorCode(() => compileDocument(minimal({a: op('divide', 4)})), 'INVALID_ARITY');
  errorCode(() => compileDocument(minimal({}, {x: {ref: 'data.x', fallback: 0}}, {x: 1})), 'MALFORMED_BINDING');
  errorCode(() => compileDocument(minimal({}, {x: {ref: 'data.x', decimals: 2}}, {x: 1})), 'MALFORMED_BINDING');
  errorCode(() => compileDocument(minimal({}, {x: {op: 'add', args: [1, 2], execute: true}})), 'MALFORMED_BINDING');
  errorCode(() => compileDocument(minimal({}, {x: {text: ['值', ref('data.x')], extra: true}}, {x: 1})), 'MALFORMED_BINDING');
  errorCode(() => compileDocument(minimal({}, {x: ref('data.nested')}, {nested: {ref: 'data.x'}, x: 1})), 'UNRESOLVED_BINDING');
});

test('source and expression numbers must stay finite, and division by zero never leaks into a deck', () => {
  errorCode(() => compileDocument(minimal({}, {}, {n: Infinity})), 'NON_FINITE');
  errorCode(() => compileDocument(minimal({n: op('multiply', 1e308, 10)})), 'NON_FINITE');
  errorCode(() => compileDocument(minimal({n: op('divide', 1, 0)})), 'DIVISION_BY_ZERO');
  errorCode(() => compileDocument(minimal({n: op('divide', 1, -0)})), 'DIVISION_BY_ZERO');
  errorCode(() => compileDocument(minimal({n: op('add', '1', 2)})), 'NUMBER_REQUIRED');
});

test('prototype paths, code-shaped operators and non-plain inputs are rejected without running getters/proxies', () => {
  let ran = false;
  const accessor = {};
  Object.defineProperty(accessor, 'amount', {enumerable: true, get() { ran = true; return 1; }});
  errorCode(() => compileDocument(minimal({}, {}, accessor)), 'NON_PLAIN_DATA');
  assert.equal(ran, false);
  const proxy = new Proxy({}, {getPrototypeOf() { ran = true; return Object.prototype; }});
  errorCode(() => compileDocument(minimal({}, {}, proxy)), 'NON_PLAIN_DATA');
  assert.equal(ran, false);
  errorCode(() => compileDocument(minimal({}, {x: ref('data.__proto__.polluted')})), 'UNSAFE_PATH');
  errorCode(() => compileDocument(minimal({}, {x: ref('data.constructor.name')})), 'UNSAFE_PATH');
  errorCode(() => compileDocument(minimal({}, {x: ref('data.x;process.exit()')})), 'INVALID_REFERENCE');
  errorCode(() => compileDocument(minimal({x: {op: 'process.exit()', args: []}})), 'UNKNOWN_OPERATOR');
  errorCode(() => compileDocument(minimal({}, {}, JSON.parse('{"__proto__":{"polluted":true}}'))), 'UNSAFE_PATH');
  errorCode(() => compileDocument(minimal({}, {}, {fn() { ran = true; }})), 'NON_PLAIN_DATA');
  errorCode(() => compileDocument(minimal({}, {}, {date: new Date()})), 'NON_PLAIN_DATA');
  assert.equal(ran, false);
  assert.equal({}.polluted, undefined);
  const literal = 'process.exit(); $(touch /tmp/never)';
  assert.equal(compileDocument(minimal({}, {literal})).document.literal, literal);
});

test('assertions run before output and reject false or non-boolean business conditions', () => {
  const input = bookstore();
  input.assertions.push({condition: false, message: '预算假设未核实'});
  errorCode(() => compileDocument(input), 'ASSERTION_FAILED');
  input.assertions[1].condition = 1;
  errorCode(() => compileDocument(input), 'BOOLEAN_REQUIRED');
});

test('compiler and returned objects do not mutate source data, calculations or source ledger', () => {
  const input = bookstore();
  const original = JSON.stringify(input);
  const result = compileDocument(input);
  assert.equal(JSON.stringify(input), original);
  result.document.slides[0].chart.categories[0] = '改名';
  result.audit.sourceData.sourceLedger[0].status = 'changed';
  result.audit.calculations[0].expression.args[0].ref = 'data.changed';
  assert.equal(JSON.stringify(input), original);
  assert.equal(compileDocument(input).document.slides[0].chart.categories[0], '净贡献');
});

test('arrays use explicit canonical indices and all source data must be dense, acyclic plain values', () => {
  assert.equal(compileDocument(minimal({}, {n: ref('data.rows.0.amount')}, {rows: [{amount: 0}]})).document.n, 0);
  errorCode(() => compileDocument(minimal({}, {n: ref('data.rows.01')}, {rows: [1, 2]})), 'UNKNOWN_REFERENCE');
  errorCode(() => compileDocument(minimal({}, {}, {missing: undefined})), 'NON_PLAIN_DATA');
  errorCode(() => compileDocument(minimal({}, {}, {sparse: Array(2)})), 'NON_PLAIN_DATA');
  const cycle = {}; cycle.self = cycle;
  errorCode(() => compileDocument(minimal({}, {}, cycle)), 'CYCLIC_DATA');
  errorCode(() => compileDocument({data: {}, calculated: null, presentation: {}}), 'INVALID_INPUT');
});
