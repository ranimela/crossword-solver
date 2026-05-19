# Crossword Solver — Design Spec
Date: 2026-05-19

## Overview

A static web app (HTML/JS/CSS, no build step) for solving Hebrew crossword clues. The user knows the target word length and may know some letters at fixed positions. They can optionally supply a pool of letters to constrain the unknown positions. The app finds all valid Hebrew words matching these constraints.

---

## File Structure

```
crossword-solver/
├── index.html   — UI shell and layout
├── style.css    — RTL-aware Hebrew styling
├── app.js       — all logic: loading, filtering, rendering
└── words.txt    — Hebrew word list, fetched at startup
```

**Word list source:** [eyaler/hebrew_wordlists](https://github.com/eyaler/hebrew_wordlists) — extracted from Hspell 1.4, unvoweled Hebrew, AGPL-3.0 license.

---

## UI Layout

- **Word length input** — number field; drives the position grid below
- **Position grid** — N input boxes rendered dynamically in RTL order (rightmost box = position 1); each accepts a single Hebrew letter or is left blank (unknown)
- **Letter pool** (optional) — free-text input for available letters (e.g. "אבגדה"); applies only to unfixed positions
- **Uniqueness toggle** — "כל אות פעם אחת" (each letter used once) vs. "חזרות מותרות" (repeats allowed)
- **Search button**
- **Results list** — RTL scrollable list of matching words with result count

---

## Architecture

### Load Phase (once at startup)
1. `fetch("words.txt")` — load the Hebrew word list
2. Split by newline; strip any voweled entries (characters in Unicode range U+05B0–U+05BD)
3. Build `wordsByLength: Map<number, string[]>` — all words grouped by character length
4. Mark app as ready; disable search until load completes

### Filter Phase (on each search)
Inputs: length `L`, fixed positions `Map<index, letter>`, pool `string` (may be empty), uniqueness toggle `boolean`

1. Retrieve `candidates = wordsByLength[L] ?? []`
2. **Position filter** — reject any candidate where `candidate[i] !== fixedLetter` for any pinned index `i`
3. **Pool filter** (skipped if pool is empty):
   - Build a multiset `poolCounts: Map<letter, number>` from the pool string
   - For each unfixed position `i` in the candidate:
     - **Unique mode** (`each letter once`): consume `candidate[i]` from `poolCounts`; reject if count is 0
     - **Repeat mode** (`repeats allowed`): check `poolCounts.has(candidate[i])`; reject if missing
4. Collect all passing candidates as results

### Key rules
- Pinned letters are **not** drawn from the pool. The pool is exclusively for unfixed positions. If a letter appears both pinned and in the pool, it means the word contains that letter at least twice.
- If the pool has fewer letters than unfixed positions in unique mode, no word can match — this is correct behavior, not an error.
- Word length is always provided by the user; no length inference is needed.

---

## Non-Goals
- Nikud (vowel diacritics) — not supported; all matching is on unvoweled text
- Word definitions, frequency, or part-of-speech — results are word strings only
- Backend / server — purely client-side
- Anagram generation — the tool finds words matching a pattern, not all permutations of a set
