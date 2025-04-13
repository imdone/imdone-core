import fetch from 'node-fetch';
import AdmZip from 'adm-zip';
import { cp, rm } from './file-gateway.js'
import path from 'node:path'

export async function downloadPlugin(repo, dest) {
  const url = github(normalize(repo));
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
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