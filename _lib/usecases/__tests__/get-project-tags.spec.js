const expect = require('expect.js');
const path = require('path');
const {
  getFreshRepo
} = require('../../../test/helper')
const {
  getTags
} = require('../get-project-tags.js')

const { createFileSystemProject } = require('../../project-factory.js')

// NOTE This is the current best practice to test with a project
describe('get-project-tags', () => {
  it('should return a list of tags', async () => {
    // Given
    const repoPath = getFreshRepo('default-cards');
    const project = createFileSystemProject({ 
      path: repoPath,
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {} 
    });
    await project.init();
    await project.toImdoneJSON();
    const filePath = path.join(repoPath, 'imdone-readme.md');
    // When
    const tags = await getTags(filePath);
    // Then
    expect(tags.length).to.be(1);
  });
});