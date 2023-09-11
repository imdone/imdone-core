module.exports = class StoryProject extends BacklogProject {
  constructor(projectPath, storyId) {
    this.projectPath = projectPath
    this.storyId = storyId
  }
}
