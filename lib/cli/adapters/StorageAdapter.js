const simpleGit = require('simple-git')
const {changesExistError, ChangesExistError} = require('./Errors')

module.exports =  class {

  constructor(project) {
    this.project = project
    this.git = simpleGit(this.path)
  }
  
  get path() {
    return this.project.path
  }

  get remote() {
    return this.pluginConfig.remote
  }

  get defaultBranch() {
    return this.pluginConfig.defaultBranch
  }

  get pluginConfig() {
    return this.project.config.settings.plugins.CliBacklogPlugin
  }

  async initTaskUpdate(task) {
    if (await this.changesExist()) {
      throw new ChangesExistError('start a task')
    }

    await this.checkoutStoryBranch({task})
  }

  async commitTaskUpdate(task) {
    const taskBranchName = this.getTaskBranchName(task)
    await this.project.addMetadata(task, 'branch', taskBranchName)
    await this.git.add('.').commit(`Update task ${this.getTaskName(task)}`)
    await this.git.push(this.remote)
    await this.git.checkoutBranch(taskBranchName, this.getStoryBranchName({task}))
  }

  async initStoryPlan(storyId) {
    if (await this.changesExist()) {
      throw new ChangesExistError('plan a story')
    }

    await this.checkoutStoryBranch({storyId})
  }

  async saveStoryPlan(storyId) {
    const storyBranchName = this.getStoryBranchName({storyId})
    await this.git.add('.').commit(`Update story ${storyId}`)
    await this.git.push(this.remote)
  }

  getTaskName(task) {
    return this.project.getTaskName(task)
  }

  getStoryId(task) {
    return this.project.getStoryId(task)
  }
  
  getStoryBranchName({task, storyId}) {
    return `${this.getStoryBranchPrefix({task, storyId})}/main`
  }

  getStoryBranchPrefix({task, storyId}) {
    return `story/${storyId || this.getStoryId(task)}`
  }

  getTaskBranchName(task) {
    const storyBranchPrefix = this.getStoryBranchPrefix({task})
    const taskName = this.getTaskName(task)
    return `${storyBranchPrefix}/task/${taskName}`
  }

  async getCurrentTask() {
    const currentBranch = await this.getCurrentBranch()
    const tasks = this.project.getTasks(`meta.branch="${currentBranch}"`)
    return tasks && tasks.length == 1 && tasks[0]
  }

  async getCurrentBranch() {
    return (await this.git.branchLocal()).current
  }
  
  async changesExist() {
    return !(await this.git.status()).isClean()
  }

  async checkoutDefaultBranch() {
    const defaultBranch = this.defaultBranch
    await this.fetch()
    await this.git.checkout(defaultBranch)
    await this.pull()
  }

  async checkoutStoryBranch({task, storyId}) {
    const storyBranchName = this.getStoryBranchName({task, storyId})
    
    await this.checkoutDefaultBranch()
    
    if (await this.branchExists(storyBranchName)) {
      await this.git.checkout(storyBranchName)
      await this.pull()
    } else {
      await this.git.checkoutBranch(
        storyBranchName,
        this.defaultBranch
      )
      await this.pushNewBranch(storyBranchName)
    }
    await this.git.merge([this.defaultBranch])
  }

  async branchExists(branchName) {
    const branches = await this.git.branchLocal()
    return branches.all.includes(branchName)
  }

  async pull() {
    await this.git.pull(this.remote)
  }

  async fetch() {
    await this.git.fetch(this.remote)
  }

  async pushNewBranch(branchName) {
    await this.git.push(this.remote, branchName, {'--set-upstream': null})
  }

}
