const assert = require('assert')
const should = require('should')
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
})
