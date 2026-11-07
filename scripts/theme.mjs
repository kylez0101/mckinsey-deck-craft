// Pure, dependency-free palette generation. Cover styling is resolved separately.
const WHITE = '#FFFFFF', BLACK = '#000000';
const NEUTRAL = Object.freeze({ink:'#1D2024', gray:'#5F6368', rule:'#D8DBDE', light:'#F5F6F7', context:'#858B91'});

function hex(value, label) {
  if (typeof value !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) {
    throw new TypeError(`${label} must be a #RGB or #RRGGBB hex color, for example #1D5C63. Named colors and alpha channels are not supported.`);
  }
  return (value.length === 4 ? '#' + [...value.slice(1)].map(c => c + c).join('') : value).toUpperCase();
}
function rgb(value) { return value.slice(1).match(/../g).map(c => parseInt(c, 16)); }
function mix(a, b, weight) {
  const av = rgb(a), bv = rgb(b);
  return '#' + av.map((v, i) => Math.round(v + (bv[i] - v) * weight).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function luminance(value) {
  const [r, g, b] = rgb(value).map(v => {
    const c = v / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  return .2126 * r + .7152 * g + .0722 * b;
}

/** WCAG relative-luminance ratio, unrounded; accepts #RGB and #RRGGBB. */
export function contrastRatio(foreground, background) {
  const a = luminance(hex(foreground, 'foreground')), b = luminance(hex(background, 'background'));
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
function readableOnWhite(color, minimum) {
  // Mixing with black changes lightness while retaining the input's hue family.
  for (let step = 0; step <= 255; step++) {
    const candidate = mix(color, BLACK, step / 255);
    if (contrastRatio(candidate, WHITE) >= minimum) return candidate;
  }
  return BLACK;
}
function onFill(fill) {
  return contrastRatio(WHITE, fill) >= contrastRatio(BLACK, fill) ? WHITE : BLACK;
}

/**
 * @param {{primary?:string, accent?:string}} config One primary hue, at most one explicit accent.
 * @returns {{config:object,C:object,chart:object,table:object,audit:object}}
 * config preserves submitted hex strings; C.primary preserves the exact normalized color.
 * C.blue is the legacy primary-fill token; use C.onPrimary on that fill.
 */
export function createTheme(config = {}) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new TypeError('theme must be an object containing primary and optional accent hex colors.');
  }
  const unknown = Object.keys(config).filter(k => !['primary', 'accent'].includes(k));
  if (unknown.length) throw new TypeError(`Unknown theme field(s): ${unknown.join(', ')}. Use only primary and optional accent.`);
  const submitted = {primary: config.primary === undefined ? '#2251FF' : config.primary};
  if (config.accent !== undefined) submitted.accent = config.accent;
  const primary = hex(submitted.primary, 'theme.primary');
  const accent = submitted.accent === undefined ? undefined : hex(submitted.accent, 'theme.accent');
  // A small safety margin prevents rounding a below-threshold ratio into a pass.
  const fill = readableOnWhite(primary, 3.1), primaryText = readableOnWhite(primary, 4.55);
  const C = {
    ink:NEUTRAL.ink, blue:fill, pale:mix(primary, WHITE, .93), gray:NEUTRAL.gray,
    rule:NEUTRAL.rule, light:NEUTRAL.light, white:WHITE,
    primary, primaryText, onPrimary:onFill(fill), primaryDark:mix(primaryText, BLACK, .16),
  };
  if (accent !== undefined) {
    C.accentOriginal = accent;
    C.accent = readableOnWhite(accent, 3.1);
    C.accentText = readableOnWhite(accent, 4.55);
    C.onAccent = onFill(C.accent);
    C.accentPale = mix(accent, WHITE, .93);
  }
  const chart = {
    focus:C.blue, context:NEUTRAL.context, baseline:C.gray,
    comparison:C.accent ?? readableOnWhite(mix(primary, WHITE, .35), 3.1),
    rangeBand:C.pale, rangeOutline:C.blue, remainder:C.rule,
    negative:C.accent ?? C.ink, label:C.ink, secondaryLabel:C.gray,
    axis:C.gray, grid:C.rule,
  };
  const table = {
    header:{fill:C.blue, color:C.onPrimary, border:C.blue},
    emphasis:{fill:C.pale, color:C.ink, border:C.blue},
    cell:{fill:C.white, color:C.ink, border:C.rule},
    subtotal:{fill:C.light, color:C.ink, border:C.gray},
    ...(accent === undefined ? {} : {accent:{fill:C.accent, color:C.onAccent, border:C.accent}}),
  };
  const checks = {
    bodyOnWhite:contrastRatio(C.ink, C.white), secondaryOnWhite:contrastRatio(C.gray, C.white),
    primaryTextOnWhite:contrastRatio(C.primaryText, C.white), onPrimary:contrastRatio(C.onPrimary, C.blue),
    focusOnWhite:contrastRatio(chart.focus, C.white), contextOnWhite:contrastRatio(chart.context, C.white),
    comparisonOnWhite:contrastRatio(chart.comparison, C.white), emphasisText:contrastRatio(C.ink, C.pale),
    ...(accent === undefined ? {} : {accentTextOnWhite:contrastRatio(C.accentText, C.white), onAccent:contrastRatio(C.onAccent, C.accent)}),
  };
  return {
    config:submitted, C, chart, table,
    audit:{
      checks,
      pass:checks.bodyOnWhite >= 4.5 && checks.secondaryOnWhite >= 4.5 && checks.primaryTextOnWhite >= 4.5 && checks.onPrimary >= 4.5 && checks.focusOnWhite >= 3 && checks.contextOnWhite >= 3 && checks.comparisonOnWhite >= 3 && checks.emphasisText >= 4.5 && (accent === undefined || (checks.accentTextOnWhite >= 4.5 && checks.onAccent >= 4.5)),
      primaryFillAdjusted:fill !== primary,
      primaryTextAdjusted:primaryText !== primary,
      chromaticFamilies:accent === undefined || accent === primary ? 1 : 2,
      cover:'controlled-by-style-profile',
      rules:[
        'Use one primary family and only an explicitly supplied accent; neutral colors do not encode categories.',
        'Use primaryText for colored text on white and onPrimary for text on the blue fill token.',
        'Pale, rangeBand and remainder need direct labels or visible outlines when their boundary carries meaning.',
        'Use labels, line styles, markers or position as well as color to distinguish chart series.',
      ],
    },
  };
}
