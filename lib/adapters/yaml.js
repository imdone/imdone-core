import YAML from 'js-yaml'

export function dumpYAML(obj, opts) {
  return YAML.dump(obj, opts)
}

export function loadYAML(str, opts) {
  return YAML.load(str, opts)
}
