import AdmZip from 'adm-zip';
import { cp, rm } from './file-gateway.js'
import path from 'node:path'
import { pluginNetworkError, pluginRequestTimeout } from './plugin-network.js';

export async function downloadPlugin(repo, dest, { deadlineAt } = {}) {
  const url = github(normalize(repo));
  const timeoutMs = pluginRequestTimeout('github.com', deadlineAt);
  const controller = new AbortController();
  const timeoutError = pluginNetworkError('github.com', 'NETWORK_TIMEOUT', `timed out after ${timeoutMs}ms`);
  let timedOut = false;
  let rejectTimeout;
  const timeout = new Promise((_, reject) => { rejectTimeout = reject; });
  const timer = setTimeout(() => {
    timedOut = true;
    rejectTimeout(timeoutError);
    controller.abort();
  }, timeoutMs);
  let arrayBuffer;
  try {
    arrayBuffer = await Promise.race([timeout, (async () => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        controller.abort();
        throw pluginNetworkError('github.com', 'HTTP_ERROR', `returned HTTP ${response.status}`);
      }
      return response.arrayBuffer();
    })()]);
  } catch (error) {
    controller.abort();
    if (timedOut) throw timeoutError;
    if (error?.code?.startsWith('IMDONE_PLUGIN_')) throw error;
    throw pluginNetworkError('github.com', 'NETWORK_ERROR', 'could not download the plugin archive');
  } finally {
    clearTimeout(timer);
  }
  const buffer = Buffer.from(arrayBuffer);
  const zip = AdmZip(buffer);
  await zip.extractAllToAsync(dest, true);
  const zipEntries = zip.getEntries();
  const rootFolder = zipEntries[0].entryName.split(path.sep)[0];
  const rootFolderPath = path.join(dest, rootFolder)
  await cp(rootFolderPath, dest, {
    recursive: true,
    force: true,      // overwrite if needed
    errorOnExist: false,
  });
  await rm(rootFolderPath, {
    recursive: true,
    force: true,      // overwrite if needed
  });
}

function github(repo) {
  return 'https://github.com/'
    + repo.owner
    + '/'
    + repo.name
    + '/archive/'
    + repo.branch
    + '.zip';
}

function normalize(string) {
  let [owner, name] = string.split('/');
  let branch = 'master';

  if (name.includes('#')) {
    [name, branch] = name.split('#');
  }

  return {
    owner,
    name,
    branch
  };
}
