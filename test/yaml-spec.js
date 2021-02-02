const YAML = require('js-yaml')
const assert = require('assert')
const should = require('should')
const expect = require('expect.js')
describe('YAML', () => {
  it('loads and dumps !!js/function without adding space', () => {
    const yaml = `
myFunc: !<tag:yaml.org,2002:js/function> |-
  function () {
    return true
  }
`

    let loadedYaml = YAML.load(yaml)
    let dumpedYaml
    
    for (let i = 0; i < 10; i++) {
      dumpedYaml = YAML.dump(loadedYaml)
      console.log(dumpedYaml)
      loadedYaml = YAML.load(dumpedYaml)
    }
  })
})
