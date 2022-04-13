const Mocha = require('mocha')
const { EVENT_TEST_PASS, EVENT_TEST_FAIL, EVENT_RUN_END } =
  require('mocha/lib/runner').constants
const Base = require('mocha/lib/reporters/base')
const glob = require('glob')
const _path = require('path')
const EventEmitter = require('events')

function getMochaConfig(project) {
  return require(_path.join(project.path, '.mocharc.json'))
}

async function globAsync(pattern, opts) {
  return new Promise((resolve, reject) => {
    glob(pattern, opts, (err, files) => {
      if (err) reject(err)
      resolve(files)
    })
  })
}

async function getTestFiles(project) {
  const mochaConfig = getMochaConfig(project)
  console.log('mochaConfig:', mochaConfig)
  const watchFiles = getMochaConfig(project)['watch-files']
  console.log('watchFiles:', watchFiles)
  const results = await Promise.all(
    watchFiles.map((pattern) =>
      globAsync(pattern, {
        cwd: project.path,
        absolute: true,
      })
    )
  )
  return results.flat()
}

class ReporterFactory extends EventEmitter {
  constructor() {
    super()
    this.pass = 0
    this.fail = 0
    const self = this
    this.reporter = function (runner) {
      Base.call(this, runner)
      runner
        .on(EVENT_TEST_FAIL, () => self.fail++)
        .on(EVENT_TEST_PASS, () => self.pass++)
        .once(EVENT_RUN_END, () => self.emit('done'))
    }
  }

  toJSON() {
    return {
      pass: this.pass,
      fail: this.fail,
    }
  }
}

async function runTests(project) {
  process.chdir(project.path)
  const testFiles = await getTestFiles(project)
  return new Promise(async (resolve, reject) => {
    try {
      const reporterFactory = new ReporterFactory()
      const mocha = new Mocha({
        reporter: reporterFactory.reporter,
      })
      testFiles.forEach((testFile) => mocha.addFile(testFile))
      reporterFactory.on('done', () => resolve(reporterFactory))
      mocha.run()
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = { runTests }
