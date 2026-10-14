import { describe, it, expect } from 'vitest';

import { 
  getTaskContent,
  getHashStyleRegex,
  FILE_TYPES
} from '../CardContentParser'
import { Config } from '../../../../config'
const config = Config.newDefaultConfig()

describe('CardContentParser', () => {
  describe('getTaskContent', () => {
    it.each([undefined, 1, 3])('ignores blank-line termination in EOF mode with terminator %s', customCardTerminator => {
      const eofConfig = Config.newDefaultConfig({ settings: { cards: { endTaskAtEndOfFile: true, customCardTerminator } } })
      const content = '#TODO Task\nbody\n\n\n \t\nlast\n\n'
      const result = getTaskContent({ config: eofConfig, content, fileType: FILE_TYPES.MARKDOWN })
      expect(result.taskContentLines).toEqual(['body', '', '', ' \t', 'last', '', ''])
      expect(result.trailingBlankLines).to.equal(0)
    })
    it.each(['#TODO Next', '****'])('retains explicit boundary %s in EOF mode', boundary => {
      const eofConfig = Config.newDefaultConfig({ settings: { cards: { endTaskAtEndOfFile: true, customCardTerminator: '****' } } })
      const result = getTaskContent({ config: eofConfig, content: `#TODO Task\nbody\n\n\nlast\n${boundary}\noutside`, fileType: FILE_TYPES.MARKDOWN })
      expect(result.taskContentLines).toEqual(['body', '', '', 'last'])
    })
    it('keeps card-wrapper termination in EOF mode', () => {
      const eofConfig = Config.newDefaultConfig({ settings: { cards: { endTaskAtEndOfFile: true } } })
      const result = getTaskContent({ config: eofConfig, content: '#TODO Task\n<card>\nbody\n\n\nlast\n</card>\noutside', fileType: FILE_TYPES.MARKDOWN })
      expect(result.taskContentLines).toEqual(['body', '', '', 'last'])
    })
    it('should terminate a task in a markdown file with 2 blank lines', () => {
      const {
        rawTaskContentLines,
        taskContentLines,
        isWrappedWithCardTag
      } = getTaskContent({
        config,
        content: TASK_WITH_2_BLANK_LINES,
        fileType: FILE_TYPES.MARKDOWN
      })
      expect(isWrappedWithCardTag).to.not.be.true
      expect(rawTaskContentLines.length).to.equal(6)
      expect(taskContentLines.length).to.equal(4)
    })
    it('should return card content when the task is wrapped with card tags', () => {
      const {
        rawTaskContentLines,
        isWrappedWithCardTag,
        taskContentLines
      } = getTaskContent({
        config,
        content: TASK_WITH_CARD_TAGS,
        fileType: FILE_TYPES.MARKDOWN
      })
      expect(isWrappedWithCardTag).to.be.true
      expect(rawTaskContentLines.length).to.equal(8)
      expect(taskContentLines.length).to.equal(6)
    })
    it('should return card content when the task is terminated with a customCardTerminator', () => {
      const customConfig = Config.newDefaultConfig({
        settings: {
          cards: {
            customCardTerminator: '****'
          }
        }
      })
      const {
        rawTaskContentLines,
        isWrappedWithCardTag,
        taskContentLines
      } = getTaskContent({
        config: customConfig,
        content: TASK_WITH_CUSTOM_CARD_TERMINATOR,
        fileType: FILE_TYPES.MARKDOWN
      })
      expect(isWrappedWithCardTag).to.be.not.true
      expect(rawTaskContentLines.length).to.equal(4)
      expect(taskContentLines.length).to.equal(4)
    })
  })
})

const TASK_WITH_2_BLANK_LINES = `# #TODO A task that breaks with two blank lines

One blank line won't break a task.

But two blank lines will.


This is some more content in the file
`

const TASK_WITH_CARD_TAGS = `# #TODO A task that is wrapped with card tags
<card>
Some content in the card


More content in the card

and more
</card>
`

const TASK_WITH_CUSTOM_CARD_TERMINATOR = `# #TODO A task that is terminated with a custom card terminator

Some content in the card

More content in the card
****

Some more content in the file
`


describe('empty hashtag titles', () => {
  it.each(['#TODO', '#TODO ', '#TODO \t ', '#TODO:10', '#TODO:10 ', '#TODO:', '#TODO:\t'])('recognizes %j without consuming its body', heading => {
    const match = getHashStyleRegex().exec(`${heading}\nBody`)
    expect(match).not.toBeNull()
    expect(match[1]).toBe('TODO')
    expect(match[4].trim()).toBe('')
    expect(match[0]).not.toContain('\n')
  })
  it('supports custom prefixes and CRLF', () => {
    const match = getHashStyleRegex('!').exec('!TODO:10 \r\nBody')
    expect(match?.[1]).toBe('TODO')
    expect(match?.[4].trim()).toBe('')
  })
  it('keeps orderMeta capture groups and empty title', () => {
    const match = getHashStyleRegex('#', true).exec('#TODO\nBody')
    expect(match?.slice(1)).toEqual(['TODO', ''])
  })
  it.each(['#TODOish!', '#TODO:10oops', '#TODO/other'])('does not split longer tokens in %j', text => {
    expect(getHashStyleRegex().exec(text)).toBeNull()
  })
})
