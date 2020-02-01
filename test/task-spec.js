const assert = require('assert')
const should = require('should')
const expect = require('expect.js')
const Task = require('../lib/task')
describe('task', function() {
  describe('hasMetaData', function() {
    it('should return true for non array matches', function() {
      let task = new Task({text:'Do something special with this. +enhancement gh:12 ic:github'})
      should(task.hasMetaData('ic', 'github')).be.true();
    })
    it('should return true for array matches', function() {
      let task = new Task({text:'Do something special with this. +enhancement gh:12 ic:github ic:trello'})
      should(task.hasMetaData('ic', 'github')).be.true();
      should(task.hasMetaData('ic', 'trello')).be.true();
      should(task.hasMetaData('ic', ['github','trello'])).be.true();
    })
  })

  describe.skip('getTextAndDescription', () => {
    it('should only detect metadata when it\'s not in back ticks', () => {
      let task = new Task({text: 'this ` expand:1` is a bit of a `test:1 for us` expand:1 @sure @thing `+one` ` @two`'})
      let wholeTask = task.getText({stripMeta: true, sanitize: true, stripTags: true, stripContext: true})
      expect(wholeTask).to.be('this ` expand:1` is a bit of a `test:1 for us` `+one` ` @two`');
    })
  })

  describe('getMetaData', () => {
    it('should not add metadata that\'s not preceded with a "space"', () => {
      let task = new Task({text: '# should also use [formatDescription](src/utils/task-text-utils.js:33:1) +urgent'})
      should(task.hasMetaData('js', '33')).be.false();
    })
  })

  describe('removeMetaData', () => {
    it('should not remove metadata that\'s not preceded with a "space"', () => {
      const text = '# should also use [formatDescription](src/utils/task-text-utils.js:33:1) +urgent'
      let textWithoutMeta = Task.removeMetaData(text)
      expect(textWithoutMeta).to.be(text)
    })
  })
})
