import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { downloadPlugin } from '../git-download.js';

const roots = [];
afterEach(async () => {
  vi.useRealTimers(); vi.unstubAllGlobals();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('plugin archive network boundaries', () => {
  it.each(['headers', 'body'])('aborts a stalled archive %s within the discovery budget', async stage => {
    vi.useFakeTimers();
    let signal;
    vi.stubGlobal('fetch', (_url, options) => {
      signal = options?.signal;
      const stall = () => new Promise((_, reject) => signal?.addEventListener('abort', () => reject(new Error('private abort detail'))));
      return stage === 'headers' ? stall() : Promise.resolve({ ok: true, arrayBuffer: stall });
    });
    let failure;
    downloadPlugin('owner/plugin', '/unused-destination', { deadlineAt: Date.now() + 200 }).catch(error => { failure = error; });
    await vi.advanceTimersByTimeAsync(201);
    expect(failure?.code).toBe('IMDONE_PLUGIN_NETWORK_TIMEOUT');
    expect(signal?.aborted).toBe(true);
    expect(failure?.message).not.toContain('private');
  });

  it('still downloads and extracts a successful plugin archive', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'plugin-download-'));
    roots.push(root);
    const zip = new AdmZip();
    zip.addFile('plugin-main/bundle.js', Buffer.from('plugin fixture'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => zip.toBuffer() }));
    await downloadPlugin('owner/plugin', root);
    expect(await readFile(path.join(root, 'bundle.js'), 'utf8')).toBe('plugin fixture');
  });

  it.each(['http', 'transport'])('sanitizes archive %s failures', async mode => {
    vi.stubGlobal('fetch', mode === 'http'
      ? vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: 'private proxy response' })
      : vi.fn().mockRejectedValue(new Error('private transport details')));
    const error = await downloadPlugin('owner/plugin', '/unused-destination').then(() => null, error => error);
    expect(error?.code).toMatch(/^IMDONE_PLUGIN_/);
    expect(error?.message).toMatch(/proxy|Zscaler/);
    expect(error?.message).not.toContain('private');
  });
});
