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
      expect(rawTaskContentLines.length).to.be(5)
      expect(taskContentLines.length).to.be(4)
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