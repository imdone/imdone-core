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

module.exports = function parse(markdown) {
  const heading = 'heading'
  const paragraph = 'paragraph'
  const inline = 'inline'
  const bulletList = 'bullet_list'
  const listItem = 'list_item'
  let storyId, description, groupName = '', tasks = []
  let inHeading = false
  let inParagraph = false
  let inBulletList = false
  let inListItem = false
  let inTasks = false
  let headingLevel = 0
  const ast = parseMD(markdown)

  ast.forEach((token) => {
    const { type, tag, markup, content } = token
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
        storyId = groupName
      }
    }

    if (inParagraph && headingLevel == 1 && type == inline) {
      description = content
    }

    if (groupName.toLowerCase().endsWith('tasks') && headingLevel == 2) {
      inTasks = true
    }

    if (inTasks && inBulletList && inListItem && inParagraph && type == inline) {
      const group = headingLevel > 2 ? groupName : 'ungrouped'
      tasks.push({ group, text: content.replace(/^\[.\]\s/, '') })
    }
  })
  return { name: storyId, description, tasks }
}