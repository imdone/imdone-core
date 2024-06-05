const YAML = require('js-yaml')

module.exports = {
  dumpYAML: YAML.dump,
  loadYAML: YAML.load,
}