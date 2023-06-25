const fs = require('fs-extra');
const path = require('path');
const {createWatchedFileSystemProject} = require('../../project-factory');
const {saveView} = require('../SaveViewController');
const {View} = require('../../domain/entities/View')

const view = new View({
  name: 'test',
  filter: 'tags=solution',
  lists: [
    {
      hidden: true,
      id: 0,
      name: "What's Due?",
      filter: ""
    },
    {
      hidden: false,
      name: "NOTE"
    },
    {
      hidden: false,
      name: "TODO"
    },
    {
      hidden: false,
      name: "DOING"
    },
    {
      hidden: false,
      ignore: true,
      name: "DONE"
    },
    {
      hidden: false,
      id: 1,
      name: "Recently Completed",
      filter: ""
    }
  ]
})

describe('SaveViewControllerr', () => {
  let project;
  beforeEach(async function() {
    const repoDir = path.join(__dirname,'repos', 'test')
    const tmpDir = path.join(__dirname, '..', '..', '..', 'tmp', 'save-view-controller')
    await fs.remove(tmpDir)
    await fs.copy(repoDir, tmpDir)
    project = createWatchedFileSystemProject(tmpDir)
  })
  
  it('saves a new view in config', async () => {
    await project.init()
    const _id = await saveView(view)
    const _view = project.repo.config.views.find(({id}) => id === _id)
    should(_view).be.ok()
    should(_view.name).be.equal('test')
  })

  it('updates an existing view', async () => {
    await project.init()
    let _id = await saveView(view)
    let _view = project.repo.config.views.find(({id}) => id === _id)
    const name = "new test view"
    _view.name = name
    
    _id = await saveView(_view)
    _view = project.repo.config.views.find(({id}) => id === _id)
    should(_view).be.ok()
    should(_view.name).be.equal(name)
  })

})