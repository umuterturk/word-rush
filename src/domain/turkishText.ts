import type { GameLanguage } from './types';

/** Uppercase a single Turkish letter for display. Always uses the first codepoint only. */
export function turkishUpper(raw: string): string {
  const ch = Array.from(raw)[0];
  if (!ch) return '';
  if (ch === 'i') return 'İ';
  if (ch === 'ı') return 'I';
  return ch.toLocaleUpperCase('tr-TR');
}

/** Uppercase a single letter using language-specific casing rules. */
export function upperByLanguage(raw: string, language: GameLanguage): string {
  const ch = Array.from(raw)[0];
  if (!ch) return '';
  if (language === 'tr') return turkishUpper(ch);
  return ch.toUpperCase();
}

/** Uppercase every letter in a word using language-specific casing rules. */
export function upperWordByLanguage(raw: string, language: GameLanguage): string {
  return Array.from(raw).map(ch => upperByLanguage(ch, language)).join('');
}
