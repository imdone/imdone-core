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

  async initTaskUpdate(task) {
    if (await this.changesExist()) {
      throw new Error('There are changes on the current branch.  Please commit or stash them before starting a task.')
    }

    await this.checkoutStoryBranch(task)
  }

  async commitTaskUpdate(task) {
    const taskBranchName = this.getTaskBranchName(task)
    await this.project.addMetadata(task, 'branch', taskBranchName)
    await this.git.add('.').commit(`Update ${this.getTaskName(task)}`)
    await this.git.push(this.remote)
    await this.git.checkoutBranch(taskBranchName, this.getStoryBranchName(task))
  }

  getTaskName(task) {
    return this.project.getTaskName(task)
  }

  getStoryId(task) {
    return this.project.getStoryId(task)
  }
  
  getStoryBranchName(task) {
    return `${this.getStoryBranchPrefix(task)}/main`
  }

  getStoryBranchPrefix(task) {
    return `story/${this.getStoryId(task)}`
  }

  getTaskBranchName(task) {
    const storyBranchPrefix = this.getStoryBranchPrefix(task)
    const taskName = this.getTaskName(task)
    return `${storyBranchPrefix}/task/${taskName}`
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
    const storyBranchName = this.getStoryBranchName(task)
    
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
