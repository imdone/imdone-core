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

  it('should parse todo text dateCreated', () => {
    let task = new Task({text: ' 2016-03-20 This was created on 3/20/2016'});
    (task.dateCreated).should.equal('2016-03-20')
  })

  it('should parse todo text dateCompleted', () => {
    let task = new Task({text: ' 2017-03-20 2016-03-20 This was created on 3/20/2016'});
    should(task.dateCreated).equal('2016-03-20')
    should(task.dateCompleted).equal('2017-03-20')
  })
})
