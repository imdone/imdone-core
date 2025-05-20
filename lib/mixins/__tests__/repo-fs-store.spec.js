import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getFreshRepoTestData } from '../../__tests__/helper';
import { createWatchedFileSystemProject } from '../../project-factory'

describe("RepoFsStore", () => {
  let defaultCardsRepo,
    defaultCardsProj
    
  beforeEach(async () => {
    defaultCardsProj = createWatchedFileSystemProject({
      path: await getFreshRepoTestData('repo-fs-store-cards'),
      loadPluginsNotInstalled: () => {},
      loadInstalledPlugins: () => {}
    })
    defaultCardsRepo = defaultCardsProj.repo
  })

  afterEach(async () => {
    await  defaultCardsProj.destroy()
  })

  describe('init', () => {
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

    it('should initialize an imdone repo with allow/deny ignores and have tasks', async () => {
      await defaultCardsProj.init()
      const tasks = defaultCardsRepo.getTasks()
      expect(tasks).to.be.an('array')
      expect(tasks.length).to.be.greaterThan(0)
    })
  })
})