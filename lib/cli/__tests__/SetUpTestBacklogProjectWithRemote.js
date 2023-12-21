const isRunningInGithubAction = !!process.env.GITHUB_ACTION
const contextualDescribe = isRunningInGithubAction ? describe.skip : describe
const { configureProject, defaultProjectPath } = require("../ProjectConfigFactory")
const BacklogProject = require("../domain/BacklogProject")
const fs = require('fs').promises
const path = require('path')
const projectRoot = path.dirname(require.resolve('../../../package.json'))
const simpleGit = require('simple-git')

const GIT_SSH_COMMAND = "ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no"
const ORIGIN = 'ssh://git@localhost:8022/home/git/test-project.git'
const projectPath = path.join(projectRoot, 'temp', 'test-project')
const defaultBranch = 'main'
const remote = 'origin'
const backlogProjectPath = defaultProjectPath(projectPath)
let backlogProject
let git

function execCmd(cmd) {
  console.log('executing:', cmd)
  const exec = require('child_process').exec;
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.warn(error);
      return reject(error)
    }
    console.log(`stdout: ${stdout} stderr: ${stderr}`);
    resolve(stdout? stdout : stderr);
    });
  });
}

function getBeforeEach() {
  return {
    beforeEachFunc: async () => {
      await execCmd(path.join(projectRoot, 'devops', 'containers', 'setup-remote.sh'))
      try {
        await fs.rmdir(projectPath, {recursive: true})
      } catch (e) {
        console.log('no temp project to remove')
      } finally {
        await fs.mkdir(projectPath, {recursive: true})
      }
      process.env.PWD = projectPath
      git = simpleGit(projectPath).env({...process.env, GIT_SSH_COMMAND})
      const result = await configureProject({
        projectPath: backlogProjectPath,
        defaultBranch,
        remote
      })
      const { config } = result
      backlogProject = await BacklogProject.createAndInit(backlogProjectPath, config)
      await git.init().add('.').commit('initial commit')
      await git.addRemote(remote, ORIGIN)
      await git.push(remote, defaultBranch, {'--set-upstream': null})
      return {backlogProject, git}
    }
  }
}

module.exports = {
  getBeforeEach,
  contextualDescribe
}