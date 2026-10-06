/* Deterministic formulas and explicitly illustrative product assumptions. */
(function (root) {
  'use strict';
  const ASSUMPTIONS = Object.freeze({
    label: 'Illustrative prototype assumptions',
    mass: Object.freeze([30, 100, 250]),
    speed: Object.freeze([60, 120, 200]),
    charge: Object.freeze([6, 10, 15])
  });
  const SCENARIOS = Object.freeze({
    collision: ['Collision', 'Kinetic energy describes motion only. It does not establish barrier performance.'],
    charged: ['Collision with possible charge', 'Charge mass is context only. Blast and fragmentation loads are not calculated.'],
    drop: ['Dropped payload', 'Vehicle kinetic energy does not describe a dropped payload. Its trajectory and effects need separate review.'],
    unknown: ['Unknown scenario', 'Clarify the scenario before using these inputs in a specialist review.']
  });
  const fields = ['mass', 'speed', 'charge', 'length', 'width', 'height', 'offset', 'topOffset', 'density'];
  function parse(value) {
    if (value == null || String(value).trim() === '') return null;
    const text = String(value).trim().replace(',', '.');
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) throw new Error('Enter a finite decimal number.');
    const number = Number(text);
    if (!Number.isFinite(number)) throw new Error('Enter a finite decimal number.');
    return number;
  }
  function finite(values) {
    if (!values.every(Number.isFinite)) throw new Error('Calculation exceeds finite numeric range. Reduce the inputs.');
  }
  function kineticEnergy(mass, speed) {
    finite([mass, speed]);
    if (mass <= 0 || speed < 0) throw new Error('Mass must be positive; speed must be non-negative.');
    const velocity = speed / 3.6;
    const joules = 0.5 * mass * velocity * velocity;
    const kilojoules = joules / 1000;
    finite([velocity, joules, kilojoules]);
    return {velocity, joules, kilojoules};
  }
  function geometryArea({length, width, height, offset, topOffset}) {
    finite([length, width, height, offset, topOffset]);
    if ([length, width, height].some(n => n <= 0) || [offset, topOffset].some(n => n < 0)) throw new Error('Dimensions must be positive; offsets must be non-negative.');
    const a = length + 2 * offset, b = width + 2 * offset, c = height + topOffset;
    const roof = a * b, walls = 2 * a * c + 2 * b * c, total = roof + walls;
    finite([a, b, c, roof, walls, total]);
    return {a, b, c, roof, walls, total};
  }
  function fabricMass(area, density) {
    finite([area, density]);
    if (area < 0 || density <= 0) throw new Error('Area must be non-negative; fabric mass per area must be positive.');
    const mass = area * density;
    finite([mass]);
    return mass;
  }
  function band(value, thresholds) {
    return value < thresholds[0] ? 'A' : value < thresholds[1] ? 'B' : value <= thresholds[2] ? 'C' : 'Outside illustrative range';
  }
  function evaluate(raw) {
    const values = {}, errors = {};
    for (const key of fields) {
      try {
        values[key] = parse(raw[key]);
        if (values[key] === null && ['mass', 'speed'].includes(key)) throw new Error('This field is required.');
        if (values[key] !== null) {
          const positive = ['mass', 'length', 'width', 'height', 'density'].includes(key);
          if (positive ? values[key] <= 0 : values[key] < 0) throw new Error(positive ? 'Must be greater than zero.' : 'Must be zero or greater.');
        }
      } catch (error) { errors[key] = error.message; }
    }
    const scenario = raw.scenario || 'collision';
    if (!Object.hasOwn(SCENARIOS, scenario)) errors.scenario = 'Select a known scenario.';
    let energy = null, geometry = null, estimatedMass = null;
    if (!errors.mass && !errors.speed) {
      try { energy = kineticEnergy(values.mass, values.speed); } catch (error) { errors.speed = error.message; }
    }
    const geometryKeys = ['length', 'width', 'height', 'offset', 'topOffset'];
    const missingGeometry = geometryKeys.some(key => values[key] === null);
    if (!missingGeometry && !geometryKeys.some(key => errors[key])) {
      try { geometry = geometryArea(values); } catch (error) { errors.length = error.message; }
    }
    if (geometry && values.density !== null && !errors.density) {
      try { estimatedMass = fabricMass(geometry.total, values.density); } catch (error) { errors.density = error.message; }
    }
    const valid = Object.keys(errors).length === 0;
    const warnings = [];
    if (missingGeometry) warnings.push('Geometry incomplete: enter all three dimensions and both offsets to calculate area.');
    if (values.density === null) warnings.push('Fabric mass estimate needs a mass-per-area input.');
    if (values.charge === null) warnings.push('Charge mass is not specified.');
    else if (!errors.charge && values.charge > 0) warnings.push('A positive charge mass is specified; explosive effects are excluded.');
    const profile = valid ? {
      mass: band(values.mass, ASSUMPTIONS.mass), speed: band(values.speed, ASSUMPTIONS.speed),
      charge: values.charge === null ? 'Not specified' : values.charge === 0 ? 'Absent (0 kg)' : band(values.charge, ASSUMPTIONS.charge)
    } : null;
    if (profile && Object.values(profile).includes('Outside illustrative range')) warnings.push('At least one input is outside the illustrative profile ranges. Formulas still apply; no protective capacity is inferred.');
    return {valid, values, errors, energy, geometry, estimatedMass, scenario, profile, warnings};
  }
  const format = number => new Intl.NumberFormat('en', {maximumSignificantDigits: 6}).format(number);
  function summary(result) {
    if (!result.valid) return 'No current result. Correct the highlighted inputs.';
    const v = result.values;
    const lines = [
      `Scenario: ${SCENARIOS[result.scenario][0]}.`,
      `Vehicle mass: ${format(v.mass)} kg. Speed: ${format(v.speed)} km/h.`,
      `Charge mass: ${v.charge === null ? 'not specified' : v.charge === 0 ? 'absent (0 kg)' : format(v.charge) + ' kg'}.`,
      `Kinetic energy: ${format(result.energy.kilojoules)} kJ (E = ½mv²; v = speed / 3.6).`,
      `Illustrative input profile — mass: ${result.profile.mass}; speed: ${result.profile.speed}; charge: ${result.profile.charge}.`,
      SCENARIOS[result.scenario][1]
    ];
    if (result.geometry) {
      const g = result.geometry;
      lines.push(`Object: ${format(v.length)} × ${format(v.width)} × ${format(v.height)} m. Offsets: ${format(v.offset)} m around each side; ${format(v.topOffset)} m above.`,
        `Enclosure: ${format(g.a)} × ${format(g.b)} × ${format(g.c)} m. Roof: ${format(g.roof)} m². Four walls: ${format(g.walls)} m². Total: ${format(g.total)} m²; no floor.`);
      if (result.estimatedMass !== null) lines.push(`Fabric mass estimate: ${format(result.estimatedMass)} kg at ${format(v.density)} kg/m². Excludes overlaps, waste, supports and attachments.`);
    }
    lines.push(...result.warnings, 'This prototype does not calculate real protective-system strength or verify any net. Specialist engineering review is required.');
    return lines.join('\n\n');
  }
  function mount(document) {
    const form = document.getElementById('calculator');
    let active = false;
    const control = key => form.elements.namedItem(key);
    const read = () => Object.fromEntries(['scenario', ...fields].map(key => [key, control(key).value]));
    function render() {
      const result = evaluate(read());
      for (const key of ['scenario', ...fields]) {
        document.getElementById(key + 'Error').textContent = result.errors[key] || '';
        control(key).setAttribute('aria-invalid', result.errors[key] ? 'true' : 'false');
      }
      document.getElementById('summary').textContent = summary(result);
      document.getElementById('energy').textContent = result.valid ? format(result.energy.kilojoules) + ' kJ' : '—';
      document.getElementById('area').textContent = result.valid && result.geometry ? format(result.geometry.total) + ' m²' : '—';
      document.getElementById('fabric').textContent = result.valid && result.estimatedMass !== null ? format(result.estimatedMass) + ' kg' : '—';
      document.getElementById('status').textContent = result.valid ? 'Current form values · deterministic result' : 'Check inputs · previous result cleared';
      return result;
    }
    form.addEventListener('submit', event => { event.preventDefault(); active = true; render(); });
    for (const event of ['input', 'change']) form.addEventListener(event, () => { if (active) render(); });
    document.getElementById('summaryButton').addEventListener('click', () => {
      active = true; render(); document.getElementById('summary').focus();
    });
    document.getElementById('example').addEventListener('click', () => {
      const example = {scenario: 'collision', mass: '12', speed: '72', charge: '0', length: '10', width: '6', height: '4', offset: '2', topOffset: '3', density: '1.5'};
      for (const [key, value] of Object.entries(example)) control(key).value = value;
      active = true; render();
    });
    form.addEventListener('reset', () => {
      active = false;
      for (const key of ['scenario', ...fields]) {
        document.getElementById(key + 'Error').textContent = '';
        control(key).setAttribute('aria-invalid', 'false');
      }
      for (const id of ['energy', 'area', 'fabric']) document.getElementById(id).textContent = '—';
      document.getElementById('summary').textContent = 'Enter scenario inputs, then calculate or build a summary.';
      document.getElementById('status').textContent = 'Ready for your inputs';
    });
    return {render};
  }
  const api = {ASSUMPTIONS, parse, kineticEnergy, geometryArea, fabricMass, evaluate, summary, mount};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.UAVCalculator = api; mount(root.document); }
})(typeof window !== 'undefined' ? window : globalThis);
