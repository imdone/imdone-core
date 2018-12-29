console.log('in child process')
const Repository = require('imdone-core/lib/repository')
const Config = require('imdone-core/lib/config')
const watchedFsStore = require('imdone-core/lib/mixins/repo-watched-fs-store')
let repo = null
let repoFilter = null

function toJSON () {
  return {path: repo.path, config: repo.config, lists: getTasksByList(), filter: repoFilter}
}

function getTasksByList () {
  if (repoFilter) return repo.query(repoFilter)
  return repo.getTasksByList()
}

const commands = {
  init ({path}) {
    console.log('Initializing repo at path:', path)
    return new Promise((resolve, reject) => {
      repo = watchedFsStore(new Repository(path.toString()))
      repo.init(err => {
        if (err) return reject(err)
        repo.emit = (event, data) => {
          console.log(`Received ${event} for ${repo.path}`)
          process.send({event, data})
        }
        resolve({path, lists: getTasksByList(), config:repo.config})
      })
    })
  },
  getTasks () {
    return new Promise((resolve, reject) => {
      resolve(getTasksByList())
    })
  },
  getTask ({id}) {
    return new Promise((resolve, reject) => {
      resolve(repo.getTask(id))
    })
  },
  moveTask ({task, newList, oldList, newIndex}) {
    return new Promise((resolve, reject) => {
      repo.moveTasks([task], newList, newIndex, true, (err) => {
        if (err) return reject(err)
        resolve(toJSON())
      })
    })
  },
  saveConfig ({config}) {
    return new Promise((resolve, reject) => {
      repo.config.code = config.code
      repo.config.lists = config.lists
      repo.saveConfig(err => {
        if (err) return reject(err)
        resolve(getTasksByList())
      })
    })
  },
  addList ({name}) {
    return new Promise((resolve, reject) => {
      repo.addList({name}, err => {
        if (err) return reject(err)
        resolve(getTasksByList())
      })
    })
  },
  removeList ({name}) {
    return new Promise((resolve, reject) => {
      repo.removeList(name, err => {
        if (err) return reject(err)
        resolve(getTasksByList())
      })
    })
  },
  filter ({filter}) {
    repoFilter = filter
    return new Promise((resolve, reject) => {
      resolve(getTasksByList())
    })
  },
  getRepoJSON () {
    return toJSON()
  }
}

process.on('message', (request) => {
  console.log('request:', request)
  const { cmd, id, params } = request
  const command = commands[cmd]
  if (!command) return process.send({request, id, err: 'command not found'})
  command(params)
  .then(data => process.send({request, id, data}))
  .catch(err => {
    console.log('error caught in worker', err)
    process.send({request, id, err})
  })
})

var cleanExit = function() {
  repo.destroy()
  setTimeout(() => process.exit(), 500)
}

process.on('SIGINT', cleanExit) // catch ctrl-c
process.on('SIGTERM', cleanExit) // catch kill
