const PACKAGE_PATH = '../../../package.json'
module.exports = function () {
  delete require.cache[require.resolve(PACKAGE_PATH)]
  return require(PACKAGE_PATH).version
}
