/**
 * Preprocesses the Turkish word list into a compact JSON array for the game.
 *
 * Filters:
 *  - No spaces (single-word entries only)
 *  - Starts with a lowercase letter (excludes proper nouns)
 *  - 3–8 characters (game word length range)
 *  - Only standard Turkish alphabet characters
 *  - Excludes words in scripts/blocklist-tr.txt
 *
 * Output: src/domain/wordList.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Turkish-locale lowercase: İ→i, I→ı (critical for correct Turkish case folding)
function turkishLower(str) {
  return str.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

const blocklist = new Set(
  readFileSync(join(__dirname, 'blocklist-tr.txt'), 'utf-8')
    .split('\n')
    .map(line => line.replace(/#.*$/, '').trim())
    .filter(Boolean)
    .map(turkishLower),
);

const raw = readFileSync(join(root, 'turkce_kelime_listesi.txt'), 'utf-8');
const lines = raw.split('\n');

// Match only standard modern Turkish lowercase letters (no circumflex variants â î û)
const turkishAlpha = /^[a-zçğıöşü]+$/;
// Proper noun detector (starts with an uppercase Turkish letter)
const startsUppercase = /^[A-ZÇĞİÖŞÜ]/;

const seen = new Set();
const words = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  if (startsUppercase.test(trimmed)) continue;  // proper noun
  if (trimmed.includes(' ')) continue;           // multi-word phrase

  const lower = turkishLower(trimmed);
  const chars = Array.from(lower);               // Unicode-safe length

  if (chars.length < 3 || chars.length > 8) continue;
  if (!turkishAlpha.test(lower)) continue;       // remove punctuation, numbers, etc.
  if (blocklist.has(lower)) continue;
  if (seen.has(lower)) continue;

  seen.add(lower);
  words.push(lower);
}

words.sort();

// Letter frequency stats (for diagnostics)
const counts = {};
for (const word of words) {
  for (const ch of word) {
    counts[ch] = (counts[ch] ?? 0) + 1;
  }
}
const total = Object.values(counts).reduce((a, b) => a + b, 0);
const freqEntries = Object.entries(counts)
  .map(([ch, n]) => [ch, n / total])
  .sort((a, b) => b[1] - a[1]);

console.log(`\nFiltered word count: ${words.length}`);
console.log('\nLetter frequencies (top 15):');
freqEntries.slice(0, 15).forEach(([ch, f]) => {
  console.log(`  ${ch}  ${(f * 100).toFixed(2)}%`);
});
console.log(`\nDistinct letters: ${freqEntries.length}`);

mkdirSync(join(root, 'src/domain'), { recursive: true });
const outPath = join(root, 'src/domain/wordList.json');
writeFileSync(outPath, JSON.stringify(words));
console.log(`\nWritten: ${outPath} (${Math.round(JSON.stringify(words).length / 1024)} KB)`);
