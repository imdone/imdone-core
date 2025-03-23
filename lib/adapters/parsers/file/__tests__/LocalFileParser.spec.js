import { describe, it, expect } from 'vitest'
import { getFileParser } from '../LocalFileParserFactory'
import { Config } from '../../../../config'
import path from 'path'

const config = Config.newDefaultConfig()

describe('LocalFileParser', () => {
  describe('readTask', () => {
    it('reads a single task from a file', async () => {
      const parser = await getFileParser(
        path.join(__dirname, 'test-big-file.md'),
        config
      )
      const task = await parser.readTask()
      parser.close()
      expect(task).to.be.ok
    })

    it('parses a file', async () => {
      const parser = await getFileParser(
        path.join(__dirname, 'test-big-file.md'),
        config
      )
      const tasks = []
      let task = true
      while (task) {
        task = await parser.readTask()
        if (task) tasks.push(task)
      }
      parser.close()
      expect(tasks.length).to.equal(629)
    })

    it.skip('parses a file with a checkbox task', async () => {
      var config = Config.newDefaultConfig()
      config.settings = {
        cards: {
          addCheckBoxTasks: true,
        },
      }
      const parser = await getFileParser(
        path.join(__dirname, 'test-big-file.md'),
        config
      )
      const tasks = []
      let task = true
      while (task) {
        task = await parser.readTask()
        if (task) tasks.push(task)
      }
      parser.close()
      tasks.length.should.be.exactly(630)
    })

    it('Reads a single task from a code file', async () => {
      const parser = await getFileParser(
        path.join(__dirname, 'code-file.js'),
        config
      )
      const task = await parser.readTask()
      parser.close()
      expect(task).to.be.ok
    })
  })
})
