import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AdmZip from 'adm-zip';
import { cp, rm } from '../file-gateway.js';
import { downloadPlugin } from '../git-download';

vi.mock('adm-zip');
vi.mock('../file-gateway.js');

describe('downloadPlugin', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should download and extract the zip file', async () => {
    const repo = 'owner/repo#branch';
    const dest = '/path/to/dest';

    const mockResponse = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };

    globalThis.fetch.mockResolvedValue(mockResponse);
    cp.mockResolvedValue();
    rm.mockResolvedValue();

    const mockExtractAllToAsync = vi.fn();
    AdmZip.mockImplementation(() => ({
      extractAllToAsync: mockExtractAllToAsync,
      getEntries: vi.fn().mockReturnValue([{ entryName: 'rootFolder/' }]),
    }));

    await downloadPlugin(repo, dest);

    expect(globalThis.fetch).toHaveBeenCalledWith('https://github.com/owner/repo/archive/branch.zip');
    expect(mockResponse.arrayBuffer).toHaveBeenCalled();
    expect(mockExtractAllToAsync).toHaveBeenCalledWith(dest, true);
  });

  it('should throw an error if the fetch fails', async () => {
    const repo = 'owner/repo#branch';
    const dest = '/path/to/dest';

    const mockResponse = {
      ok: false,
      statusText: 'Not Found',
    };

    globalThis.fetch.mockResolvedValue(mockResponse);

    await expect(downloadPlugin(repo, dest)).rejects.toThrow('Failed to fetch https://github.com/owner/repo/archive/branch.zip: Not Found');
  });
});
