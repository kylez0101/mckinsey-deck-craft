import assert from 'node:assert/strict';
import {createTheme, contrastRatio} from '../theme.mjs';

assert.equal(contrastRatio('#000', '#fff'), 21);
assert.equal(contrastRatio('#fff', '#fff'), 1);
assert.equal(contrastRatio('#1D5C63', '#fff'), contrastRatio('#fff', '#1D5C63'));

const primaries = ['#2251FF', '#1D5C63', '#6B2D45', '#9B6A24', '#F6DE72', '#FF0000'];
function hue(color) {
  const [r,g,b] = color.slice(1).match(/../g).map(v => parseInt(v,16)/255);
  const high=Math.max(r,g,b), low=Math.min(r,g,b), d=high-low;
  if (d < .03) return null; // Near-neutral rounding is not a new hue family.
  const h=high===r?(g-b)/d:high===g?(b-r)/d+2:(r-g)/d+4;
  return (h*60+360)%360;
}
function sameHueFamily(a,b) {
  const ah=hue(a), bh=hue(b);
  if (ah === null || bh === null) return true;
  const difference=Math.abs(ah-bh);
  return Math.min(difference,360-difference) <= 6;
}
for (const primary of primaries) {
  const t = createTheme({primary});
  assert.equal(t.config.primary, primary, 'input is preserved');
  assert.equal(t.C.primary, primary, 'normalized color remains exact');
  assert.equal(t.audit.pass, true, JSON.stringify(t.audit));
  assert.equal(t.audit.chromaticFamilies, 1);
  assert.equal('accent' in t.C, false, 'no implicit accent');
  assert.ok(contrastRatio(t.C.gray, t.C.white) >= 4.5);
  assert.ok(contrastRatio(t.C.primaryText, t.C.white) >= 4.5);
  assert.ok(contrastRatio(t.C.onPrimary, t.C.blue) >= 4.5);
  assert.ok(contrastRatio(t.chart.focus, t.C.white) >= 3);
  assert.ok(contrastRatio(t.chart.comparison, t.C.white) >= 3);
  assert.ok(contrastRatio(t.C.ink, t.C.pale) >= 4.5);
  assert.deepEqual(t.table.header, {fill:t.C.blue, color:t.C.onPrimary, border:t.C.blue});
  assert.equal(t.table.emphasis.fill, t.C.pale);
  assert.equal(t.audit.cover, 'controlled-by-style-profile');
  for (const value of [t.C.blue,t.C.pale,t.C.primaryText,t.C.primaryDark,t.chart.comparison]) {
    assert.ok(sameHueFamily(value,primary), `Unrequested hue ${value} from ${primary}`);
  }
  assert.deepEqual(createTheme({primary}), t, 'deterministic output');
}
assert.equal(createTheme().C.primary, '#2251FF');
assert.equal(createTheme({primary:'#abc'}).config.primary, '#abc');
assert.equal(createTheme({primary:'#abc'}).C.primary, '#AABBCC');
assert.equal(createTheme({primary:'#F6DE72'}).audit.primaryFillAdjusted, true);
assert.equal(createTheme({primary:'#FF0000'}).C.onPrimary, '#000000');

const accented = createTheme({primary:'#1D5C63', accent:'#F6DE72'});
assert.equal(accented.config.accent, '#F6DE72');
assert.equal(accented.C.accentOriginal, '#F6DE72');
assert.equal(accented.audit.chromaticFamilies, 2);
assert.equal(accented.chart.comparison, accented.C.accent);
assert.ok(contrastRatio(accented.C.onAccent, accented.C.accent) >= 4.5);
assert.equal(accented.audit.pass, true);
assert.ok(sameHueFamily(accented.C.accent, accented.C.accentOriginal));
assert.equal(createTheme({primary:'#abc', accent:'#aabbcc'}).audit.chromaticFamilies, 1);

for (const value of ['teal', 'red', '#12', '#1234', '#12345678', '2251FF', '#ZZ1122', null, 42]) {
  assert.throws(() => createTheme({primary:value}), /theme\.primary.*#RGB or #RRGGBB/);
  assert.throws(() => createTheme({accent:value}), /theme\.accent.*#RGB or #RRGGBB/);
}
assert.throws(() => createTheme({primary:'#123456', accent:['#fff', '#000']}), /theme\.accent/);
assert.throws(() => createTheme({primary:'#123456', palette:['#fff']}), /Unknown theme field/);
for (const config of [null, [], 'teal', 1]) assert.throws(() => createTheme(config), /theme must be an object/);

const frozenInput=Object.freeze({primary:'#1D5C63',accent:'#9B6A24'});
assert.equal(createTheme(frozenInput).config.primary, frozenInput.primary, 'does not mutate input');
let gridCount=0;
for (let r=0;r<16;r++) for (let g=0;g<16;g++) for (let b=0;b<16;b++) {
  const primary='#'+[r,g,b].map(n=>(n*17).toString(16).padStart(2,'0')).join('');
  assert.equal(createTheme({primary}).audit.pass,true,primary);
  gridCount++;
}
console.log(`Theme tests passed: ${primaries.length} required palettes, ${gridCount} RGB-grid contrast cases, explicit accent, shorthand, hue-family, deterministic output and invalid-input cases.`);
