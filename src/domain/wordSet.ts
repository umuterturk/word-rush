export type WordLanguage = 'tr' | 'en';

const loaders: Record<WordLanguage, () => Promise<{ default: string[] }>> = {
  tr: () => import('./wordList.json'),
  en: () => import('./wordListEn.json'),
};

const wordArrays: Partial<Record<WordLanguage, readonly string[]>> = {};
const wordSets: Partial<Record<WordLanguage, Set<string>>> = {};
const loadPromises: Partial<Record<WordLanguage, Promise<void>>> = {};

function buildLetterFrequencies(words: readonly string[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const word of words) {
    for (const ch of word) {
      counts[ch] = (counts[ch] ?? 0) + 1;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const freq: Record<string, number> = {};
  for (const [ch, n] of Object.entries(counts)) {
    freq[ch] = n / total;
  }
  return freq;
}

const letterFrequencies: Partial<Record<WordLanguage, Readonly<Record<string, number>>>> = {};

/** Loads the word list for a language on first use. Safe to call multiple times. */
export function ensureWordListLoaded(language: WordLanguage): Promise<void> {
  if (wordArrays[language]) return Promise.resolve();

  if (!loadPromises[language]) {
    loadPromises[language] = loaders[language]().then(mod => {
      const words = mod.default as string[];
      wordArrays[language] = words;
      wordSets[language] = new Set(words);
      letterFrequencies[language] = buildLetterFrequencies(words);
    });
  }

  return loadPromises[language]!;
}

export function isWordListLoaded(language: WordLanguage): boolean {
  return wordArrays[language] !== undefined;
}

export function getWordList(language: WordLanguage): readonly string[] {
  const list = wordArrays[language];
  if (!list) {
    throw new Error(`Word list for "${language}" not loaded. Call ensureWordListLoaded first.`);
  }
  return list;
}

function turkishLower(str: string): string {
  return str.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

export function isValidWordForLanguage(word: string, language: WordLanguage): boolean {
  const chars = Array.from(word);
  if (chars.length < 3 || chars.length > 8) return false;
  const set = wordSets[language];
  if (!set) {
    throw new Error(`Word list for "${language}" not loaded. Call ensureWordListLoaded first.`);
  }
  if (language === 'en') return set.has(word.toLowerCase());
  return set.has(turkishLower(word));
}
