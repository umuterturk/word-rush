import type { WordReportPort } from '../ports';

export class NoopWordReportAdapter implements WordReportPort {
  async reportWord(_word: string, _language: 'tr' | 'en'): Promise<void> {}
}
