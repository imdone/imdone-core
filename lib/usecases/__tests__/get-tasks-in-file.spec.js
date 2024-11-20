const expect = require('expect.js')
const { getTasks } = require('../get-tasks-in-file')
const { getFreshRepo } = require('../../../test/helper')
const fs = require('fs')
const path = require('path')

describe('get-tasks-in-file', () => {
  it('should return tasks', async () => {
    const repoDir = getFreshRepo('default-cards')
    const filePath = path.join(repoDir, 'imdone-readme.md')
    const content = await fs.promises.readFile(filePath, 'utf8')
    const tasks = await getTasks({filePath, content})
    expect(tasks.length).to.be(14)
  })
})