import { describe, it, expect, vi } from 'vitest';
import fetch from 'node-fetch';
import AdmZip from 'adm-zip';
import download from '../git-download';

vi.mock('node-fetch');
vi.mock('adm-zip');

describe('download', () => {
  it('should download and extract the zip file', async () => {
    const repo = 'owner/repo#branch';
    const dest = '/path/to/dest';

    const mockResponse = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    };

    fetch.mockResolvedValue(mockResponse);

    const mockExtractAllTo = vi.fn();
    AdmZip.mockImplementation(() => ({
      extractAllTo: mockExtractAllTo,
    }));

    await download(repo, dest);

    expect(fetch).toHaveBeenCalledWith('https://github.com/owner/repo/archive/branch.zip');
    expect(mockResponse.arrayBuffer).toHaveBeenCalled();
    expect(mockExtractAllTo).toHaveBeenCalledWith(dest, true);
  });

  it('should throw an error if the fetch fails', async () => {
    const repo = 'owner/repo#branch';
    const dest = '/path/to/dest';

    const mockResponse = {
      ok: false,
      statusText: 'Not Found',
    };

    fetch.mockResolvedValue(mockResponse);

    await expect(download(repo, dest)).rejects.toThrow('Failed to fetch https://github.com/owner/repo/archive/branch.zip: Not Found');
  });
});