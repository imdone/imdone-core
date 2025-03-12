import { describe, it, expect } from 'vitest';

import { 
  getTaskContent,
  FILE_TYPES
} from '../CardContentParser'
import { Config } from '../../../../config'
const config = Config.newDefaultConfig()

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