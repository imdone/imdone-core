const fs = require('fs')
const _path = require('path')

const git = require('./git')
const versionBuilder = require('./version')
const fetch = require('./fetch')

require('dotenv').config({ path: _path.join(__dirname, '..', '.env') })

const insiderBuildsUrl = process.env.DISCORD_TEST_WEBHOOK

module.exports = function (project) {
  const version = versionBuilder(project)
  // DOING:-30 ## Board actions for adding major, minor and patch releases
  // **code:** [${relPath}:${line}](${relPath}:${line})
  // - [x] switch to master
  // - [x] create new branch named for the correct increment (Based on current version in package.json)
  // - [x] Increment release in package.json
  // - [ ] Add a card to todo with is-epic meta "Release [version]"
  // - [ ] Add card action configuration for setting release
  // <!--
  // created:2022-04-09T15:18:09.527Z epic:"Release 1.29.0" expand:1 -->

  async function newRelease(mainBranch, increment) {
    await git(project).checkout(mainBranch)
    const newVersion = version.update(increment)
    await git(project).branch(newVersion)
    await git(project).checkout(newVersion)
    await version.save(newVersion)
    const releaseNotesPath = _path.join(
      project.path,
      'notes',
      'releases',
      newVersion
    )
    const releaseKanbanPath = _path.join(releaseNotesPath, 'kanban.md')
    await fs.promises.mkdir(releaseNotesPath, {
      recursive: true,
    })
    await fs.promises.writeFile(
      releaseKanbanPath,
      `## [Release ${newVersion}](#DOING:)\n<!--\nis-epic:"Release ${newVersion}"\nexpand:1\norder:0\n-->\n`
    )
  }

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
    if (withVersion) cards.unshift(`## ${version.get()}`)
    return cards
  }

  function getReleasePost() {
    const changelog = getChangeLog()
    const content = [
      `**imdone-core ${version.get()} is here!**\n`,
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
    newRelease,
  }
}
