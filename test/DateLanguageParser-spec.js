const { replaceDateLanguage } = require('../lib/adapters/parsers/DateLanguageParser')
describe('DateLanguageParser', function() {
  describe('replaceDateLanguage', function() {
    it('should return a filter with date language replaced', function() {
      const filter = replaceDateLanguage('due=lt=(${tomorrow at 2PM})')
    })
  })
})
