import { describe, it, afterEach, expect } from 'vitest'
import { getFreshRepoTestData } from '../../__tests__/helper.js'
import { getProjectWithFile } from '../get-project-with-file.js'
import fs from 'fs'
import path from 'path'

describe('getProjectWithFile', function () {
  let project
  const loadPluginsNotInstalled = () => {};
  const loadInstalledPlugins = () => {}


  afterEach(async () => {
    if (project) {
      await project.destroy()
      project = null
    }
  })

  describe('successful project creation', () => {
    it('should create a project with only the specified file', async function () {
      const repoPath = await getFreshRepoTestData('default-cards')
      const targetFile = path.join(repoPath, 'imdone-readme.md')
      
      project = await getProjectWithFile(targetFile);//, { loadInstalledPlugins, loadPluginsNotInstalled })
      expect(project).toBeDefined()
      
      await project.init()
      
      // Verify that only one file is loaded
      const files = project.getFiles()
      expect(files).toHaveLength(1)
      expect(files[0].path).toBe('imdone-readme.md')
    })

    it('should load tasks from the specified file only', async function () {
      const repoPath = await getFreshRepoTestData('default-cards')
      const targetFile = path.join(repoPath, 'imdone-readme.md')

      project = await getProjectWithFile(targetFile, { loadInstalledPlugins, loadPluginsNotInstalled })
      await project.init()
      
      const tasks = project.getCards()

      // expect(json.files).toHaveLength(1)
      
      // Verify all tasks come from the target file
      tasks.forEach(task => {
        expect(task.source.path).toBe('imdone-readme.md')
      })
      
      // Verify we have some tasks (the readme should contain imdone tasks)
      expect(tasks.length).toBeGreaterThan(0)
    })

    it('should create a valid project that can perform normal operations', async function () {
      const repoPath = await getFreshRepoTestData('default-cards')
      const targetFile = path.join(repoPath, 'imdone-readme.md')

      project = await getProjectWithFile(targetFile, { loadInstalledPlugins, loadPluginsNotInstalled })
      await project.init()
      
      // Test basic project functionality
      expect(typeof project.getFiles).toBe('function')
      expect(typeof project.getCards).toBe('function')
      expect(typeof project.getLists).toBe('function')
      expect(typeof project.toImdoneJSON).toBe('function')
      
      // Test that project methods work
      const lists = project.getLists()
      expect(Array.isArray(lists)).toBe(true)
      
      const imdoneJson = await project.toImdoneJSON()
      expect(imdoneJson).toBeDefined()
      expect(imdoneJson.lists).toBeDefined()
    })

    it('should respect the project configuration', async function () {
      const repoPath = await getFreshRepoTestData('default-cards')
      const targetFile = path.join(repoPath, 'imdone-readme.md')

      project = await getProjectWithFile(targetFile, { loadInstalledPlugins, loadPluginsNotInstalled })
      await project.init()
      
      // The default-cards repo has a config, verify it's loaded
      const config = project.config
      expect(config).toBeDefined()
      
      // Verify repo path is correct
      expect(project.repo.path).toBe(repoPath)
    })

    it('should work with different file types', async function () {
      const repoPath = await getFreshRepoTestData('default-cards')
      
      // Create a simple test file with tasks
      const testFile = path.join(repoPath, 'test-tasks.js')
      fs.writeFileSync(testFile, `
// TODO: This is a test task
function testFunction() {
  // DOING: Another task in progress
  console.log('Hello World')
}
`)

      project = await getProjectWithFile(testFile, { loadInstalledPlugins, loadPluginsNotInstalled })
      await project.init()
      
      const files = project.getFiles()
      expect(files).toHaveLength(1)
      expect(files[0].path).toBe('test-tasks.js')
      
      const tasks = project.getCards()
      expect(tasks.length).toBeGreaterThanOrEqual(2) // Should find TODO and DOING tasks
    })
  })

  describe('error handling', () => {
    it('should throw error when project path is not found', async function () {
      const targetFile = '/nonexistent/path/file.js'

      await expect(getProjectWithFile(targetFile)).rejects.toThrow()
    })
  })
})