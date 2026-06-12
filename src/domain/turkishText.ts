/** Uppercase a single Turkish letter for display. Always uses the first codepoint only. */
export function turkishUpper(raw: string): string {
  const ch = Array.from(raw)[0];
  if (!ch) return '';
  if (ch === 'i') return 'İ';
  if (ch === 'ı') return 'I';
  return ch.toLocaleUpperCase('tr-TR');
}
