import { describe, it, afterEach, expect } from 'vitest'
import { getFreshRepoTestData } from '../../__tests__/helper.js'
import { getCardData } from '../get-card-data.js'
import fs from 'fs'
import path from 'path'

describe('getCardData', function () {
  let repoPath

  afterEach(async () => {
    // Cleanup is handled by the temporary directory structure
    repoPath = null
  })

  describe('successful card data retrieval', () => {
    it('should get card data for a task at a specific line', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      const targetFile = path.join(repoPath, 'imdone-readme.md')
      
      // The first TODO card is on line 22 based on the markdown content
      const cardData = await getCardData({ 
        path: targetFile, 
        line: 22 
      })
      
      expect(cardData).toBeDefined()
      expect(cardData.text).toContain('Get started with imdone')
      expect(cardData.list).toBe('TODO')
      expect(cardData.tags).toContain('getting-started')
    })

    it('should get card data with correct metadata', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      const targetFile = path.join(repoPath, 'imdone-readme.md')
      
      // Get card data for another TODO item
      const cardData = await getCardData({ 
        path: targetFile, 
        line: 32 
      })
      
      expect(cardData).toBeDefined()
      expect(cardData.text).toContain('Imdone supports task lists')
      expect(cardData.list).toBe('TODO')
      expect(cardData.tags).toContain('getting-started')
      expect(cardData.due).toBeDefined()
    })

    it('should get card data for different list types', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      const targetFile = path.join(repoPath, 'imdone-readme.md')
      
      // The TODO card is around line 103
      const cardData = await getCardData({ 
        path: targetFile, 
        line: 101 
      })
      
      expect(cardData).toBeDefined()
      expect(cardData.text).toContain('questions')
      expect(cardData.list).toBe('TODO')
    })

    it('should handle cards with complex metadata', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      const targetFile = path.join(repoPath, 'imdone-readme.md')
      
      // Look for the epic card around line 81
      const cardData = await getCardData({ 
        path: targetFile, 
        line: 81 
      })
      
      expect(cardData).toBeDefined()
      expect(cardData.text).toContain('And finally...')
      expect(cardData.list).toBe('TODO')
      expect(cardData.meta).toBeDefined()
      
      expect(cardData.allMeta['is-epic'][0]).toBe('Getting Started')
    })

    it('should work with different file types', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      
      // Create a JavaScript file with a TODO comment
      const testFile = path.join(repoPath, 'test-file.js')
      const jsContent = `// TODO: This is a JavaScript task
function testFunction() {
  // DOING: Another task in progress  
  console.log('Hello World')
}
`
      fs.writeFileSync(testFile, jsContent)
      
      const cardData = await getCardData({ 
        path: testFile, 
        line: 1 
      })
      
      expect(cardData).toBeDefined()
      expect(cardData.text).toContain('This is a JavaScript task')
      expect(cardData.list).toBe('TODO')
      expect(cardData.source.path).toBe('test-file.js')
    })

    it('should return complete card data structure', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      const targetFile = path.join(repoPath, 'imdone-readme.md')
      
      const cardData = await getCardData({ 
        path: targetFile, 
        line: 22 
      })
      
      expect(cardData).toBeDefined()
      
      // Check all expected properties exist
      expect(cardData).toHaveProperty('text')
      expect(cardData).toHaveProperty('list')
      expect(cardData).toHaveProperty('line')
      expect(cardData).toHaveProperty('id')
      expect(cardData).toHaveProperty('source')
      expect(cardData).toHaveProperty('tags')
      expect(cardData).toHaveProperty('context')
      expect(cardData).toHaveProperty('meta')
      
      // Check source structure
      expect(cardData.source).toHaveProperty('path')
      expect(cardData.source).toHaveProperty('repoId')
      expect(cardData.source.path).toBe('imdone-readme.md')
    })

    it('should flatten nested values correctly', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      
      // Create a file with complex nested metadata
      const testFile = path.join(repoPath, 'nested-test.md')
      const content = `## #TODO: Test nested arrays
+important +urgent
authors:Jesse
single:solo
`
      fs.writeFileSync(testFile, content)
      
      const cardData = await getCardData({ 
        path: testFile, 
        line: 1 
      })
      
      expect(cardData).toBeDefined()
      
      // Test basic properties
      expect(cardData.text).toBe('Test nested arrays')
      expect(cardData.list).toBe('TODO')
      
      // Test array flattening for tags
      expect(cardData.tags).toBe('["important","urgent"]')
      expect(cardData['tags.0']).toBe('important')
      expect(cardData['tags.1']).toBe('urgent')
      
      // Test object flattening for meta
      expect(cardData.meta).toMatch(/^\{.*\}$/) // Should be JSON string
      expect(cardData['meta.authors']).toBe('["Jesse"]')
      expect(cardData['meta.authors.0']).toBe('Jesse')
      expect(cardData['meta.single']).toBe('["solo"]')
      expect(cardData['meta.single.0']).toBe('solo')
      
      // Test object flattening for source
      expect(cardData.source).toMatch(/^\{.*\}$/) // Should be JSON string
      expect(cardData['source.path']).toBe('nested-test.md')
      expect(cardData['source.ext']).toBe('md')
      expect(cardData['source.type']).toBe('File')
      
      // Test object flattening for totals
      expect(cardData.totals).toMatch(/^\{.*\}$/) // Should be JSON string
      expect(cardData['totals.TODO']).toBe(1)
      expect(cardData['totals.DOING']).toBe(0)
      expect(cardData['totals.DONE']).toBe(0)
      
      // Test object flattening for progress
      expect(cardData.progress).toMatch(/^\{.*\}$/) // Should be JSON string
      expect(cardData['progress.completed']).toBe(0)
      expect(cardData['progress.total']).toBe(0)
      
      // Test metaKeys array flattening
      expect(cardData.metaKeys).toMatch(/^\[.*\]$/) // Should be JSON array string
      expect(cardData['metaKeys.0']).toBe('authors')
      expect(cardData['metaKeys.1']).toBe('single')
      
    })
  })

  describe('error handling', () => {
    it('should throw error when file does not exist', async function () {
      const nonExistentFile = '/nonexistent/path/file.md'
      
      await expect(getCardData({ 
        path: nonExistentFile, 
        line: 1 
      })).rejects.toThrow()
    })

    it('should handle when no card exists at the specified line', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      const targetFile = path.join(repoPath, 'imdone-readme.md')
      
      // Line 1 should not have a card
      await expect(getCardData({ 
        path: targetFile, 
        line: 1 
      })).rejects.toThrow()
    })

    it('should handle invalid line numbers', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      const targetFile = path.join(repoPath, 'imdone-readme.md')
      
      // Test with negative line number
      await expect(getCardData({ 
        path: targetFile, 
        line: -1 
      })).rejects.toThrow()
      
      // Test with line number beyond file length
      await expect(getCardData({ 
        path: targetFile, 
        line: 9999 
      })).rejects.toThrow()
    })

    it('should validate required parameters', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      const targetFile = path.join(repoPath, 'imdone-readme.md')
      
      // Test missing path
      await expect(getCardData({ 
        line: 22 
      })).rejects.toThrow()
      
      // Test missing line
      await expect(getCardData({ 
        path: targetFile 
      })).rejects.toThrow()
      
      // Test empty parameters
      await expect(getCardData({})).rejects.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle files with no cards', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      
      // Create a file with no imdone cards
      const emptyFile = path.join(repoPath, 'empty-file.md')
      fs.writeFileSync(emptyFile, '# Just a regular markdown file\n\nNo tasks here.')
      
      await expect(getCardData({ 
        path: emptyFile, 
        line: 2 
      })).rejects.toThrow()
    })

    it('should handle cards with minimal metadata', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      
      // Create a file with a simple TODO
      const simpleFile = path.join(repoPath, 'simple-todo.md')
      fs.writeFileSync(simpleFile, '## [Simple task](#TODO:)\nJust a basic task.')
      
      const cardData = await getCardData({ 
        path: simpleFile, 
        line: 1 
      })
      
      expect(cardData).toBeDefined()
      expect(cardData.text).toContain('Simple task')
      expect(cardData.list).toBe('TODO')
      expect(cardData.tags).toEqual([])
      expect(cardData.meta).toEqual({})
    })

    it('should handle cards with special characters in text', async function () {
      repoPath = await getFreshRepoTestData('default-cards')
      
      // Create a file with special characters
      const specialFile = path.join(repoPath, 'special-chars.md')
      fs.writeFileSync(specialFile, '## [Task with émojis 🚀 and spëcial chars](#TODO:)\nTesting unicode support.')
      
      const cardData = await getCardData({ 
        path: specialFile, 
        line: 1 
      })
      
      expect(cardData).toBeDefined()
      expect(cardData.text).toContain('émojis 🚀 and spëcial chars')
      expect(cardData.list).toBe('TODO')
    })
  })
})