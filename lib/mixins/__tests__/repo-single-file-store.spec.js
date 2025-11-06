import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { getFreshRepoTestData } from '../../__tests__/helper.js'
import { createFileSystemProjectWithFile } from '../../project-factory.js'

describe('singleFileStoreMixin', function () {
  let project, repo

  beforeEach(async () => {
    // Use the helper to get fresh test data
    const repoPath = await getFreshRepoTestData('repo-fs-store-cards')
    const targetFile = `${repoPath}/imdone-readme.md`
    
    project = await createFileSystemProjectWithFile({
      path: repoPath,
      filePath: targetFile,
      loadPluginsNotInstalled: () => {},
      loadInstalledPlugins: () => {}
    })
    repo = project.repo
  })

  afterEach(async () => {
    if (project) {
      await project.destroy()
    }
  })

  describe('getFilesInPath', () => {
    it('should return only the specified file when file exists', async function () {
      await project.init()
      const files = await repo.getFilesInPath(false)
      
      expect(files).toHaveLength(1)
      expect(files[0].path).toBe('imdone-readme.md')
      expect(files[0].repoId).toBe(repo.getId())
    })

    it('should work with different file types', async function () {
      const repoPath = await getFreshRepoTestData('files')
      const targetFile = `${repoPath}/descriptions.js`
      
      const testProject = await createFileSystemProjectWithFile({
        path: repoPath,
        filePath: targetFile,
        loadPluginsNotInstalled: () => {},
        loadInstalledPlugins: () => {}
      })
      await testProject.init()
      
      const files = await testProject.repo.getFilesInPath(false)
      expect(files).toHaveLength(1)
      expect(files[0].path).toBe('descriptions.js')
      
      await testProject.destroy()
    })
  })

  describe('getAllFilePaths', () => {
    it('should return only the target file path', async function () {
      await project.init()
      const files = project.getFiles()
      
      expect(files).toHaveLength(1)
      expect(files[0].path).toContain('imdone-readme.md')
    })
  })

  describe('integration with project functionality', () => {
    it('should initialize a project with only one file and have tasks', async function () {
      await project.init()
      
      const files = project.getFiles()
      expect(files).toHaveLength(1)
      
      const tasks = project.getCards()
      expect(tasks).toBeInstanceOf(Array)
      
      // All tasks should come from the single file
      tasks.forEach(task => {
        expect(task.source.path).toBe('imdone-readme.md')
      })
    })

    it('should preserve all base functionality', async function () {
      await project.init()
      
      // Test that basic repo methods still work
      expect(typeof repo.readFileContent).toBe('function')
      expect(typeof repo.writeFile).toBe('function')
      expect(typeof repo.getFullPath).toBe('function')
      expect(typeof repo.getRelativePath).toBe('function')
      expect(typeof repo.shouldInclude).toBe('function')
    })

    it('should be able to read the target file content', async function () {
      await project.init()
      
      const files = await repo.getFilesInPath(false)
      expect(files).toHaveLength(1)
      
      const file = files[0]
      await repo.readFileContent(file)
      
      expect(file.content).toBeDefined()
      expect(typeof file.content).toBe('string')
      expect(file.content.length).toBeGreaterThan(0)
    })
  })
})