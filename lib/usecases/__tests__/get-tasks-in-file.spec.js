import { describe, it, expect } from 'vitest'
import { getTasks } from '../get-tasks-in-file'
import { getFreshRepoTestData } from '../../__tests__/helper'
import fs from 'fs'
import path from 'path'

describe('get-tasks-in-file', () => {
  it('should return tasks', async () => {
    const repoDir = await getFreshRepoTestData('default-cards')
    const filePath = path.join(repoDir, 'imdone-readme.md')
    const content = await fs.promises.readFile(filePath, 'utf8')
    const tasks = await getTasks({filePath, content})
    expect(tasks.length).to.equal(14)
  })
})