'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parse, kineticEnergy, geometryArea, fabricMass, evaluate, summary, mount} = require('../script.js');
const example = {scenario: 'collision', mass: '12', speed: '72', charge: '', length: '10', width: '6', height: '4', offset: '2', topOffset: '3', density: '1.5'};

test('kinetic energy uses km/h → m/s, including zero speed', () => {
  assert.deepEqual(kineticEnergy(12, 72), {velocity: 20, joules: 2400, kilojoules: 2.4});
  assert.equal(kineticEnergy(12, 0).joules, 0);
});
test('four walls + roof without floor and generic fabric mass', () => {
  const r = evaluate(example);
  assert.equal(r.valid, true);
  assert.deepEqual(r.geometry, {a: 14, b: 10, c: 7, roof: 140, walls: 336, total: 476});
  assert.equal(r.estimatedMass, 714);
});
test('missing geometry allows energy but no area or fabric mass', () => {
  const r = evaluate({...example, width: ''});
  assert.equal(r.valid, true);
  assert.equal(r.energy.kilojoules, 2.4);
  assert.equal(r.geometry, null);
  assert.equal(r.estimatedMass, null);
});
test('negative offsets and invalid dimensions rejected', () => {
  for (const key of ['offset', 'topOffset', 'length', 'width', 'height']) {
    const r = evaluate({...example, [key]: '-1'});
    assert.equal(r.valid, false);
    assert.ok(r.errors[key]);
  }
  assert.throws(() => geometryArea({length: 1, width: 1, height: 1, offset: -1, topOffset: 0}));
});
test('empty charge and zero charge have distinct, consistent messages in every scenario', () => {
  for (const scenario of ['collision', 'charged', 'drop', 'unknown']) {
    const empty = evaluate({...example, scenario});
    const zero = evaluate({...example, scenario, charge: '0'});
    assert.equal(empty.values.charge, null);
    assert.match(summary(empty), /Charge mass: not specified/);
    assert.match(summary(zero), /Charge mass: absent \(0 kg\)/);
    assert.doesNotMatch(summary(zero), /not specified|positive charge/);
    assert.equal(zero.warnings.some(w => /Charge mass/.test(w)), false);
  }
});
test('reject non-finite input and overflow in all calculation paths', () => {
  for (const key of Object.keys(example).filter(k => k !== 'scenario')) {
    for (const value of ['NaN', 'Infinity', '-Infinity', '1e309']) {
      assert.equal(evaluate({...example, [key]: value}).valid, false, `${key}: ${value}`);
    }
  }
  assert.equal(evaluate({...example, speed: '1e308'}).valid, false);
  assert.equal(evaluate({...example, length: '1e308', width: '1e308'}).valid, false);
  assert.equal(evaluate({...example, density: '1e308'}).valid, false);
  assert.throws(() => kineticEnergy(Infinity, 10));
  assert.throws(() => fabricMass(476, 1e308));
  assert.equal(evaluate({...example, speed: '1e8'}).valid, true); // no arbitrary engineering ceiling
});
test('decimal comma and exponent notation supported; junk rejected', () => {
  assert.equal(parse('1,5'), 1.5);
  assert.equal(parse('1e2'), 100);
  assert.throws(() => parse('0x10'));
  assert.throws(() => parse('12kg'));
});
test('profile thresholds are illustrative and never cap formulas', () => {
  const r = evaluate({...example, mass: '300', speed: '220', charge: '16'});
  assert.equal(r.valid, true);
  assert.equal(r.profile.mass, 'Outside illustrative range');
  assert.equal(evaluate({...example, mass: '30'}).profile.mass, 'B');
  assert.equal(evaluate({...example, mass: '100'}).profile.mass, 'C');
});

// Tiny DOM fixture exercises production event handlers without a dependency.
function fixture() {
  const listeners = {};
  const node = () => ({textContent: '', setAttribute() {}, focus() {}, addEventListener(type, fn) {this[type] = fn;}});
  const form = {...node(), elements: Object.fromEntries(Object.entries(example).map(([key, value]) => [key, {...node(), value}])), addEventListener(type, fn) {listeners[type] = fn;}};
  form.elements.namedItem = key => form.elements[key];
  const nodes = {calculator: form};
  const document = {getElementById(id) {return nodes[id] ||= node();}};
  mount(document);
  return {form, nodes, fire: type => listeners[type]({preventDefault() {}})};
}
test('stale-summary regression: submit, edit, rerender, CTA, invalidation, reset', () => {
  const f = fixture();
  f.fire('submit');
  assert.match(f.nodes.summary.textContent, /2\.4 kJ/);
  f.form.elements.mass.value = '24';
  f.fire('input');
  assert.match(f.nodes.summary.textContent, /Vehicle mass: 24 kg/);
  assert.match(f.nodes.summary.textContent, /4\.8 kJ/);
  f.form.elements.scenario.value = 'drop';
  f.fire('change');
  assert.match(f.nodes.summary.textContent, /Dropped payload/);
  f.form.elements.width.value = '8';
  f.form.elements.charge.value = '0';
  f.nodes.summaryButton.click(); // CTA must also read latest form directly
  assert.match(f.nodes.summary.textContent, /Total: 532 m²/);
  assert.match(f.nodes.summary.textContent, /absent \(0 kg\)/);
  f.form.elements.speed.value = 'Infinity';
  f.fire('input');
  assert.equal(f.nodes.energy.textContent, '—');
  assert.doesNotMatch(f.nodes.summary.textContent, /4\.8 kJ/);
  f.fire('reset');
  assert.match(f.nodes.summary.textContent, /Enter scenario inputs/);
});
test('CTA works before first calculation', () => {
  const f = fixture();
  f.nodes.summaryButton.click();
  assert.match(f.nodes.summary.textContent, /2\.4 kJ/);
});
