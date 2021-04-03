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

  describe('getTextAndDescription', () => {
    it.skip('should only detect metadata when it\'s not in back ticks', () => {
      let task = new Task({text: 'this ` expand:1` is a bit of a `test:1 for us` expand:1 @sure @thing `+one` ` @two`'})
      let wholeTask = task.getText({stripMeta: true, sanitize: true, stripTags: true, stripContext: true})
      expect(wholeTask).to.be('this ` expand:1` is a bit of a `test:1 for us` `+one` ` @two`');
    })

    it('should remove expand:1 from text', () => {
      let task = new Task({})
      let wholeTask = task.getText({stripMeta: true, sanitize: true, stripTags: true, stripContext: true}, 'A new task with expand:1')
      expect(wholeTask).to.be('A new task with');
    })
  })

  describe('getMetaData', () => {
    it('should not add metadata that\'s not preceded with a "space"', () => {
      let task = new Task({text: '# should also use [formatDescription](src/utils/task-text-utils.js:33:1) +urgent'})
      should(task.hasMetaData('js', '33')).be.false();
    })

    it('should find metadata in quotes', () => {
      let task = new Task({text: '# should also use [formatDescription](src/utils/task-text-utils.js:33:1) +urgent epic:"My Epic"'})
      should(task.hasMetaData('epic', 'My Epic')).be.true()
    })
  })

  describe('removeMetaDataFromText', () => {
    it('should not remove metadata that\'s not preceded with a "space"', () => {
      const text = '# should also use [formatDescription](src/utils/task-text-utils.js:33:1) +urgent'
      let textWithoutMeta = Task.removeMetaDataFromText(text)
      expect(textWithoutMeta).to.be(text)
    })
  })
  describe('getListTrackingMeta', () => {
    it('should return empty list tracking metadata from a new task', () => {
      const lists = ['TODO', 'DOING', 'DONE'] 
      const task = new Task({list: 'TODO', text: '# should also use [formatDescription](src/utils/task-text-utils.js:33:1) +urgent'})
      const listTrackingMeta = task.getListTrackingMeta(lists)
      expect(listTrackingMeta).to.have.length(0)
    })
    it('should return all list tracking metadata sorted by value from a task', () => {
      const lists = ['TODO', 'DOING', 'DONE'] 
      const task = new Task({list: 'TODO', text: '# This task has been added to DOING:2021-02-23 TODO:2021-02-25 TODO:2021-02-22 DONE:2021-02-24'})
      const listTrackingMeta = task.getListTrackingMeta(lists)
      expect(listTrackingMeta).to.have.length(4)
    })
  })
  describe('hasListChanged', () => {
    it('should return true if there is no list tracking metadata', () => {
      const lists = ['TODO', 'DOING', 'DONE'] 
      const task = new Task({list: 'TODO', text: '# should also use [formatDescription](src/utils/task-text-utils.js:33:1) +urgent'})
      expect(task.hasListChanged(lists)).to.be(true)
    })
    it('should return false if the current list is the last list', () => {
      const lists = ['TODO', 'DOING', 'DONE'] 
      const task = new Task({list: 'TODO', text: '# This task has been added to DOING:2021-02-23 TODO:2021-02-25 TODO:2021-02-22 DONE:2021-02-24'})
      expect(task.hasListChanged(lists)).to.be(false)
    })
    it('should return true if the current list is not the last list', () => {
      const lists = ['TODO', 'DOING', 'DONE'] 
      const task = new Task({list: 'TODO', text: '# This task has been added to DOING:2021-02-23 DOING:2021-02-25 TODO:2021-02-22 DONE:2021-02-24'})
      expect(task.hasListChanged(lists)).to.be(true)
    })
  })
})
