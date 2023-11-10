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
  
  async initTaskStorage(task) {
    const taskName = this.getTaskName(task)
    const storyId = task.meta['story-id'][0]
    // TODO: If there are changes on the current branch throw error
    // TODO: Checkout the default branch
    // TODO: Pull the default branch
    // TODO: Fetch the remote
    // TODO: Create or pull the story branch
    // TODO: Update the story branch with default branch
    // TODO: Commit and push the story branch
    // TODO: Create the task branch

    const branchName = `story/${storyId}/task/${taskName}`
    const git = this.git

    await git.fetch()

    const branches = await git.branchLocal()

    if (branches.current !== branchName) {
      if (!branches.all.includes(branchName)) {
        await git.checkoutBranch(branchName, 'HEAD')
      } else await git.checkout(branchName)
    }

    const remoteBranches = await git.branch(['-r'])
    if (remoteBranches.all.includes(`${this.remote}/${branchName}`)) await git.pull()
    return branchName
  }


}