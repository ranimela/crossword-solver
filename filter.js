(function(exports) {

  /**
   * @param {string[]} lines
   * @returns {Map<number, string[]>}
   */
  function buildWordIndex(lines) {
    var index = new Map();
    for (var i = 0; i < lines.length; i++) {
      var word = lines[i];
      if (!word || !word.trim()) continue;
      var len = word.length;
      if (!index.has(len)) index.set(len, []);
      index.get(len).push(word);
    }
    return index;
  }

  /**
   * @param {string} word
   * @param {Map<number, string>} fixedPositions  1-based position → letter
   * @returns {boolean}
   */
  function matchesPositions(word, fixedPositions) {
    for (var entry of fixedPositions) {
      var pos = entry[0], letter = entry[1];
      if (word[pos - 1] !== letter) return false;
    }
    return true;
  }

  // pool is an array of letters; applies only to unfixed positions
  // pinned letters are never drawn from the pool
  /**
   * @param {string} word
   * @param {Map<number, string>} fixedPositions  1-based position → letter
   * @param {string[]} pool
   * @param {boolean} uniqueMode
   * @returns {boolean}
   */
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

  /**
   * @param {Map<number, string[]>} wordsByLength
   * @param {number} length
   * @param {Map<number, string>} fixedPositions  1-based position → letter
   * @param {string[]} pool
   * @param {boolean} uniqueMode
   * @returns {string[]}
   */
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
