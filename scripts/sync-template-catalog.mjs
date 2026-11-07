import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {templateContract} from './template-contract.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const start = '<!-- TEMPLATE-CONTRACT:START -->';
const end = '<!-- TEMPLATE-CONTRACT:END -->';
function capacities(fields, prefix = '') {
 const result = {};
 for (const [name, spec] of Object.entries(fields)) {
  const key = `${prefix}${name}`;
  if (spec.minItems !== undefined || spec.maxItems !== undefined) result[key] = [spec.minItems ?? 0, spec.maxItems ?? null];
  if (spec.fields) Object.assign(result, capacities(spec.fields, `${key}.`));
 }
 return result;
}
export function generatedCatalog() {
 const {version, canvas_px, fonts, cover, presentation, input_example, builder} = templateContract;
 const templates = templateContract.templates.map(({fields, ...metadata}) => ({
  ...metadata,
  inputs: Object.entries(fields).map(([key, spec]) => `${key}${spec.required ? '' : '?'}`),
  capacity: capacities(fields),
  defaults: Object.fromEntries(Object.entries(fields)
   .filter(([, spec]) => Object.hasOwn(spec, 'default'))
   .map(([key, spec]) => [key, spec.default])),
 }));
 return {version, schema_source: 'schemas/template-contract.json', canvas_px, fonts, cover,
  presentation, input_example, builder,
  common_inputs: Object.entries(templateContract.common_fields).map(([key, spec]) => `${key}${spec.required ? '' : '?'}`),
  templates,
 };
}
export function generatedTable(catalog = generatedCatalog()) {
 const lines = [start, '| ID | 页面任务 | 专属字段（? 为可选） | 容量（数组项数） |', '|---|---|---|---|'];
 for (const template of catalog.templates) {
  const limits = Object.entries(template.capacity).map(([key, [min, max]]) => `${key}：${min === max ? min : `${min}–${max ?? '不限'}`}`).join('；');
  lines.push(`| ${template.id} | ${template.name} | ${template.inputs.map(input => `\`${input}\``).join('、')} | ${limits || '按文字容量检查'} |`);
 }
 lines.push(end);
 return lines.join('\n');
}
export async function syncCatalog({check = false} = {}) {
 const catalogPath = path.join(root, 'references/template-catalog.json');
 const guidePath = path.join(root, 'references/editable-templates.md');
 const json = `${JSON.stringify(generatedCatalog(), null, 2)}\n`;
 const guide = await fs.readFile(guidePath, 'utf8');
 const first = guide.indexOf(start), last = guide.indexOf(end);
 if (first < 0 || last < first) throw new Error('Template guide is missing generated-table markers');
 const updated = `${guide.slice(0, first)}${generatedTable()}${guide.slice(last + end.length)}`;
 if (check) {
  if (await fs.readFile(catalogPath, 'utf8') !== json || guide !== updated) throw new Error('Template catalog drift: run node scripts/sync-template-catalog.mjs');
 } else {
  await fs.writeFile(catalogPath, json);
  await fs.writeFile(guidePath, updated);
 }
 return {status: check ? 'synchronized' : 'updated', templates: templateContract.templates.length};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const args = process.argv.slice(2);
 if (args.some(arg => arg !== '--check')) throw new Error('Use sync-template-catalog.mjs [--check]');
 console.log(JSON.stringify(await syncCatalog({check: args.includes('--check')})));
}
