import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeChecksum } from '../checksum.js';

describe('computeChecksum', () => {
  it('computes a checksum from a file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'imdone-core-checksum-'));
    const filePath = join(directory, 'fixture.txt');
    const contents = 'checksum fixture';

    try {
      await writeFile(filePath, contents);

      expect(await computeChecksum(filePath, 'sha1', true)).toBe(
        createHash('sha1').update(contents).digest('hex'),
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
