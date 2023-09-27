const eol = require('eol')
const { UNGROUPED_TASKS } = require('./domain/BacklogProject').constants
const { newBacklogProject, newStoryProject } = require('./ProjectConfigFactory')
const { parseMD } = require('../tools')

function isOpen(token, type, tag = token.tag) {
  return token.type === type + '_open' && token.tag === tag
}

function isClose(token, type, tag = token.tag) {
  return token.type === type + '_close' && token.tag === tag
}

function getHeadingLevel(tag) {
  return parseInt(tag.substring(1), 10)
}

function parse(markdown) {
  const heading = 'heading'
  const paragraph = 'paragraph'
  const inline = 'inline'
  const bulletList = 'bullet_list'
  const listItem = 'list_item'
  let storyId, description = [], groupName = '', tasks = []
  let inHeading = false
  let inParagraph = false
  let inBulletList = false
  let inListItem = false
  let listItemMarkup = ''
  let inTasks = false
  let headingLevel = 0
  const ast = parseMD(markdown)

  ast.forEach((token) => {
    const { type, tag, markup, content, info } = token
    if (isOpen(token, heading)) {
      inHeading = true
      headingLevel = getHeadingLevel(tag)
    } else if (isClose(token, heading)) {
      inHeading = false
    }

    if (isOpen(token, bulletList)) {
      inBulletList = true
    } else if (isClose(token, bulletList)) {
      inBulletList = false  
    }

    if (isOpen(token, listItem)) {
      inListItem = true
      listItemMarkup = markup
    } else if (isClose(token, listItem)) {
      inListItem = false
    }

    if (isOpen(token, paragraph)) {
      inParagraph = true
    } else if (isClose(token, paragraph)) {
      inParagraph = false
    }
    
    if (inHeading && type == inline) {
      groupName = content
      if (headingLevel == 1) {
        storyId = groupName
      }
    }

    if (groupName.toLowerCase().endsWith('tasks') && headingLevel == 2) {
      inTasks = true
    }

    if (inTasks && inBulletList && inListItem && inParagraph && type == inline) {
      const group = headingLevel > 2 ? groupName : UNGROUPED_TASKS
      const done = /^\[x\]\s/.test(content)
      const text = content.replace(/^\[.\]\s/, '')
      tasks.push({ group, text, done })
    }
  })
  
  const result = new RegExp(`# ${storyId}\n(.*)## Tasks`, 'gms').exec(markdown)
  description = result && result.length > 1 ? result[1].trim() : ''
  
  return { storyId, description, tasks }
}

async function importMarkdown(projectPath, markdown, ApplicationContext) {
  const { log } = ApplicationContext()

  const backlogProject = await newBacklogProject({projectPath, ApplicationContext})
  await backlogProject.init()

  let { storyId, description, tasks } = parse(markdown)

  storyId = backlogProject.sanitizeFileName(storyId)
  const storyProject = await newStoryProject({projectPath, storyId, ApplicationContext})
  await storyProject.init()

  log(`Importing story ${storyId} - ${description}`)
  await backlogProject.addStory(description, storyId)
  await storyProject.addTasks(tasks)
}

module.exports = {
  UNGROUPED_TASKS,
  parse,
  importMarkdown
}
