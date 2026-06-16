import YAML, { DEFAULT_SCHEMA, Type } from 'js-yaml'

const legacyJsFunctionType = new Type('tag:yaml.org,2002:js/function', {
  kind: 'scalar',
  construct: (data) => data || '',
})

const schema = DEFAULT_SCHEMA.extend([legacyJsFunctionType])

export function dumpYAML(obj, opts) {
  return YAML.dump(obj, opts)
}

export function loadYAML(str, opts) {
  return YAML.load(str, { schema, ...opts })
}
