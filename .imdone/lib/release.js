const fs = require('fs')
const _path = require('path')
const eol = require('eol')

const git = require('./git')
const versionBuilder = require('./version')
const fetch = require('./fetch')
const { runTests } = require('./test')

require('dotenv').config({ path: _path.join(__dirname, '..', '.env') })

const insiderBuildsUrl = process.env.DISCORD_TEST_WEBHOOK

module.exports = function (project) {
  const version = versionBuilder(project)
  // READY:0 ## Board actions for adding major, minor and patch releases
  // **code:** [${relPath}:${line}](${relPath}:${line})
  // - [x] switch to master
  // - [x] create new branch named for the correct increment (Based on current version in package.json)
  // - [x] Increment release in package.json
  // - [x] Add a card to todo with is-epic meta "Release [version]"
  // - [x] Add card action for setting epic meta to current release
  // - [x] Add card action that adds a new card with epic meta to card source file
  // <!--
  // created:2022-04-09T15:18:09.527Z epic:"Release 1.29.0" expand:1 -->

  async function startRelease(mainBranch, increment) {
    try {
      const newVersion = version.update(increment)
      project.toast({
        message: `Creating new ${increment} release: ${newVersion}`,
      })
      await git(project).checkout(mainBranch)
      await git(project).branch(newVersion)
      await git(project).checkout(newVersion)
      await version.save(newVersion)
      const releaseNotesPath = _path.join(
        project.path,
        project.config.journalPath,
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
      project.toast({
        message: `New ${increment} release created: ${newVersion}`,
      })
    } catch (e) {
      console.error('Failed to create new release:', e)
      project.toast({
        message: `Error creating release:${e.message}`,
        type: 'is-danger',
      })
    }
  }

  function getChangeLog(withVersion) {
    const lists = project.lists.filter((list) => list.name === 'READY')
    const cards = lists[0].tasks.map((task) => {
      const contentArray = task.description
        .map((line) => line.replace(/^/, '  '))
        .filter((line) => !line.includes('${'))
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
    cards.push('')
    return cards
  }

  async function prepareRelease(project) {
    const currentVersion = version.get()
    const releaseName = `${project.name} ${currentVersion}`
    const duration = 10000
    try {
      await runTestsForRelease(project, releaseName, duration)
      await updateChangeLog(project, releaseName, duration)
    } catch (e) {
      console.error(`Error preparing release ${releaseName}`, e)
      project.snackBar({
        message: e.message,
        type: 'is-danger',
        duration,
      })
    }
  }

  async function updateChangeLog(project, releaseName, duration) {
    const changelogFile = 'CHANGELOG.md'
    project.snackBar({
      message: `Updating ${releaseName} ${changelogFile}`,
      duration,
    })
    const changelogPath = _path.join(project.path, changelogFile)
    const changelog = await fs.promises.readFile(changelogPath)
    await fs.promises.writeFile(
      changelogPath,
      [getChangeLog(true).join(String(eol.auto)), changelog].join(
        String(eol.auto)
      )
    )
    project.snackBar({
      message: `Changelog ${releaseName} ${changelogFile} updated`,
      duration,
    })
  }

  async function runTestsForRelease(project, releaseName, duration) {
    project.snackBar({
      message: `Running tests for ${releaseName}`,
      duration,
    })
    const { pass, fail } = await runTests(project)
    const type = fail > 0 ? 'is-danger' : 'is-success'
    project.snackBar({
      message: `${releaseName} test results: passed:${pass} failed:${fail}`,
      type,
      duration,
    })
    if (fail > 0)
      throw new Error(`Failed tests! Aborting release ${releaseName}`)
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
    return fetch(url, {
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

  async function currentBranch() {
    return git(project).currentBranch()
  }

  async function isCurrentVersionBranch() {
    return (await currentBranch) === version.get
  }

  return {
    postInsiderBuildToDiscord,
    postToDiscord,
    getChangeLog,
    getReleasePost,
    startRelease,
    version,
    currentBranch,
    isCurrentVersionBranch,
    prepareRelease,
  }
}
