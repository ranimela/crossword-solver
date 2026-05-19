const assert = require('assert');
const { buildWordIndex, matchesPositions, matchesPool, filterWords } =
  require('./filter.js');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log('  PASS:', name); passed++; }
  catch (e) { console.log('  FAIL:', name, '--', e.message); failed++; }
}

// buildWordIndex
test('groups words by length', () => {
  const idx = buildWordIndex(['אבג', 'דהו', 'זח']);
  assert.deepEqual(idx.get(3), ['אבג', 'דהו']);
  assert.deepEqual(idx.get(2), ['זח']);
});

test('skips empty strings', () => {
  const idx = buildWordIndex(['', 'אב', '']);
  assert.deepEqual(idx.get(2), ['אב']);
  assert.equal(idx.has(0), false);
});

// matchesPositions
test('all positions match', () => {
  assert(matchesPositions('אבג', new Map([[1, 'א'], [3, 'ג']])));
});

test('position mismatch returns false', () => {
  assert(!matchesPositions('אבג', new Map([[1, 'ד']])));
});

test('empty fixedPositions always passes', () => {
  assert(matchesPositions('אבג', new Map()));
});

// matchesPool — repeat mode
test('repeat mode: passes when all unfixed letters in pool', () => {
  assert(matchesPool('אבג', new Map([[1, 'א']]), ['ב', 'ג'], false));
});

test('repeat mode: fails when a letter not in pool', () => {
  assert(!matchesPool('אבד', new Map(), ['א', 'ב'], false));
});

// matchesPool — unique mode
test('unique mode: passes with enough letters', () => {
  assert(matchesPool('אבג', new Map(), ['א', 'ב', 'ג'], true));
});

test('unique mode: fails when pool runs out of a letter', () => {
  assert(!matchesPool('אאב', new Map(), ['א', 'ב'], true));
});

test('unique mode: pinned positions do not consume from pool', () => {
  // 'א' at pos 1 is pinned; pool only has 'ב' for the unfixed slot
  assert(matchesPool('אב', new Map([[1, 'א']]), ['ב'], true));
});

test('empty pool always passes', () => {
  assert(matchesPool('שלום', new Map(), [], true));
  assert(matchesPool('שלום', new Map(), [], false));
});

// filterWords
test('full pipeline: filters by length, position, and pool', () => {
  const idx = buildWordIndex(['אבג', 'אדג', 'אבד', 'בבג']);
  const results = filterWords(idx, 3, new Map([[1, 'א'], [3, 'ג']]), ['ב', 'ד'], false);
  assert.deepEqual([...results].sort(), ['אבג', 'אדג'].sort());
});

test('returns empty array when nothing matches', () => {
  const idx = buildWordIndex(['אבג']);
  assert.deepEqual(filterWords(idx, 3, new Map([[1, 'ד']]), [], false), []);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
