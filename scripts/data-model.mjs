import {types} from 'node:util';

/** Compile plain source data, calculations and presentation bindings without executing code. */
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
const FORMATS = new Set(['integer', 'number', 'percent', 'money']);
const DEFAULT_DECIMALS = {integer: 0, number: 2, percent: 1, money: 0};
const ARITIES = {add: [2, Infinity], subtract: [2, 2], multiply: [2, Infinity], divide: [2, 2], min: [1, Infinity], max: [1, Infinity], abs: [1, 1], round: [1, 2], gt: [2, 2], gte: [2, 2], lt: [2, 2], lte: [2, 2], eq: [2, 2], and: [2, Infinity], or: [2, Infinity], not: [1, 1], if: [3, 3]};
const own = (value, key) => Object.hasOwn(value, key);
const pathKey = (path, key) => /^[A-Za-z_$][\w$]*$/u.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;

export class DataBindingError extends Error {
  constructor(code, message, path) {
    super(`${path}: ${message}`);
    this.name = 'DataBindingError';
    this.code = code;
    this.path = path;
  }
}

function fail(code, message, path) { throw new DataBindingError(code, message, path); }
function record(value) { return value !== null && !Array.isArray(value) && typeof value === 'object'; }
function exactKeys(value, allowed, required, path) {
  const keys = Object.keys(value);
  const extra = keys.filter(key => !allowed.includes(key));
  if (extra.length || required.some(key => !own(value, key))) {
    fail('MALFORMED_BINDING', `Expected ${required.join(', ')}${extra.length ? `; unexpected keys: ${extra.join(', ')}` : ''}`, path);
  }
}

// Descriptor checks ensure a getter, proxy-like custom prototype, or function is never used as data.
function clonePlain(value, path = 'input', ancestors = new Set(), budget = {nodes: 0}, depth = 0) {
  if (++budget.nodes > 100000 || depth > 128) fail('INPUT_LIMIT', 'Plain data exceeds the supported size/depth', path);
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('NON_FINITE', 'Numbers must be finite', path);
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== 'object') fail('NON_PLAIN_DATA', 'Only plain JSON values are accepted', path);
  if (types.isProxy(value)) fail('NON_PLAIN_DATA', 'Proxy objects are not accepted', path);
  if (ancestors.has(value)) fail('CYCLIC_DATA', 'Cyclic source objects are not accepted', path);
  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
    fail('NON_PLAIN_DATA', 'Custom object prototypes are not accepted', path);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.some(key => typeof key !== 'string')) fail('NON_PLAIN_DATA', 'Symbol keys are not accepted', path);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of keys) {
    if (array && key === 'length') continue;
    if (FORBIDDEN.has(key)) fail('UNSAFE_PATH', `Unsafe key ${key}`, pathKey(path, key));
    if (!descriptors[key].enumerable || !own(descriptors[key], 'value')) fail('NON_PLAIN_DATA', 'Accessors and non-enumerable fields are not accepted', pathKey(path, key));
  }
  if (array && (keys.length !== value.length + 1 || keys.some(key => key !== 'length' && !/^(0|[1-9]\d*)$/u.test(key)))) {
    fail('NON_PLAIN_DATA', 'Arrays must be dense and cannot have named fields', path);
  }
  ancestors.add(value);
  const result = array ? [] : {};
  for (const key of keys) {
    if (array && key === 'length') continue;
    result[key] = clonePlain(descriptors[key].value, array ? `${path}[${key}]` : pathKey(path, key), ancestors, budget, depth + 1);
  }
  ancestors.delete(value);
  return result;
}

function parseRef(ref, path) {
  if (typeof ref !== 'string') fail('INVALID_REFERENCE', 'ref must be a string', path);
  const parts = ref.split('.');
  if (parts.length < 2 || !['data', 'calc'].includes(parts[0]) || parts.some(part => !/^[\p{L}\p{N}_$-]+$/u.test(part))) {
    fail('INVALID_REFERENCE', 'Use an absolute data.x or calc.x path with dot-separated keys/array indices', path);
  }
  if (parts.some(part => FORBIDDEN.has(part))) fail('UNSAFE_PATH', 'Prototype paths are not accepted', path);
  return parts;
}

function finite(value, path) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('NUMBER_REQUIRED', 'A finite number is required; null, strings and booleans are not numbers', path);
  return value;
}
function boolean(value, path) {
  if (typeof value !== 'boolean') fail('BOOLEAN_REQUIRED', 'A boolean condition is required', path);
  return value;
}
function checkedNumber(value, path) {
  if (!Number.isFinite(value)) fail('NON_FINITE', 'The calculation produced a non-finite number', path);
  return Object.is(value, -0) ? 0 : value;
}
function decimalPlaces(value, path) {
  if (!Number.isInteger(value) || value < 0 || value > 8) fail('INVALID_DECIMALS', 'decimals must be an integer from 0 to 8', path);
  return value;
}
function formatNumber(value, format, decimals, path) {
  if (!FORMATS.has(format)) fail('INVALID_FORMAT', `Unknown format ${String(format)}`, path);
  finite(value, path);
  const places = decimals === undefined ? DEFAULT_DECIMALS[format] : decimalPlaces(decimals, path);
  if (format === 'integer' && places !== 0) fail('INVALID_DECIMALS', 'integer format requires decimals: 0; use number for fractional digits', path);
  const display = format === 'percent' ? checkedNumber(value * 100, path) : value;
  const text = new Intl.NumberFormat('en-US', {useGrouping: true, minimumFractionDigits: places, maximumFractionDigits: places}).format(display);
  return text + (format === 'percent' ? '%' : '');
}

function validateExpression(value, path, context) {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return;
  if (!record(value)) fail('MALFORMED_EXPRESSION', 'Expressions must be primitive literals, refs, or op/args objects', path);
  if (own(value, 'ref')) {
    exactKeys(value, ['ref', 'format', 'decimals'], ['ref'], path);
    parseRef(value.ref, path);
    if (context !== 'presentation' && (own(value, 'format') || own(value, 'decimals'))) fail('MALFORMED_BINDING', 'Formatting belongs in presentation bindings, not calculations or assertions', path);
    if (own(value, 'decimals') && !own(value, 'format')) fail('MALFORMED_BINDING', 'decimals requires format', path);
    if (own(value, 'format') && !FORMATS.has(value.format)) fail('INVALID_FORMAT', `Unknown format ${String(value.format)}`, path);
    if (own(value, 'decimals')) {
      decimalPlaces(value.decimals, path);
      if (value.format === 'integer' && value.decimals !== 0) fail('INVALID_DECIMALS', 'integer format requires decimals: 0; use number for fractional digits', path);
    }
    return;
  }
  exactKeys(value, ['op', 'args'], ['op', 'args'], path);
  if (typeof value.op !== 'string' || !Array.isArray(value.args)) fail('MALFORMED_EXPRESSION', 'op must be a string and args must be an array', path);
  if (!own(ARITIES, value.op)) fail('UNKNOWN_OPERATOR', `Unsupported operator ${value.op}`, path);
  if (value.args.length < ARITIES[value.op][0] || value.args.length > ARITIES[value.op][1]) fail('INVALID_ARITY', `Wrong number of arguments for ${value.op}`, path);
  value.args.forEach((argument, index) => validateExpression(argument, `${path}.args[${index}]`, context));
}

function roundDecimal(value, digits, path) {
  // Decimal exponent shifting avoids the common 1.005 * 100 binary rounding error.
  const [coefficient, exponent = '0'] = String(value).split('e');
  const shifted = checkedNumber(Number(`${coefficient}e${Number(exponent) + digits}`), path);
  const [rounded, roundedExponent = '0'] = String(Math.round(shifted)).split('e');
  return checkedNumber(Number(`${rounded}e${Number(roundedExponent) - digits}`), path);
}

/**
 * @param {{data: object, calculated?: object, presentation: object, assertions?: Array<{condition: unknown, message: string}>}} input
 * @returns {{document: object, values: object, audit: object}}
 */
export function compileDocument(input) {
  const source = clonePlain(input);
  if (!record(source)) fail('INVALID_INPUT', 'Expected an object', 'input');
  exactKeys(source, ['data', 'calculated', 'presentation', 'assertions'], ['data', 'presentation'], 'input');
  const {data, presentation} = source;
  const calculated = own(source, 'calculated') ? source.calculated : {};
  const assertions = own(source, 'assertions') ? source.assertions : [];
  if (!record(data) || !record(calculated) || !record(presentation) || !Array.isArray(assertions)) {
    fail('INVALID_INPUT', 'data, calculated and presentation must be objects; assertions must be an array', 'input');
  }
  for (const name of Object.keys(calculated)) {
    if (!/^[\p{L}\p{N}_$-]+$/u.test(name)) fail('INVALID_CALCULATION_NAME', 'Calculation names must be single safe path keys', pathKey('calculated', name));
  }
  const values = {};
  const dependencies = Object.fromEntries(Object.keys(calculated).map(name => [name, []]));
  const bindings = [];
  const stack = [];
  const assertionResults = [];

  function resolveRef(binding, path, context, calculation) {
    exactKeys(binding, ['ref', 'format', 'decimals'], ['ref'], path);
    if (context !== 'presentation' && (own(binding, 'format') || own(binding, 'decimals'))) fail('MALFORMED_BINDING', 'Formatting belongs in presentation bindings, not calculations or assertions', path);
    if (own(binding, 'decimals') && !own(binding, 'format')) fail('MALFORMED_BINDING', 'decimals requires format', path);
    const parts = parseRef(binding.ref, path);
    if (calculation && !dependencies[calculation].includes(binding.ref)) dependencies[calculation].push(binding.ref);
    let value;
    let remainder;
    if (parts[0] === 'calc') {
      value = evaluateCalculation(parts[1]);
      remainder = parts.slice(2);
    } else {
      value = data;
      remainder = parts.slice(1);
    }
    for (const key of remainder) {
      if (value === null || typeof value !== 'object' || !own(value, key) || Array.isArray(value) && !/^(0|[1-9]\d*)$/u.test(key)) {
        fail('UNKNOWN_REFERENCE', `Unknown reference ${binding.ref}`, path);
      }
      value = value[key];
    }
    const formatted = own(binding, 'format') ? formatNumber(value, binding.format, binding.decimals, path) : clonePlain(value, path);
    bindings.push({path, ref: binding.ref, format: binding.format ?? null, decimals: own(binding, 'format') ? binding.decimals ?? DEFAULT_DECIMALS[binding.format] : null, context, calculation: calculation ?? null});
    return formatted;
  }

  function expression(value, path, context, calculation) {
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
    if (!record(value)) fail('MALFORMED_EXPRESSION', 'Expressions must be primitive literals, refs, or op/args objects', path);
    if (own(value, 'ref')) return resolveRef(value, path, context, calculation);
    exactKeys(value, ['op', 'args'], ['op', 'args'], path);
    if (typeof value.op !== 'string' || !Array.isArray(value.args)) fail('MALFORMED_EXPRESSION', 'op must be a string and args must be an array', path);
    const {op, args} = value;
    if (!own(ARITIES, op)) fail('UNKNOWN_OPERATOR', `Unsupported operator ${op}`, path);
    if (args.length < ARITIES[op][0] || args.length > ARITIES[op][1]) fail('INVALID_ARITY', `Wrong number of arguments for ${op}`, path);
    const evaluate = index => expression(args[index], `${path}.args[${index}]`, context, calculation);
    if (op === 'if') return evaluate(boolean(evaluate(0), `${path}.args[0]`) ? 1 : 2);
    const evaluated = args.map((_, index) => evaluate(index));
    if (op === 'eq') {
      if (evaluated.some(item => item !== null && typeof item === 'object')) fail('PRIMITIVE_REQUIRED', 'eq compares primitive values only', path);
      return evaluated[0] === evaluated[1];
    }
    if (['and', 'or', 'not'].includes(op)) {
      evaluated.forEach((item, index) => boolean(item, `${path}.args[${index}]`));
      if (op === 'not') return !evaluated[0];
      return op === 'and' ? evaluated.every(item => item) : evaluated.some(item => item);
    }
    const numbers = evaluated.map((item, index) => finite(item, `${path}.args[${index}]`));
    if (op === 'gt') return numbers[0] > numbers[1];
    if (op === 'gte') return numbers[0] >= numbers[1];
    if (op === 'lt') return numbers[0] < numbers[1];
    if (op === 'lte') return numbers[0] <= numbers[1];
    let result;
    if (op === 'add') result = numbers.reduce((sum, item) => sum + item, 0);
    if (op === 'subtract') result = numbers[0] - numbers[1];
    if (op === 'multiply') result = numbers.reduce((product, item) => product * item, 1);
    if (op === 'divide') {
      if (numbers[1] === 0) fail('DIVISION_BY_ZERO', 'Division by zero is not allowed', path);
      result = numbers[0] / numbers[1];
    }
    if (op === 'min') result = Math.min(...numbers);
    if (op === 'max') result = Math.max(...numbers);
    if (op === 'abs') result = Math.abs(numbers[0]);
    if (op === 'round') {
      const digits = numbers.length === 1 ? 0 : decimalPlaces(numbers[1], `${path}.args[1]`);
      result = roundDecimal(numbers[0], digits, path);
    }
    return checkedNumber(result, path);
  }

  function evaluateCalculation(name) {
    if (!own(calculated, name)) fail('UNKNOWN_REFERENCE', `Unknown calculation calc.${name}`, `calculated.${name}`);
    if (own(values, name)) return values[name];
    if (stack.includes(name)) fail('CALCULATION_CYCLE', `Calculation cycle: ${[...stack, name].join(' → ')}`, `calculated.${name}`);
    if (stack.length >= 128) fail('INPUT_LIMIT', 'Calculation dependency depth exceeds 128', `calculated.${name}`);
    stack.push(name);
    values[name] = clonePlain(expression(calculated[name], pathKey('calculated', name), 'calculated', name), pathKey('values', name));
    stack.pop();
    return values[name];
  }

  function resolvePresentation(value, path) {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item, index) => resolvePresentation(item, `${path}[${index}]`));
    if (own(value, 'ref')) {
      validateExpression(value, path, 'presentation');
      return resolveRef(value, path, 'presentation');
    }
    if (own(value, 'op') || own(value, 'args')) {
      validateExpression(value, path, 'presentation');
      return expression(value, path, 'presentation');
    }
    if (Array.isArray(value.text) && Object.keys(value).length === 1) {
      return value.text.map((part, index) => {
        if (record(part)) validateExpression(part, `${path}.text[${index}]`, 'presentation');
        const resolved = record(part) ? expression(part, `${path}.text[${index}]`, 'presentation') : part;
        if (!['string', 'number', 'boolean'].includes(typeof resolved)) fail('TEXT_VALUE_REQUIRED', 'Text parts must resolve to strings, finite numbers or booleans; handle null explicitly with if', `${path}.text[${index}]`);
        return String(resolved);
      }).join('');
    }
    // A text-array binding carrying other fields is ambiguous and must be rewritten explicitly.
    if (Array.isArray(value.text) && value.text.some(part => record(part) && (own(part, 'ref') || own(part, 'op')))) {
      fail('MALFORMED_BINDING', 'A text binding must contain only the text array', path);
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolvePresentation(item, pathKey(path, key))]));
  }

  function assertResolved(value, path) {
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach((item, index) => assertResolved(item, `${path}[${index}]`));
    if (own(value, 'ref') || own(value, 'op') || own(value, 'args') || Array.isArray(value.text) && Object.keys(value).length === 1) {
      fail('UNRESOLVED_BINDING', 'A source reference returned an unresolved binding; keep source data literal and put bindings in presentation/calculated', path);
    }
    Object.entries(value).forEach(([key, item]) => assertResolved(item, pathKey(path, key)));
  }

  Object.entries(calculated).forEach(([name, value]) => validateExpression(value, pathKey('calculated', name), 'calculated'));
  Object.keys(calculated).forEach(evaluateCalculation);
  assertions.forEach((assertion, index) => {
    const path = `assertions[${index}]`;
    if (!record(assertion)) fail('INVALID_ASSERTION', 'An assertion must be an object', path);
    exactKeys(assertion, ['condition', 'message'], ['condition', 'message'], path);
    if (typeof assertion.message !== 'string' || !assertion.message.trim()) fail('INVALID_ASSERTION', 'An assertion needs a non-empty message', path);
    validateExpression(assertion.condition, `${path}.condition`, 'assertion');
    const passed = boolean(expression(assertion.condition, `${path}.condition`, 'assertion'), `${path}.condition`);
    if (!passed) fail('ASSERTION_FAILED', assertion.message, path);
    assertionResults.push({path, message: assertion.message, passed});
  });
  const document = resolvePresentation(presentation, 'presentation');
  assertResolved(document, 'presentation');
  return {document, values: clonePlain(values, 'values'), audit: {version: 1, sourceData: clonePlain(data, 'data'), dependencies, bindings, assertions: assertionResults, calculations: Object.entries(calculated).map(([name, expr]) => ({name, expression: expr, value: clonePlain(values[name], `values.${name}`), dependencies: [...dependencies[name]]}))}};
}
