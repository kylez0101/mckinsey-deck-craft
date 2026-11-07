// Numeric domains are independent of presentation runtimes and business units.
export function numericScale(values, options = {}) {
  if (!Array.isArray(values) || !values.length || !values.every(Number.isFinite)) throw new Error('Axis values must be non-empty finite numbers');
  const minimum = Math.min(...values), maximum = Math.max(...values);
  const includeZero = options.includeZero !== false;
  const low = includeZero ? Math.min(0, minimum) : minimum;
  const high = includeZero ? Math.max(0, maximum) : maximum;
  const span = high - low || Math.abs(high) || 1;
  if (!Number.isFinite(span)) throw new Error('Axis span exceeds the supported finite numeric range');
  const rawMin = low === 0 && includeZero ? 0 : low - span * 0.12;
  const rawMax = high === 0 && low < 0 && includeZero ? 0 : high + span * 0.20;
  const extent = rawMax - rawMin;
  const magnitude = 10 ** Math.floor(Math.log10(extent / 5));
  const normalized = extent / 5 / magnitude;
  const factor = [1, 2, 2.5, 5, 10].find(value => value >= normalized) ?? 10;
  const majorUnit = options.majorUnit ?? factor * magnitude;
  if (!Number.isFinite(majorUnit) || majorUnit <= 0) throw new Error('Axis majorUnit must be a positive finite number');
  const stable = value => Number(value.toPrecision(14));
  const min = options.min ?? stable(Math.floor(rawMin / majorUnit) * majorUnit);
  const max = options.max ?? stable(Math.ceil(rawMax / majorUnit) * majorUnit);
  if (![min, max].every(Number.isFinite) || min >= max || min > minimum || max < maximum) throw new Error('Axis bounds must cover every value with max > min');
  if (includeZero && (min > 0 || max < 0)) throw new Error('Axis bounds must include zero unless includeZero is false');
  return {min, max, majorUnit};
}
