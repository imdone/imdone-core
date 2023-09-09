const path = require('path')
const {readFile, writeFile, mkdir, access} = require('fs/promises')
const homeDir = require('os').homedir()
const sessionPath = path.join(homeDir, '.imdone', 'session.json')

async function ensureSessionFileExists() {
  try {
    await access(path.dirname(sessionPath))
  } catch (error) {
    if (error.code === 'ENOENT') {
      await mkdir(path.dirname(sessionPath), {recursive: true})
      await writeFile(sessionPath, '{}')
    }
  }
}

async function getUserSession() {
  await ensureSessionFileExists()
  const session = await readFile(sessionPath, 'utf8')
  return JSON.parse(session)
}

async function saveUserSession(session) {
  await ensureSessionFileExists()
  await writeFile(sessionPath, JSON.stringify(session, null, 2))
}

const StoryTaskSession = {}

StoryTaskSession.setProjectPath = async function (projectPath) {
  const session = await getUserSession()
  session.projectPath = projectPath
  await saveUserSession(session)
}

StoryTaskSession.getProjectPath = async function () {
  const session = await getUserSession()
  return session.projectPath
}

StoryTaskSession.setTaskId = async function (taskId) {
  const session = await getUserSession()
  session.taskId = taskId
  await saveUserSession(session)
}

StoryTaskSession.getTaskId = async function () {
  const session = await getUserSession()
  return session.taskId
}

StoryTaskSession.setStoryId = async function (storyId) {
  const session = await getUserSession()
  session.storyId = storyId
  await saveUserSession(session)
}

StoryTaskSession.getStoryId = async function () {
  const session = await getUserSession()
  return session.storyId
}

module.exports = StoryTaskSession