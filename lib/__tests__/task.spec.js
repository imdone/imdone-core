import { describe, it, expect, should } from 'vitest';

import { Task } from '../task.js'
import { Config } from '../config';

const config = Config.newDefaultConfig()

describe('task', function () {
  describe('getTags', function () {
    it('should return tags from a task when tag prefix is #', function () {
      const tags = Task.getTags('# one\n\n## two\n\n### three\n\nA new task #tag1 #tag2', '#')
      expect(JSON.stringify(tags)).to.equal(`["tag1","tag2"]`)  
    })
    it('should return tags from a task when tag prefix is +', function () {
      const tags = Task.getTags('# one\n\n## two\n\n### three\n\nA new task +tag1 +tag2', '+')
      expect(JSON.stringify(tags)).to.equal(`["tag1","tag2"]`)  
    })
    it('should not return tags that are in a markdown link', function () {
      const tags = Task.getTags('# one\n\n## two\n\n### three\n\nA new task [#tag1](#tag1) #tag2', '#')
      expect(JSON.stringify(tags)).to.equal(`["tag2"]`)  
    })
    it('should not return tags that are in a code block', function () {
      const tags = Task.getTags('# one\n\n## two\n\n### three\n\nA new task `#tag1`\n\n```\n#tag3\n```\n\n #tag2', '#')
      expect(JSON.stringify(tags)).to.equal(`["tag2"]`)  
    })
    it('should only return tags from HTML comments when commentTagsOnly is true', function () {
      const text = '# Title\n\nSome text with #tag1\n\n<!-- This is a comment with #tag2 -->\n\nMore text with #tag3'
      const tags = Task.getTags(text, '#', true)
      expect(JSON.stringify(tags)).to.equal(`["tag2"]`)
    })
    it('should return all tags when commentTagsOnly is false', function () {
      const text = '# Title\n\nSome text with #tag1\n\n<!-- This is a comment with #tag2 -->\n\nMore text with #tag3'
      const tags = Task.getTags(text, '#', false)
      expect(JSON.stringify(tags)).to.equal(`["tag1","tag2","tag3"]`)
    })
    it('should handle nested comments correctly with commentTagsOnly', function () {
      const text = '# Title\n\n<!-- Outer comment #outerTag\n<!-- Nested comment #nestedTag -->\n-->\n\nText with #normalTag'
      const tags = Task.getTags(text, '#', true)
      expect(JSON.stringify(tags)).to.equal(`["outerTag","nestedTag"]`)
    })
    it('should handle mixed tag prefixes correctly with commentTagsOnly', function () {
      const text = '# Title\n\n<!-- Comment with #commentTag and +anotherCommentTag -->\n\nText with #normalTag and +anotherNormalTag'
      const hashTags = Task.getTags(text, '#', true)
      const plusTags = Task.getTags(text, '+', true)
      
      expect(JSON.stringify(hashTags)).to.equal(`["commentTag"]`)
      expect(JSON.stringify(plusTags)).to.equal(`["anotherCommentTag"]`)
    })
    it('should not return tags from markdown links even when in comments', function () {
      const text = '# Title\n\n<!-- Comment with [#tagInLink](#link) -->\n\nText with #normalTag'
      const tags = Task.getTags(text, '#', true)
      expect(JSON.stringify(tags)).to.equal(`[]`)
    })
    it('should not return tags from code blocks even when in comments', function () {
      const text = '# Title\n\n<!-- Comment with `#tagInCode` and ```\n#tagInCodeBlock\n``` -->\n\nText with #normalTag'
      const tags = Task.getTags(text, '#', true)
      expect(JSON.stringify(tags)).to.equal(`[]`)
    })
  })
  describe('removeTags', function () {
    it('should remove tags from a task when tag prefix is #', function () {
      const text = Task.removeTags('# one\n\n## two\n\n### three\n\nA new task #tag1 #tag2', '#')
      expect(text).to.equal('# one\n\n## two\n\n### three\n\nA new task')  
    })
    it('should remove tags from a task when tag prefix is +', function () {
      const text = Task.removeTags('# one\n\n## two\n\n### three\n\nA new task +tag1 +tag2', '+')
      expect(text).to.equal('# one\n\n## two\n\n### three\n\nA new task')  
    })
    it('should not remove tags that are in a markdown link', function () {
      const text = Task.removeTags('# one\n\n## two\n\n### three\n\nA new task [#tag1](#tag1) #tag2', '#')
      expect(text).to.equal('# one\n\n## two\n\n### three\n\nA new task [#tag1](#tag1)')  
    })
    it('should not remove tags that are in a code block', function () {
      const text = Task.removeTags('# one\n\n## two\n\n### three\n\nA new task `#tag1`\n\n```javascript\nsome #tag3\n```\n\n #tag2', '#')
      expect(text).to.equal('# one\n\n## two\n\n### three\n\nA new task `#tag1`\n\n```javascript\nsome #tag3\n```\n\n')  
    })
  })
  describe('hasMetaData', function () {
    it('should return true for non array matches', function () {
      let task = new Task(config, {
        text: 'Do something special with this. +enhancement gh:12 ic:github',
      })
      expect(task.hasMetaData('ic', 'github')).to.be.true
    })
    it('should return true for array matches', function () {
      let task = new Task(config, {
        text: 'Do something special with this. +enhancement gh:12 ic:github ic:trello',
      })
      expect(task.hasMetaData('ic', 'github')).be.true
      expect(task.hasMetaData('ic', 'trello')).be.true
      expect(task.hasMetaData('ic', ['github', 'trello'])).be.true
    })
  })

  describe('getTextAndDescription', () => {
    it.skip("should only detect metadata when it's not in back ticks", () => {
      let task = new Task(config, {
        text: 'this ` expand:1` is a bit of a `test:1 for us` expand:1 @sure @thing `+one` ` @two`',
      })
      let wholeTask = task.getText({
        stripMeta: true,
        sanitize: true,
        stripTags: true,
        stripContext: true,
      })
      expect(wholeTask).to.equal(
        'this ` expand:1` is a bit of a `test:1 for us` `+one` ` @two`'
      )
    })

    it('should remove expand:1 from text', () => {
      let task = new Task(config, {}, true)
      let wholeTask = task.getText(
        {
          stripMeta: true,
          sanitize: true,
          stripTags: true,
          stripContext: true,
        },
        'A new task with expand:1'
      )
      expect(wholeTask).to.equal('A new task with')
    })
  })

  describe('getMetaData', () => {
    it('should not add metadata that\'s not preceded with a "space"', () => {
      let task = new Task(config, {
        text: '# should also use [formatDescription](src/utils/task-text-utils.js:33:1) +urgent',
      })
      expect(task.hasMetaData('js', '33')).be.false
    })

    it('should find metadata in quotes', () => {
      let task = new Task(config, {
        text: '# should also use [formatDescription](src/utils/task-text-utils.js:33:1) +urgent epic:"My Epic"',
      })
      expect(task.hasMetaData('epic', 'My Epic')).be.true
    })
  })

  describe('removeMetaDataFromText', () => {
    it('should not remove metadata that\'s not preceded with a "space"', () => {
      const text =
        '# should also use [formatDescription](src/utils/task-text-utils.js:33:1) +urgent'
      let textWithoutMeta = Task.removeMetaDataFromText(config, text)
      expect(textWithoutMeta).to.equal(text)
    })
  })
  describe('getListTrackingMeta', () => {
    it('should return empty list tracking metadata from a new task', () => {
      const lists = ['TODO', 'DOING', 'DONE']
      const task = new Task(config, {
        list: 'TODO',
        text: '# should also use [formatDescription](src/utils/task-text-utils.js:33:1) +urgent',
      })
      const listTrackingMeta = task.getListTrackingMeta(lists)
      expect(listTrackingMeta).to.have.length(0)
    })
    it('should return all list tracking metadata sorted by value from a task', () => {
      const lists = ['TODO', 'DOING', 'DONE']
      const task = new Task(config, {
        list: 'TODO',
        text: '# This task has been added to DOING:2021-02-23 TODO:2021-02-25 TODO:2021-02-22 DONE:2021-02-24',
      })
      const listTrackingMeta = task.getListTrackingMeta(lists)
      expect(listTrackingMeta).to.have.length(4)
    })
  })
  describe('hasListChanged', () => {
    it('should return true if there is no list tracking metadata', () => {
      const lists = ['TODO', 'DOING', 'DONE']
      const task = new Task(config, {
        list: 'TODO',
        text: '# should also use [formatDescription](src/utils/task-text-utils.js:33:1) +urgent',
      })
      expect(task.hasListChanged(lists)).to.equal(true)
    })
    it('should return false if the current list is the last list', () => {
      const lists = ['TODO', 'DOING', 'DONE']
      const task = new Task(config, {
        list: 'TODO',
        text: '# This task has been added to DOING:2021-02-23 TODO:2021-02-25 TODO:2021-02-22 DONE:2021-02-24',
      })
      expect(task.hasListChanged(lists)).to.equal(false)
    })
    it('should return true if the current list is not the last list', () => {
      const lists = ['TODO', 'DOING', 'DONE']
      const task = new Task(config, {
        list: 'TODO',
        text: '# This task has been added to DOING:2021-02-23 DOING:2021-02-25 TODO:2021-02-22 DONE:2021-02-24',
      })
      expect(task.hasListChanged(lists)).to.equal(true)
    })
  })

  describe('addToLastCommentInContent', () => {
    it('should add content correctly when newline is false', () => {
      const content = `A task
<!--
with:meta
-->`
      const afterAdd = new Task(config, {}, true).addToLastCommentInContent(
        content,
        'order:10'
      )
      afterAdd.includes(' order:10')
    })
    it('should add content correctly when newline is true', () => {
      const content = `A task
<!--
with:meta
-->`
      const afterAdd = new Task(config, {}, true).addToLastCommentInContent(
        content,
        'order:10',
        true
      )
      afterAdd.includes('\norder:10')
    })
    it('should add content correctly when there is no comment', () => {
      const content = `A task\n\n`
      const afterAdd = new Task(config, {}, true).addToLastCommentInContent(
        content,
        'order:10',
        true
      )
      afterAdd.includes('\n<!--\norder:10\n-->')
    })
  })

  describe('replaceContent', function () {
    it('replaces content in a task', function () {
      const task = new Task(new Config(), {
        text: 'A new task',
        description: ['task description line 1', 'task description line 2'],
      })
      task.replaceContent(/task/g, 'card')
      expect(task.text).to.equal('A new card')
      expect(task.description[0]).to.equal('card description line 1')
      expect(task.description[1]).to.equal('card description line 2')
    })
  })

  describe('parseMetaData', function () {
    it('parses metadata in content', function () {
      const config = new Config()
      config.settings.cards = {
        metaSep: '::',
      }
      const content = `- [5 Reasons Why Business Exceptions Are a Bad Idea](https://reflectoring.io/business-exceptions/)
<!-- created::2020-03-06T19:24:33.121Z 
TODO::2021-04-19T13:54:35.370Z
BACKLOG::2022-08-14T16:52:08.298Z
order::-19.9853515625
one::two
-->
Created: {{(new Date(created)).toLocaleString()}}
`
      const meta = Task.parseMetaData(config, content)
      expect(meta.order[0]).to.equal('-19.9853515625')
    })
  })

  describe('updateOrderMeta', function () {
    it('Updates order meta when config.orderMeta is falsy', function () {
      const config = new Config()
      config.settings.cards = {
        metaSep: '::',
      }
      const description =
        `- [5 Reasons Why Business Exceptions Are a Bad Idea](https://reflectoring.io/business-exceptions/)
<!-- created::2020-03-06T19:24:33.121Z 
TODO::2021-04-19T13:54:35.370Z
BACKLOG::2022-08-14T16:52:08.298Z
order::-19.9853515625
one::two
-->
Created: {{(new Date(created)).toLocaleString()}}
`.split('\n')
      const task = new Task(config, {
        text: 'A new task',
        description,
      })
      task.updateOrderMeta(config)
      expect(task.description[4]).to.equal(description[5])
    })
  })

  describe('Task.parseMetaData', () => {
    it('should respect the commentMetaOnly setting', () => {
      // Test content with metadata both inside and outside comments
      const testContent = `A task with meta:outside1 and meta:outside2
<!-- 
meta:inside1 
meta:inside2
-->
More content with meta:outside3`;

      // Mock config with commentMetaOnly true
      const configCommentOnly = {
        getCommentMetaOnly: () => true,
        getMetaSep: () => ':',
      };

      // Mock config with commentMetaOnly false
      const configAllMeta = {
        getCommentMetaOnly: () => false,
        getMetaSep: () => ':',
      };

      // Test with commentMetaOnly = true
      const metaCommentOnly = Task.parseMetaData(configCommentOnly, testContent);
      expect(metaCommentOnly).toHaveProperty('meta');
      expect(metaCommentOnly.meta).toHaveLength(2);
      expect(metaCommentOnly.meta).toContain('inside1');
      expect(metaCommentOnly.meta).toContain('inside2');
      expect(metaCommentOnly.meta).not.toContain('outside1');
      expect(metaCommentOnly.meta).not.toContain('outside2');
      expect(metaCommentOnly.meta).not.toContain('outside3');

      // Test with commentMetaOnly = false
      const metaAll = Task.parseMetaData(configAllMeta, testContent);
      expect(metaAll).toHaveProperty('meta');
      expect(metaAll.meta).toHaveLength(5);
      expect(metaAll.meta).toContain('inside1');
      expect(metaAll.meta).toContain('inside2');
      expect(metaAll.meta).toContain('outside1');
      expect(metaAll.meta).toContain('outside2');
      expect(metaAll.meta).toContain('outside3');
    });

    it('should handle complex content with mixed metadata', () => {
      // Test case with markdown formatting and mixed metadata locations
      const complexContent = `# Task with metadata
Some text with meta:outsideValue here.

\`\`\`javascript
// Code block that should be ignored meta:codeValue
\`\`\`

<!-- 
This is a comment with meta:firstCommentValue
Another line with meta:secondCommentValue
-->

More text meta:anotherOutsideValue
`;

      // Mock configs
      const configCommentOnly = {
        getCommentMetaOnly: () => true,
        getMetaSep: () => ':',
      };
      
      const configAllMeta = {
        getCommentMetaOnly: () => false,
        getMetaSep: () => ':',
      };

      // Test with commentMetaOnly = true
      const commentOnlyResult = Task.parseMetaData(configCommentOnly, complexContent);
      expect(commentOnlyResult).toHaveProperty('meta');
      expect(commentOnlyResult.meta).toContain('firstCommentValue');
      expect(commentOnlyResult.meta).toContain('secondCommentValue');
      expect(commentOnlyResult.meta).not.toContain('outsideValue');
      expect(commentOnlyResult.meta).not.toContain('codeValue');
      expect(commentOnlyResult.meta).not.toContain('anotherOutsideValue');

      // Test with commentMetaOnly = false
      const allMetaResult = Task.parseMetaData(configAllMeta, complexContent);
      expect(allMetaResult).toHaveProperty('meta');
      expect(allMetaResult.meta).toContain('firstCommentValue');
      expect(allMetaResult.meta).toContain('secondCommentValue');
      expect(allMetaResult.meta).toContain('outsideValue');
      expect(allMetaResult.meta).not.toContain('codeValue'); // Code blocks should still be ignored
      expect(allMetaResult.meta).toContain('anotherOutsideValue');
    });
  });
})
