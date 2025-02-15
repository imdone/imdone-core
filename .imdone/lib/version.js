const fs = require('fs');
const path = require('path');
const PACKAGE_PATH = path.join(__dirname, '../../package.json');

module.exports = function (incrementMinor) {
  delete require.cache[require.resolve(PACKAGE_PATH)];
  const packageJson = require(PACKAGE_PATH);
  let version = packageJson.version;

  if (incrementMinor) {
    const versionParts = version.split('.');
    versionParts[1] = parseInt(versionParts[1], 10) + 1; // Increment the minor version
    versionParts[2] = 0; // Reset the patch version
    version = versionParts.join('.');
  }

  return version;
};
