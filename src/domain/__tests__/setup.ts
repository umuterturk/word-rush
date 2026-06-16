import { beforeAll } from 'vitest';
import { ensureWordListLoaded } from '../wordSet';

beforeAll(async () => {
  await ensureWordListLoaded('tr');
});
