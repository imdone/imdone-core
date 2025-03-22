import fetch from 'node-fetch';
import AdmZip from 'adm-zip';

export default async function download(repo, dest) {
  const url = github(normalize(repo));
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const zip = new AdmZip(buffer);
  zip.extractAllTo(dest, true);
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