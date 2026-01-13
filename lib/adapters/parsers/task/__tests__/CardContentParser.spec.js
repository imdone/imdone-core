const { 
  getTaskContent,
  FILE_TYPES
} = require('../CardContentParser')
const expect = require('expect.js')
const Config = require('../../../../config')
const { DEFAULT_CONFIG } = require('../../../../constants')
const config = new Config(DEFAULT_CONFIG)

describe('CardContentParser', () => {
  describe('getTaskContent', () => {
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
      expect(isWrappedWithCardTag).to.not.be(true)
      expect(rawTaskContentLines.length).to.be(6)
      expect(taskContentLines.length).to.be(4)
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
      expect(isWrappedWithCardTag).to.be(true)
      expect(rawTaskContentLines.length).to.be(8)
      expect(taskContentLines.length).to.be(6)
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
      expect(isWrappedWithCardTag).to.be()
      expect(rawTaskContentLines.length).to.be(4)
      expect(taskContentLines.length).to.be(4)
    })
    it('should return card content when the task is terminated with 3 blank lines', () => {
      const customConfig = Config.newDefaultConfig({
        settings: {
          cards: {
            customCardTerminator: 3
          }
        }
      })
      const {
        rawTaskContentLines,
        isWrappedWithCardTag,
        taskContentLines
      } = getTaskContent({
        config: customConfig,
        content: TASK_WITH_3_BLANK_LINES,
        fileType: FILE_TYPES.MARKDOWN
      })
      expect(isWrappedWithCardTag).to.be()
      expect(rawTaskContentLines.length).to.be(10)
      expect(taskContentLines.length).to.be(7)
    })

    it('should preserve 2 blank lines when customCardTerminator is 3', () => {
      const customConfig = Config.newDefaultConfig({
        settings: {
          cards: {
            customCardTerminator: 3
          }
        }
      })
      const {
        taskContentLines
      } = getTaskContent({
        config: customConfig,
        content: TASK_WITH_2_BLANK_LINES_PRESERVED,
        fileType: FILE_TYPES.MARKDOWN
      })
      // Should include the 2 blank lines in the content
      const joined = taskContentLines.join('\n')
      expect(joined.includes('\n\n\n')).to.be(true) // 3 newlines = 2 blank lines
      // Verify the content wasn't terminated early
      expect(taskContentLines).to.contain('Line 2')
    })

    it('should preserve blank lines in middle of content when using numeric customCardTerminator', () => {
      const customConfig = Config.newDefaultConfig({
        settings: {
          cards: {
            customCardTerminator: 4
          }
        }
      })
      const {
        taskContentLines
      } = getTaskContent({
        config: customConfig,
        content: TASK_WITH_BLANK_LINES_IN_MIDDLE,
        fileType: FILE_TYPES.MARKDOWN
      })
      // Should preserve 3 blank lines in the content since terminator is 4
      expect(taskContentLines.length).to.be(6)
      expect(taskContentLines[0]).to.be('')
      expect(taskContentLines[1]).to.be('Line 1')
      expect(taskContentLines[2]).to.be('')
      expect(taskContentLines[3]).to.be('')
      expect(taskContentLines[4]).to.be('')
      expect(taskContentLines[5]).to.be('Line 2')
    })

    it('should handle customCardTerminator value of 1', () => {
      const customConfig = Config.newDefaultConfig({
        settings: {
          cards: {
            customCardTerminator: 1
          }
        }
      })
      const {
        taskContentLines
      } = getTaskContent({
        config: customConfig,
        content: TASK_WITH_SINGLE_BLANK_LINE,
        fileType: FILE_TYPES.MARKDOWN
      })
      // Single blank line should terminate, so content before the first blank line is kept
      expect(taskContentLines.length).to.be(2)
      expect(taskContentLines[0]).to.be('No blank line before this')
      expect(taskContentLines[1]).to.be('Or this')
      expect(taskContentLines).to.not.contain('Line after blank')
    })

    it('should handle large customCardTerminator values', () => {
      const customConfig = Config.newDefaultConfig({
        settings: {
          cards: {
            customCardTerminator: 10
          }
        }
      })
      const {
        taskContentLines
      } = getTaskContent({
        config: customConfig,
        content: TASK_WITH_MANY_BLANK_LINES,
        fileType: FILE_TYPES.MARKDOWN
      })
      // 9 blank lines should be preserved, 10 should terminate
      expect(taskContentLines.length).to.be.greaterThan(10)
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

const TASK_WITH_3_BLANK_LINES = `# #TODO A task that breaks with three blank lines

One blank line won't break a task.

Two blank lines won't break it either.


But three blank lines will.



This is some more content in the file
`

const TASK_WITH_2_BLANK_LINES_PRESERVED = `# #TODO Task with 2 blank lines preserved

Line 1


Line 2`

const TASK_WITH_BLANK_LINES_IN_MIDDLE = `# #TODO Task with blank lines in middle

Line 1



Line 2`

const TASK_WITH_SINGLE_BLANK_LINE = `# #TODO Task with single blank line terminator
No blank line before this
Or this

Line after blank`

const TASK_WITH_MANY_BLANK_LINES = `# #TODO Task with many blank lines

Line 1









Line 2



More content
`