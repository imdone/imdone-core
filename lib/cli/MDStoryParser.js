const { parseMD } = require('../tools')
const StoryProject = require('./domain/StoryProject')
const BacklogProject = require('./domain/BacklogProject')
const { 
  UNGROUPED_TASKS,
  TODO,
  DONE,
  ORDER
} = BacklogProject.constants
const ApplicationContext = require('./adapters/ApplicationContext')

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
  const textType = 'text'
  let storyText, description = [], groupName = '', tasks = []
  let inHeading = false
  let inParagraph = false
  let inBulletList = false
  let inListItem = false
  let inTasks = false
  let headingLevel = 0
  const ast = parseMD(markdown)

  ast.forEach((token) => {
    const { type, tag, markup, content, info, children } = token
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
        storyText = groupName
      }
    }

    if (groupName.toLowerCase().endsWith('tasks') && headingLevel == 2) {
      inTasks = true
    }

    if (inTasks && inBulletList && inListItem && inParagraph && type == inline) {
      const group = headingLevel > 2 ? groupName : UNGROUPED_TASKS
      const done = /^\[x\]\s/.test(content)
      const description = children
        .filter(child => child.type === textType)
        .map(child => child.content)
      const text = description.join('\n')
      tasks.push({ group, text, done })
    }
  })
  
  if (storyText) {
    const result = new RegExp(`# ${storyText}\n(.*)## Tasks`, 'gms').exec(markdown)
    description = result && result.length > 1 ? result[1].trim() : ''
  }
  
  return { storyText, description, tasks }
}

async function importMarkdown({projectPath, existingStoryId, markdown, applicationContext = ApplicationContext}) {
  const { log } = applicationContext()

  const backlogProject = await BacklogProject.createAndInit(projectPath, null, applicationContext)  
  
  let { storyText, description, tasks } = parse(markdown)
  
  const storyId = existingStoryId || backlogProject.toStoryId(storyText)
  
  log(`Importing story ${storyId}\n${description}`)
  
  await backlogProject.storageAdapter.initStoryPlan(storyId)

  if (!existingStoryId) await backlogProject.addStory(`${storyText}\n${description}`)

  const storyProject = await StoryProject.createAndInit(projectPath, null, storyId, applicationContext)  
  
  await addStoryTasks(storyProject, tasks)
  
  await storyProject.init()
  
  await backlogProject.storageAdapter.saveStoryPlan(storyId)
  
  return storyProject
}

async function addStoryTasks(storyProject, tasks) {
  tasks.forEach(async (task, i) => {
    const order = (i + 1) * (10)
    const list = task.done ? DONE : TODO
    const meta = [
      { key: 'group', value: task.group },
      { key: ORDER, value: order }
    ]
    await storyProject.addTaskToFile({list, content: task.text, meta})
  })
}

module.exports = {
  UNGROUPED_TASKS,
  parse,
  importMarkdown
}
