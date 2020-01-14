const assert = require('assert')
const should = require('should')
const expect = require('expect.js')
const tools = require('../lib/tools')
describe('tools', function() {
  describe('replaceDateLanguage', function() {
    it('should return a filter with date language replaced', function() {
      const filter = tools.replaceDateLanguage('due=lt=(${tomorrow at 2PM})')
    })
  })
})
