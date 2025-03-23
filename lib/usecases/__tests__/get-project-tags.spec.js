import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTags } from '../get-project-tags';
import { getFreshRepoTestData } from '../../__tests__/helper';
import { createFileSystemProject } from '../../project-factory';
import path from 'path';


// NOTE This is the current best practice to test with a project
describe('get-project-tags', () => {

  let project
  beforeEach( async () => {
    const repoPath = await getFreshRepoTestData('default-cards');
    project = createFileSystemProject({
      path: repoPath,
      loadInstalledPlugins: () => {},
      loadPluginsNotInstalled: () => {}
    });
    await project.init();
    await project.toImdoneJSON();
  });

  afterEach( async () => {
    await project.destroy();
  });

  it('should return a list of tags', async () => {
    // Given
    const filePath = path.join(project.path, 'imdone-readme.md');
    // When
    const tags = await getTags(filePath);
    // Then
    expect(tags.length).to.equal(1);
  });
});