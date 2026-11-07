import {createTheme} from './theme.mjs';
import {numericScale} from './chart-scale.mjs';

function finite(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}
function options(data, fields) {
  if (!Array.isArray(data.options) || !data.options.length) throw new Error('data.options is required');
  return data.options.map(option => {
    if (!option || typeof option !== 'object') throw new Error('Each option must be an object');
    const result = {...option};
    for (const field of fields) result[field] = finite(option[field], field);
    return result;
  });
}
function display(data, axis, values) {
  const config = {...data.display, ...data.axes?.[axis]};
  const allowed = new Set(['unit', 'decimals', 'locale', 'percent', 'label', 'min', 'max', 'majorUnit', 'includeZero']);
  const unsupported = Object.keys(config).filter(key => !allowed.has(key));
  if (unsupported.length) throw new Error(`Unknown axis display fields: ${unsupported.join(', ')}`);
  if (config.decimals !== undefined && (!Number.isInteger(config.decimals) || config.decimals < 0 || config.decimals > 12)) throw new Error('Display decimals must be an integer from 0 to 12');
  if (config.unit !== undefined && typeof config.unit !== 'string') throw new Error('Display unit must be text');
  if (config.percent !== undefined && typeof config.percent !== 'boolean') throw new Error('Display percent must be boolean');
  if (config.includeZero !== undefined && typeof config.includeZero !== 'boolean') throw new Error('Axis includeZero must be boolean');
  const small = values.some(value => value !== 0 && Math.abs(value) < 1e-9);
  const format = (config.decimals === undefined ? (small ? '0.######E+00' : values.every(Number.isInteger) ? '#,##0' : '#,##0.############') : '#,##0' + (config.decimals ? '.' + '0'.repeat(config.decimals) : '')) + (config.percent ? '%' : '');
  const style = config.percent ? 'percent' : 'decimal';
  const formatter = new Intl.NumberFormat(config.locale ?? 'en-US', {style, ...(config.decimals === undefined ? {maximumFractionDigits: 12} : {minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals})});
  const scientific = new Intl.NumberFormat(config.locale ?? 'en-US', {style, notation: 'scientific', maximumFractionDigits: 6});
  return {
    ...config,
    numberFormatCode: format + (config.unit ? `" ${config.unit.replaceAll('"', '""')}"` : ''),
    formatValue(value) {
      const label = config.decimals === undefined && value !== 0 && Math.abs(value) < 1e-9 ? scientific.format(value) : formatter.format(value);
      return label + (config.unit ? ` ${config.unit}` : '');
    },
  };
}

function themedAdvanced(config, adapters = {}) {
  const theme = config?.C ? config : createTheme(config ?? {});
  const C = {...theme.C, gray: theme.chart.context, line: theme.C.rule, negative: theme.chart.negative};
  const fontFamily = adapters.fontFamily ?? 'Arial Unicode MS';
  const fontSize = adapters.fontSize ?? 18;
  if (typeof fontFamily !== 'string' || !fontFamily.trim()) throw new Error('fontFamily must be non-empty text');
  if (!Number.isFinite(fontSize) || fontSize <= 0) throw new Error('fontSize must be a positive finite number');
  if (adapters.applyChartFont !== undefined && typeof adapters.applyChartFont !== 'function') throw new Error('applyChartFont must be a function');
  const line = (fill, width = 1) => ({fill, width, style: 'solid'});
  const text = (fill = C.ink, bold = false) => ({typeface: fontFamily, fontSize, fill: fill === C.blue ? C.primaryText : fill === C.gray ? theme.C.gray : fill === C.accent ? C.accentText : fill, bold});
  const point = (idx, label, position, fill = C.ink, bold = false) => ({idx, text: label, position, showValue: false, showSeriesName: false, showCategoryName: false, textStyle: text(fill, bold)});
  function chart(slide, rect, series, xAxis, yAxis) {
    const ch = slide.charts.add('scatter', {
      position: {...rect}, series, scatterOptions: {style: 'lineWithMarkers', varyColors: false}, hasLegend: false,
      xAxis: {visible: true, position: 'bottom', textStyle: text(C.gray), line: line(C.line, .7), majorGridlines: line(C.line, .6), ...xAxis},
      yAxis: {visible: false, position: 'left', line: line('none', 0), majorGridlines: null, ...yAxis},
      dataLabels: {visible: true, showValue: false, showSeriesName: false, showCategoryName: false, textStyle: text()},
      chartFill: '#FFFFFF', chartLine: line('none', 0), plotAreaFill: '#FFFFFF', plotAreaLine: line('none', 0),
    });
    if (adapters.applyChartFont !== undefined) {
      adapters.applyChartFont(ch, {fontFamily});
    }
    return ch;
  }

  /** Scenario names describe input assumptions, not an ordering of outcomes. */
  function addRangeChart(slide, rect, data) {
    const rows = options(data, ['low', 'base', 'high']).filter(option => data.baselineId === undefined || option.id !== data.baselineId);
    if (!rows.length) throw new Error('Range chart needs non-baseline options');
    const values = rows.flatMap(option => [option.low, option.base, option.high]);
    const x = display(data, 'x', values), labels = data.labels ?? {};
    // End labels sit outside their points. Include zero as a reference value,
    // then pad both ends instead of pinning the plotting area at that value.
    // Explicit bounds stay exact, and includeZero:false can request a local view.
    const domainValues = x.includeZero === false ? values : [0, ...values];
    const domain = numericScale(domainValues, {...x, includeZero: false});
    const series = [];
    rows.forEach((option, index) => {
      const y = rows.length - index, color = option.id === data.highlightId ? C.blue : C.gray;
      series.push({name: `${option.id} ${option.name}：${labels.range ?? '低高情景'}`, xValues: [option.low, option.high], values: [y, y], line: line(color, 3), marker: {symbol: 'circle', size: 7, fill: color},
        dataLabelOverrides: [point(0, `${option.id} ${option.name}\n${x.formatValue(option.low)}`, 'left', option.low < 0 ? C.negative : C.ink), point(1, x.formatValue(option.high), 'right')]});
      series.push({name: `${option.id} ${labels.base ?? '基准情景'}`, xValues: [option.base], values: [y], line: line('none', 0), marker: {symbol: 'circle', size: 11, fill: color},
        dataLabelOverrides: [point(0, `${x.formatValue(option.base)} ${labels.base ?? '基准'}`, 'top', color, true)]});
    });
    return chart(slide, rect, series, {...domain, numberFormatCode: x.numberFormatCode}, {min: 0, max: rows.length + 1, majorUnit: 1});
  }

  /** Each row supplies two values in the same unit; no sales semantics required. */
  function addDumbbellChart(slide, rect, data) {
    if (!Array.isArray(data.hourly) || !data.hourly.length) throw new Error('data.hourly is required');
    const rows = data.hourly.map(option => ({...option, gross: finite(option.gross, 'gross'), net: finite(option.net, 'net')}));
    const values = rows.flatMap(option => [option.gross, option.net]), x = display(data, 'x', values), comparison = C.accent ?? C.gray;
    const series = rows.map((option, index) => ({name: option.name, xValues: [option.net, option.gross], values: [rows.length - index, rows.length - index], line: line(C.line, 3), marker: {symbol: 'circle', size: 10, fill: comparison},
      points: [{idx: 0, fill: C.blue, line: line(C.blue)}, {idx: 1, fill: comparison, line: line(comparison)}],
      dataLabelOverrides: [point(0, `${option.name}\n${data.netLabel ?? '比较值'} ${x.formatValue(option.net)}`, 'left', C.blue, true), point(1, `${data.grossLabel ?? '参照值'} ${x.formatValue(option.gross)}`, 'right')]}));
    return chart(slide, rect, series, {...numericScale(values, x), numberFormatCode: x.numberFormatCode}, {min: 0, max: rows.length + 1, majorUnit: 1});
  }

  function addInvestmentChart(slide, rect, data) {
    const rows = options(data, ['cost', 'base']);
    const xValues = rows.map(option => option.cost), yValues = rows.map(option => option.base);
    const x = display(data, 'x', xValues), y = display(data, 'y', yValues);
    const series = rows.map(option => {
      const color = option.id === data.highlightId ? C.blue : option.id === data.baselineId ? C.gray : C.ink;
      const position = data.labelPositions?.[option.id] ?? (option.id === data.highlightId ? 'bottom' : 'top');
      let label = `${option.id} ${option.name}\n${x.label ?? '投入'} ${x.formatValue(option.cost)} / ${y.label ?? '贡献'} ${y.formatValue(option.base)}`;
      if (data.externalLabel) label += `\n${data.externalLabel} ${finite(option.external, 'external')}${data.externalUnit ? ' ' + data.externalUnit : ''}`;
      return {name: `${option.id} ${option.name}`, xValues: [option.cost], values: [option.base], line: line('none', 0), marker: {symbol: 'circle', size: option.id === data.highlightId ? 13 : 10, fill: color},
        dataLabelOverrides: [point(0, data.labelText?.[option.id] ?? label, position, color, option.id === data.highlightId)]};
    });
    return chart(slide, rect, series,
      {...numericScale(xValues, x), numberFormatCode: x.numberFormatCode},
      {visible: true, ...numericScale(yValues, y), numberFormatCode: y.numberFormatCode, textStyle: text(C.gray), line: line(C.line, .7), majorGridlines: line(C.line, .6)});
  }
  return {addRangeChart, addDumbbellChart, addInvestmentChart};
}

export function addRangeChart(slide, rect, data, adapters) {return themedAdvanced(data.theme, adapters).addRangeChart(slide, rect, data);}
export function addDumbbellChart(slide, rect, data, adapters) {return themedAdvanced(data.theme, adapters).addDumbbellChart(slide, rect, data);}
export function addInvestmentChart(slide, rect, data, adapters) {return themedAdvanced(data.theme, adapters).addInvestmentChart(slide, rect, data);}
