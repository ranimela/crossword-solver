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
      inp.setAttribute('autocomplete', 'off');
      inp.setAttribute('aria-label', 'אות במיקום ' + i);
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
