import { describe, it, expect } from 'vitest'
import { getFileParser } from '../LocalFileParserFactory'
import { Config } from '../../../../config'
import path from 'path'
import { readFile } from 'node:fs/promises'
import { Readable } from 'node:stream'

const config = Config.newDefaultConfig()

async function readTasks(parser) {
  const tasks = []
  let task = true
  while (task) {
    task = await parser.readTask()
    if (task) tasks.push(task)
  }
  parser.close()
  return tasks
}

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
      const tasks = await readTasks(parser)
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
      const tasks = await readTasks(parser)
      tasks.length.should.be.exactly(630)
    })

    it('Reads a block comment task from a code file', async () => {
      const parser = await getFileParser(
        path.join(__dirname, 'code-file.js'),
        config
      )
      const tasks = await readTasks(parser)

      expect(tasks).toEqual([
        expect.objectContaining({
          content: expect.stringContaining('#DOING: A task'),
          line: 3,
          lastLine: 6,
          inBlockComment: true,
          singleLineBlockComment: false,
          beforeText: '#',
          colon: ':',
          list: 'DOING',
          text: 'A task',
          type: 'CODE',
        }),
      ])
    })

    it('Reads adjacent single-line comment tasks from a code stream', async () => {
      const parser = await getFileParser(
        '/tmp/example.js',
        config,
        Readable.from([
          '// TODO: Stream task\n',
          '// More detail\n',
          'const x = 1\n',
        ])
      )
      const tasks = await readTasks(parser)

      expect(tasks).toEqual([
        expect.objectContaining({
          content: expect.stringContaining('TODO: Stream task\nMore detail'),
          line: 1,
          lastLine: 2,
          inBlockComment: false,
          singleLineBlockComment: false,
          beforeText: '',
          colon: ':',
          list: 'TODO',
          text: 'Stream task',
          type: 'CODE',
        }),
      ])
    })

    it('parses code style tasks without a colon separator', async () => {
      const parser = await getFileParser(
        '/tmp/example-no-colon.js',
        config,
        Readable.from([
          '// NOTE id:a1 This uses no colon\n',
          '// continuation line\n',
        ])
      )
      const tasks = await readTasks(parser)

      expect(tasks).toEqual([
        expect.objectContaining({
          content: expect.stringContaining('NOTE id:a1 This uses no colon\ncontinuation line'),
          line: 1,
          lastLine: 2,
          inBlockComment: false,
          singleLineBlockComment: false,
          beforeText: '',
          list: 'NOTE',
          text: 'id:a1 This uses no colon',
          type: 'CODE',
        }),
      ])
    })

    it('does not buffer the code parser stream into a full file string', async () => {
      const source = await readFile(
        path.join(__dirname, '../ReadStreamCodeParser.js'),
        'utf8'
      )

      expect(source).not.toContain('streamToString')
    })
  })
})
