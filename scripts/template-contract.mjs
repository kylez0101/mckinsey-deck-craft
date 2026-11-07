import fs from 'node:fs';

const freeze = value => {
 if (value && typeof value === 'object') {
  Object.values(value).forEach(freeze);
  Object.freeze(value);
 }
 return value;
};
export const templateContract = freeze(JSON.parse(fs.readFileSync(new URL('../schemas/template-contract.json', import.meta.url), 'utf8')));
const templates = new Map(templateContract.templates.map(template => [template.id, template]));
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const object = (value, path) => {
 if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(path, 'a plain object is required');
};
const unknownFields = (value, fields, path) => {
 const unknown = Object.keys(value).filter(key => !fields.includes(key));
 if (unknown.length) fail(path, `unknown fields ${unknown.join(', ')}; evidence must not be silently discarded`);
};
const textValue = value => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));

export function templateSpec(layout) {
 const template = templates.get(layout);
 if (!template) fail('layout', `Unsupported layout ${layout}`);
 return template;
}
export function allowedSlideFields(layout) {
 return [...Object.keys(templateContract.common_fields), ...Object.keys(templateSpec(layout).fields)];
}
export const allowedDataPageFields = freeze(Object.fromEntries(templateContract.templates.filter(template => template.id.startsWith('A')).map(template => [template.id, Object.keys(template.fields)])));
export function templateDefaults(layout) {
 return Object.fromEntries(Object.entries(templateSpec(layout).fields).filter(([, spec]) => Object.hasOwn(spec, 'default')).map(([key, spec]) => [key, structuredClone(spec.default)]));
}

function validate(value, spec, path) {
 if (value === undefined) {
  if (spec.required) fail(path, 'required field is missing');
  return;
 }
 if (spec.type === 'text') {
  const valid = textValue(value) || (Array.isArray(value) && value.every(textValue));
  if (!valid) fail(path, 'text, a finite number, or an array of text/finite numbers is required');
  if (spec.required && String(Array.isArray(value) ? value.join('\n') : value).trim().length === 0) fail(path, 'non-empty text is required');
  if (String(value).includes('\0')) fail(path, 'null characters are not allowed');
 } else if (spec.type === 'string') {
  if (typeof value !== 'string' || (spec.required && !value.trim())) fail(path, 'a non-empty string is required');
 } else if (spec.type === 'number' || spec.type === 'integer') {
  if (!Number.isFinite(value) || (spec.type === 'integer' && !Number.isInteger(value))) fail(path, `a finite ${spec.type} is required`);
  if (spec.minimum !== undefined && value < spec.minimum) fail(path, `must be at least ${spec.minimum}`);
 } else if (spec.type === 'array') {
  if (!Array.isArray(value)) fail(path, 'an array is required');
  if (value.length < (spec.minItems ?? 0) || value.length > (spec.maxItems ?? Infinity)) fail(path, `needs ${spec.minItems ?? 0}–${spec.maxItems ?? 'unbounded'} items; choose another layout or split the page`);
  for (let index = 0; index < value.length; index++) {
   if (!Object.hasOwn(value, index) || value[index] === undefined) fail(`${path}[${index}]`, 'a sparse or undefined array item is not allowed');
   if (spec.items) validate(value[index], spec.items, `${path}[${index}]`);
  }
 } else if (spec.type === 'object') {
  object(value, path);
  unknownFields(value, Object.keys(spec.fields), path);
  for (const [key, field] of Object.entries(spec.fields)) validate(value[key], field, `${path}.${key}`);
 }
}
function matrix(rows, width, path) {
 rows.forEach((row, index) => {
  if (row.length !== width) fail(`${path}[${index}]`, `retain all ${width} columns`);
 });
}
function indexWithin(value, count, path) {
 if (value !== undefined && (value < 0 || value >= count)) fail(path, `must identify a zero-based index below ${count}`);
}

export function validateSlide(slide, {path = 'slide'} = {}) {
 object(slide, path);
 if (!Object.hasOwn(slide, 'layout')) fail(`${path}.layout`, 'required field is missing');
 const template = templateSpec(slide.layout);
 const fields = {...templateContract.common_fields, ...template.fields};
 unknownFields(slide, Object.keys(fields), path);
 for (const [key, spec] of Object.entries(fields)) validate(slide[key], spec, `${path}.${key}`);
 if (slide.layout === 'T03') {
  if (slide.chart.values.length !== slide.chart.categories.length) fail(`${path}.chart.values`, 'must match all categories');
  indexWithin(slide.chart.emphasisIndex, slide.chart.values.length, `${path}.chart.emphasisIndex`);
 }
 if (['T04', 'A05', 'A06'].includes(slide.layout)) {
  matrix(slide.rows, slide.headers.length, `${path}.rows`);
  indexWithin(slide.highlightColumn, slide.headers.length, `${path}.highlightColumn`);
  indexWithin(slide.highlightRow, slide.rows.length, `${path}.highlightRow`);
  for (const index of slide.numericColumns ?? []) indexWithin(index, slide.headers.length, `${path}.numericColumns`);
  if (slide.columnWidths && slide.columnWidths.length !== slide.headers.length) fail(`${path}.columnWidths`, 'must match all columns');
 }
 if (slide.layout === 'T06') {
  indexWithin(slide.emphasisStep, slide.steps.length, `${path}.emphasisStep`);
  indexWithin(slide.exception?.fromStep, slide.steps.length, `${path}.exception.fromStep`);
  if (slide.releaseConditions) {
   if (slide.steps.length !== template.condition_mode.steps) fail(path, `condition mode needs exactly ${template.condition_mode.steps} execution steps`);
   if (slide.roles?.length || slide.exception) fail(path, 'condition mode cannot combine roles or an exception; put details on a separate page');
  }
 }
 if (slide.layout === 'T08') {
  matrix(slide.rows, slide.periods.length + 1, `${path}.rows`);
  if (slide.phases && slide.phases.reduce((total, phase) => total + phase.span, 0) !== slide.periods.length) fail(`${path}.phases`, 'phase spans must equal period count');
 }
 if (['A01', 'A02', 'A03', 'A04'].includes(slide.layout)) {
  slide.chart.series.forEach((series, index) => {
   if (series.values.length !== slide.chart.categories.length) fail(`${path}.chart.series[${index}].values`, 'must match all categories');
  });
 }
 return slide;
}

export function validateDocument(document) {
 object(document, 'document');
 unknownFields(document, templateContract.document_fields, 'document');
 const mode = document.mode ?? 'deck';
 if (!templateContract.modes.includes(mode)) fail('document.mode', `use ${templateContract.modes.join(', ')}`);
 if (!Array.isArray(document.slides) || !document.slides.length) fail('document.slides', 'a non-empty array is required');
 if (mode === 'single-slide' && document.slides.length !== 1) fail('document.slides', 'single-slide mode needs exactly one slide');
 if (mode !== 'single-slide' && document.slides[0]?.layout !== 'T01') fail('document.slides[0]', 'a full deck starts with cover T01');
 for (const field of ['theme', 'style']) if (document[field] !== undefined) object(document[field], `document.${field}`);
 if (document.name !== undefined && typeof document.name !== 'string') fail('document.name', 'a string is required');
 for (let index = 0; index < document.slides.length; index++) {
  if (!Object.hasOwn(document.slides, index)) fail(`slides[${index}]`, 'a sparse slide array is not allowed');
  validateSlide(document.slides[index], {path: `slides[${index}]`});
 }
 return document;
}
