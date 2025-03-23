var wget = require('download');

module.exports = download;

async function download(repo, dest) {
  var url = github(normalize(repo));
  return wget(url, dest, { extract: true, strip: 1 })
}

function github(repo){
  return 'https://github.com/'
    + repo.owner
    + '/'
    + repo.name
    + '/archive/'
    + repo.branch
    + '.zip';
}

function normalize(string){
  var owner = string.split('/')[0];
  var name = string.split('/')[1];
  var branch = 'master';

  if (~name.indexOf('#')) {
    branch = name.split('#')[1];
    name = name.split('#')[0];
  }

  return {
    owner: owner,
    name: name,
    branch: branch
  };
}