const should  = require('should')
const expect = require('expect.js')
const sinon  = require('sinon')
const helper = require('./helper')
const {ImdoneRepoWorkerProxy} = require('../lib/repo-worker-proxy')
const Task = require('../lib/task')
const File = require('../lib/file')

describe.only('ImdoneRepoWorkerProxy', function () {
  let repo
  beforeEach(function () {
    repo = new ImdoneRepoWorkerProxy(helper.getFreshRepo())
  })
  afterEach(function (done) {
    setTimeout(() => {
      repo.destroy()
      done()
    }, 500)
  })
  describe('init', function () {
    it('should initialize an imdone repo and emit it\'s lists', function(done) {
      repo.on('initialized', ({ok, lists}) => {
        should(ok).be.true
        should(lists).be.an.object
        done()
      })
      repo.init()
    })
  })
  describe('modifyTask', function () {
    it('should successfuly modify the metaData', function(done) {
      repo.on('initialized', ({ok, lists}) => {
        let list = lists.find(list => list.name === 'DONE')
        let task = list.tasks[0]
        task.addMetaData('id', 22)
        repo.on('file.saved', (file) => {
          let task = file.getTask(22)
          should(task).be.an.object
          done()
        })
        repo.modifyTask(task, true)
      })
      repo.init()
    })
  })
})
