const simpleGit = require('simple-git')
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

  getTaskName(task) {
    return this.project.getTaskName(task)
  }

  getStoryId(task) {
    return this.project.getStoryId(task)
  }
  
  async initTaskUpdate(task) {
    if (await this.changesExist()) {
      throw new Error('There are changes on the current branch.  Please commit or stash them before starting a task.')
    }

    await this.checkoutStoryBranch(task)
  }

  async commitTaskUpdate(task) {
    await this.project.addMetadata(task, 'branch', branchName)
    await this.git.add('.').commit(`Update ${this.getTaskName(task)}`)
    await this.git.push(this.remote)
    await this.git.checkout(this.getTaskBranchName(task))
  }

  getStoryBranchName(task) {
    return `story/${this.getStoryId(task)}`
  }

  getTaskBranchName(task) {
    const storyBranchName = this.getStoryBranchName(task)
    const taskName = this.getTaskName(task)
    return `${storyBranchName}/task/${taskName}`
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

  async checkoutStoryBranch(task) {
    await this.checkoutDefaultBranch()
    await this.git.checkout(
      this.getStoryBranchName(task)
    )
    await this.pull()
    await this.git.merge([this.defaultBranch])
  }

  async pull() {
    await this.git.pull(this.remote)
  }

  async fetch() {
    await this.git.fetch(this.remote)
  }

}