import { describe, it, expect, beforeEach, afterEach  } from 'vitest';
import { getFreshRepoTestData } from './helper';
import { createWatchedFileSystemProject } from '../project-factory'
import { appendFile } from 'fs/promises';
import { setTimeout } from 'timers/promises';


describe('WatchedFsStore', () => {
  let defaultCardsRepo,
    defaultCardsProj
    
  beforeEach(async () => {
    defaultCardsProj = createWatchedFileSystemProject({
      path: await getFreshRepoTestData('default-cards-metaSep'),
      loadPluginsNotInstalled: () => {},
      loadInstalledPlugins: () => {}
    })
    defaultCardsRepo = defaultCardsProj.repo
  })

  afterEach(async () => {
    await  defaultCardsProj.destroy()
  })

  describe('init', function () {
    it("should initialize an imdone repo and emit it's lists", async () => {
      return new Promise(async (resolve, reject) => {
        defaultCardsRepo.on('watching', ({ ok, lists }) => {
          if (ok) {
            try {
              expect(lists).to.be.an('array')
              resolve()
            } catch (err) {
              reject(err)
            }
          } else {
            reject()
          }
        })
        try {
          await defaultCardsProj.init()
        } catch (err) {
          reject(err)
        }
      })
    })
  })
  describe('watcher', function () {
    it('should detect changes to a task in a file and update the task', async () => {
      return new Promise(async (resolve, reject) => {
        defaultCardsRepo.on('watch.all', async (path) => {
          console.log('watch.all', path)
        });
        defaultCardsRepo.on('file.update', (file) => {
          try {
            expect(file).to.be.an('object')
            resolve()
          } catch (err) {
            reject(err)
          }
        })
        try {
          await defaultCardsProj.init()
          const task = defaultCardsRepo.getTasks()[0]
          const file = defaultCardsRepo.getFileForTask(task)
          expect(task).to.be.an('object')
          expect(file).to.be.an('object')
          await setTimeout(500)
          await appendFile(file.getFullPath(), '\n\n\n#TODO This is a test test:watcher-test\n')
          console.log('Appended to file:', file.getFullPath())
        } catch (err) {
          reject(err)
        }
      })
    })
  })
})
