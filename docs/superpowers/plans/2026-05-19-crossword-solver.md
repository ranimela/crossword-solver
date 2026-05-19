# Hebrew Crossword Solver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static Hebrew crossword solver web app that filters a fetched word list by word length, fixed letter positions, and an optional letter pool.

**Architecture:** Single-page static app with no build step. Pure filtering logic lives in `filter.js`, which is compatible with both browser (attaches to `window.CrosswordFilter`) and Node.js (uses `module.exports`) so tests can run with `node test.js`. Words are fetched once from `words.txt` at startup and indexed by length in memory. The UI is wired in `app.js`.

**Tech Stack:** Vanilla HTML5, CSS3, JavaScript (ES5-compatible IIFE pattern), Node.js (test runner only — no install needed).

---

## File Map

| File | Responsibility |
|------|---------------|
| `words.txt` | Hebrew word list (one word per line, unvoweled) |
| `filter.js` | Pure filtering functions — no DOM, no fetch |
| `app.js` | DOM wiring: word loading, UI events, rendering |
| `index.html` | HTML shell |
| `style.css` | RTL-aware Hebrew styling |
| `test.js` | Node-runnable unit tests for `filter.js` |

---

## Task 1: Download the Hebrew word list

**Files:**
- Create: `words.txt`

- [ ] **Step 1: List files in the eyaler/hebrew_wordlists repo**

Run in PowerShell:
```powershell
Invoke-RestMethod "https://api.github.com/repos/eyaler/hebrew_wordlists/contents" | Select-Object name, download_url
```

Find the file whose name suggests a general Hebrew word list (likely `hspell_words.txt` or similar). Copy its `download_url`.

- [ ] **Step 2: Download the word list**

Replace `<DOWNLOAD_URL>` with the URL found above:
```powershell
Invoke-WebRequest -Uri "<DOWNLOAD_URL>" -OutFile "c:/Users/rmelamed/Projects/crossword-solver/words.txt"
```

- [ ] **Step 3: Verify the file looks correct**

```powershell
Get-Content "c:/Users/rmelamed/Projects/crossword-solver/words.txt" -TotalCount 10
(Get-Content "c:/Users/rmelamed/Projects/crossword-solver/words.txt" | Measure-Object -Line).Lines
```

Expected: Hebrew words (unvoweled), one per line, ~20,000+ lines.

---

## Task 2: Filtering logic (`filter.js`) + unit tests (`test.js`)

**Files:**
- Create: `filter.js`
- Create: `test.js`

- [ ] **Step 1: Write `test.js` with failing tests**

Create `c:/Users/rmelamed/Projects/crossword-solver/test.js`:

```javascript
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
```

- [ ] **Step 2: Run tests — confirm they all fail**

```powershell
node "c:/Users/rmelamed/Projects/crossword-solver/test.js"
```

Expected: errors like `Cannot find module './filter.js'` or `not a function`.

- [ ] **Step 3: Write `filter.js`**

Create `c:/Users/rmelamed/Projects/crossword-solver/filter.js`:

```javascript
(function(exports) {

  function buildWordIndex(lines) {
    var index = new Map();
    for (var i = 0; i < lines.length; i++) {
      var word = lines[i];
      if (!word) continue;
      var len = word.length;
      if (!index.has(len)) index.set(len, []);
      index.get(len).push(word);
    }
    return index;
  }

  function matchesPositions(word, fixedPositions) {
    for (var entry of fixedPositions) {
      var pos = entry[0], letter = entry[1];
      if (word[pos - 1] !== letter) return false;
    }
    return true;
  }

  // pool is an array of letters; applies only to unfixed positions
  // pinned letters are never drawn from the pool
  function matchesPool(word, fixedPositions, pool, uniqueMode) {
    if (!pool.length) return true;
    var poolCounts = new Map();
    for (var i = 0; i < pool.length; i++) {
      var l = pool[i];
      poolCounts.set(l, (poolCounts.get(l) || 0) + 1);
    }
    for (var j = 0; j < word.length; j++) {
      if (fixedPositions.has(j + 1)) continue;
      var letter = word[j];
      if (uniqueMode) {
        var count = poolCounts.get(letter) || 0;
        if (count === 0) return false;
        poolCounts.set(letter, count - 1);
      } else {
        if (!poolCounts.has(letter)) return false;
      }
    }
    return true;
  }

  function filterWords(wordsByLength, length, fixedPositions, pool, uniqueMode) {
    var candidates = wordsByLength.get(length) || [];
    return candidates.filter(function(word) {
      return matchesPositions(word, fixedPositions) &&
             matchesPool(word, fixedPositions, pool, uniqueMode);
    });
  }

  exports.buildWordIndex = buildWordIndex;
  exports.matchesPositions = matchesPositions;
  exports.matchesPool = matchesPool;
  exports.filterWords = filterWords;

})(typeof module !== 'undefined' ? module.exports : (window.CrosswordFilter = {}));
```

- [ ] **Step 4: Run tests — confirm all pass**

```powershell
node "c:/Users/rmelamed/Projects/crossword-solver/test.js"
```

Expected output:
```
  PASS: groups words by length
  PASS: skips empty strings
  PASS: all positions match
  PASS: position mismatch returns false
  PASS: empty fixedPositions always passes
  PASS: repeat mode: passes when all unfixed letters in pool
  PASS: repeat mode: fails when a letter not in pool
  PASS: unique mode: passes with enough letters
  PASS: unique mode: fails when pool runs out of a letter
  PASS: unique mode: pinned positions do not consume from pool
  PASS: empty pool always passes
  PASS: full pipeline: filters by length, position, and pool
  PASS: returns empty array when nothing matches

13 passed, 0 failed
```

- [ ] **Step 5: Commit**

```powershell
git -C "c:/Users/rmelamed/Projects/crossword-solver" init
git -C "c:/Users/rmelamed/Projects/crossword-solver" add filter.js test.js
git -C "c:/Users/rmelamed/Projects/crossword-solver" commit -m "feat: add filtering logic with unit tests"
```

---

## Task 3: HTML structure (`index.html`)

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create `index.html`**

Create `c:/Users/rmelamed/Projects/crossword-solver/index.html`:

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>פותר תשבצים</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>פותר תשבצים</h1>

    <div class="field">
      <label for="word-length">אורך מילה:</label>
      <input type="number" id="word-length" min="1" max="30" value="5">
    </div>

    <div class="field">
      <label>מיקומי אותיות ידועים:</label>
      <div id="position-grid" class="position-grid"></div>
    </div>

    <div class="field">
      <label for="pool">אותיות אפשריות לתאים הפתוחים (אופציונלי):</label>
      <input type="text" id="pool" placeholder="לדוגמה: אבגדה">
    </div>

    <div class="field toggle-field">
      <label>
        <input type="checkbox" id="unique-mode">
        כל אות נכנסת פעם אחת בלבד
      </label>
    </div>

    <button id="search-btn" disabled>טוען מילון...</button>

    <div id="status" class="status"></div>
    <div id="results" class="results"></div>
  </div>

  <script src="filter.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```powershell
git -C "c:/Users/rmelamed/Projects/crossword-solver" add index.html
git -C "c:/Users/rmelamed/Projects/crossword-solver" commit -m "feat: add HTML shell"
```

---

## Task 4: RTL styling (`style.css`)

**Files:**
- Create: `style.css`

- [ ] **Step 1: Create `style.css`**

Create `c:/Users/rmelamed/Projects/crossword-solver/style.css`:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'David', 'Times New Roman', serif;
  font-size: 16px;
  background: #f0ede8;
  color: #1a1a1a;
  direction: rtl;
}

.container {
  max-width: 580px;
  margin: 2rem auto;
  padding: 1.5rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
}

h1 {
  font-size: 1.8rem;
  text-align: center;
  margin-bottom: 1.5rem;
  color: #1e3a5f;
}

.field {
  margin-bottom: 1.2rem;
}

label {
  display: block;
  font-weight: bold;
  margin-bottom: 0.4rem;
}

input[type="number"] {
  width: 70px;
  padding: 0.45rem 0.6rem;
  font-size: 1rem;
  border: 1px solid #bbb;
  border-radius: 4px;
  text-align: center;
}

input[type="text"] {
  width: 100%;
  padding: 0.45rem 0.6rem;
  font-size: 1.1rem;
  border: 1px solid #bbb;
  border-radius: 4px;
  direction: rtl;
  letter-spacing: 0.05em;
}

/* Position grid: RTL flex so box 1 appears at the right */
.position-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
}

.pos-input {
  width: 42px;
  height: 42px;
  text-align: center;
  font-size: 1.3rem;
  border: 2px solid #7b9ec7;
  border-radius: 4px;
  background: #f7faff;
  direction: rtl;
}

.pos-input:focus {
  outline: none;
  border-color: #2563eb;
  background: #fff;
}

.toggle-field label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
  cursor: pointer;
}

button {
  display: block;
  width: 100%;
  padding: 0.7rem;
  font-size: 1.1rem;
  font-family: inherit;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 1rem;
  transition: background 0.15s;
}

button:hover:not(:disabled) { background: #1d4ed8; }
button:disabled { background: #94a3b8; cursor: not-allowed; }

.status {
  font-size: 0.9rem;
  color: #555;
  min-height: 1.3em;
  margin-bottom: 0.5rem;
}

.results { font-size: 1.1rem; }

.result-count {
  font-weight: bold;
  color: #2563eb;
  margin-bottom: 0.5rem;
}

.result-word {
  padding: 0.25rem 0.4rem;
  border-bottom: 1px solid #eee;
  line-height: 1.8;
}

.result-word:last-child { border-bottom: none; }

.no-results { color: #888; font-style: italic; }
```

- [ ] **Step 2: Commit**

```powershell
git -C "c:/Users/rmelamed/Projects/crossword-solver" add style.css
git -C "c:/Users/rmelamed/Projects/crossword-solver" commit -m "feat: add RTL Hebrew styling"
```

---

## Task 5: App controller (`app.js`)

**Files:**
- Create: `app.js`

- [ ] **Step 1: Create `app.js`**

Create `c:/Users/rmelamed/Projects/crossword-solver/app.js`:

```javascript
(function() {
  var lengthInput  = document.getElementById('word-length');
  var posGrid      = document.getElementById('position-grid');
  var poolInput    = document.getElementById('pool');
  var uniqueToggle = document.getElementById('unique-mode');
  var searchBtn    = document.getElementById('search-btn');
  var statusEl     = document.getElementById('status');
  var resultsEl    = document.getElementById('results');

  var wordsByLength = new Map();

  // ── Word list loading ──────────────────────────────────────────────────
  fetch('words.txt')
    .then(function(r) { return r.text(); })
    .then(function(text) {
      var lines = text.split('\n').map(function(l) { return l.trim(); })
        .filter(function(l) {
          // keep non-empty, unvoweled words only
          return l.length > 0 && !/[ְ-ׇ]/.test(l);
        });
      wordsByLength = CrosswordFilter.buildWordIndex(lines);
      searchBtn.textContent = 'חפש';
      searchBtn.disabled = false;
      statusEl.textContent = 'מילון נטען — ' + lines.length + ' מילים';
    })
    .catch(function() {
      statusEl.textContent = 'שגיאה: לא ניתן לטעון את המילון';
    });

  // ── Position grid ──────────────────────────────────────────────────────
  function rebuildGrid() {
    var len = parseInt(lengthInput.value, 10);
    posGrid.innerHTML = '';
    if (!len || len < 1 || len > 30) return;
    for (var i = 1; i <= len; i++) {
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.maxLength = 1;
      inp.className = 'pos-input';
      inp.dataset.pos = i;
      inp.title = 'מיקום ' + i;
      posGrid.appendChild(inp);
    }
  }

  lengthInput.addEventListener('input', rebuildGrid);
  rebuildGrid();

  // ── Search ─────────────────────────────────────────────────────────────
  searchBtn.addEventListener('click', search);

  function search() {
    var length = parseInt(lengthInput.value, 10);
    if (!length || length < 1) {
      statusEl.textContent = 'נא להזין אורך מילה תקין';
      return;
    }

    var fixedPositions = new Map();
    var inputs = posGrid.querySelectorAll('.pos-input');
    for (var i = 0; i < inputs.length; i++) {
      var val = inputs[i].value.trim();
      if (val) fixedPositions.set(parseInt(inputs[i].dataset.pos, 10), val[0]);
    }

    var pool = poolInput.value.trim().replace(/\s/g, '').split('').filter(Boolean);
    var uniqueMode = uniqueToggle.checked;

    var results = CrosswordFilter.filterWords(wordsByLength, length, fixedPositions, pool, uniqueMode);
    render(results);
  }

  // ── Rendering ──────────────────────────────────────────────────────────
  function render(words) {
    resultsEl.innerHTML = '';
    statusEl.textContent = '';

    if (!words.length) {
      var none = document.createElement('div');
      none.className = 'no-results';
      none.textContent = 'לא נמצאו תוצאות';
      resultsEl.appendChild(none);
      return;
    }

    var count = document.createElement('div');
    count.className = 'result-count';
    count.textContent = words.length + ' תוצאות:';
    resultsEl.appendChild(count);

    for (var i = 0; i < words.length; i++) {
      var div = document.createElement('div');
      div.className = 'result-word';
      div.textContent = words[i];
      resultsEl.appendChild(div);
    }
  }
})();
```

- [ ] **Step 2: Commit**

```powershell
git -C "c:/Users/rmelamed/Projects/crossword-solver" add app.js
git -C "c:/Users/rmelamed/Projects/crossword-solver" commit -m "feat: add app controller and word loader"
```

---

## Task 6: Integration verification and final commit

**Files:**
- Commit: `words.txt`, `docs/`

- [ ] **Step 1: Commit the word list and docs**

```powershell
git -C "c:/Users/rmelamed/Projects/crossword-solver" add words.txt docs/
git -C "c:/Users/rmelamed/Projects/crossword-solver" commit -m "chore: add word list and design docs"
```

- [ ] **Step 2: Start a local HTTP server and open the app**

`fetch('words.txt')` is blocked by browsers when opening `index.html` as a `file://` URL. Serve the directory over HTTP instead:

```powershell
# Python 3 (usually pre-installed on Windows)
python -m http.server 8080 --directory "c:/Users/rmelamed/Projects/crossword-solver"
```

Then open [http://localhost:8080](http://localhost:8080) in a browser. Leave the server running while testing.

- [ ] **Step 3: Verify these scenarios manually**

**Scenario A — Position only, no pool:**
- Word length: 4
- Position 1: ש (rightmost box)
- Pool: (empty)
- Expected: all 4-letter words starting with ש

**Scenario B — Pool, repeat mode:**
- Word length: 3
- Positions: all blank
- Pool: א ב ג
- Unique mode: OFF
- Expected: 3-letter words whose every letter is one of א, ב, ג (repeats allowed)

**Scenario C — Pool, unique mode:**
- Word length: 3
- Positions: all blank
- Pool: א ב ג
- Unique mode: ON
- Expected: 3-letter words using each pool letter at most once

**Scenario D — Position + pool:**
- Word length: 5
- Position 3: ל (middle box)
- Pool: א ב ג ד
- Unique mode: ON
- Expected: 5-letter words with ל in position 3, all other letters drawn once from the pool

- [ ] **Step 4: Confirm the dictionary loaded** — status bar should read "מילון נטען — NNN מילים" with a plausible number.

- [ ] **Step 5: Final commit (if any fixups were needed)**

```powershell
git -C "c:/Users/rmelamed/Projects/crossword-solver" add -A
git -C "c:/Users/rmelamed/Projects/crossword-solver" commit -m "fix: integration fixups after manual verification"
```

Skip this step if no changes were needed.
