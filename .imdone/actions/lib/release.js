const fs = require('fs')
const _path = require('path')
const version = require('./version')
const fetch = require('./fetch')
require('dotenv').config({ path: _path.join(__dirname, '..', '.env') })
const insiderBuildsUrl = process.env.DISCORD_TEST_WEBHOOK

module.exports = function (project) {
  function getChangeLog(withVersion) {
    const lists = project.lists.filter((list) => list.name === 'READY')
    const cards = lists[0].tasks.map((task) => {
      const contentArray = task.description.map((line) =>
        line.replace(/^/, '  ')
      )
      contentArray.unshift(task.text.replace(/^\#*\s*/, '').replace(/^/, '- '))
      return contentArray
        .filter((line) => !/^\s*- \[x\]/.test(line.trim()))
        .join('\n')
        .replace(/<!--.*-->/gs, '')
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .join('\n')
    })
    if (withVersion) cards.unshift(`## ${version()}`)
    return cards
  }

  function getReleasePost() {
    const changelog = getChangeLog()
    const content = [
      `**imdone-core ${version()} is here!**\n`,
      `**Here's what's in it...**\n`,
      ...changelog,
    ].join('\n')
    console.log('Content length:', content.length)
    return content
  }

  async function postInsiderBuildToDiscord() {
    await postToDiscord(insiderBuildsUrl, getReleasePost())
    await postToDiscord(insiderBuildsUrl, await getDownloadsPost())
  }

  async function postToDiscord(url, content) {
    return fetch(insiderBuildsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Imdone Actions Bot',
        content,
      }),
    })
  }

  return {
    postInsiderBuildToDiscord,
    postToDiscord,
    getChangeLog,
    getReleasePost,
  }
}
