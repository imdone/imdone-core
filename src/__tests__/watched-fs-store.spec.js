import { describe, it, expect, beforeEach, afterEach  } from 'vitest';
import path from 'path';
import { getFreshRepoTestData } from './helper';
import { load, dump } from 'js-yaml';
import { readFileSync, writeFileSync, existsSync, promises } from 'fs';
import Diff from 'diff';
import eol from 'eol';
import { createWatchedFileSystemProject } from '../project-factory'


describe('WatchedFsStore', () => {
  let repo,
    proj,
    defaultCardsRepo,
    defaultCardsProj
    
  beforeEach(async () => {
    const opts = {
      loadPluginsNotInstalled: () => {},
      loadInstalledPlugins: () => {}
    }

    proj = createWatchedFileSystemProject({
      path: await getFreshRepoTestData(),
      ...opts
    })
    repo = proj.repo
    defaultCardsProj = createWatchedFileSystemProject({
      path: await getFreshRepoTestData('default-cards-metaSep'),
      ...opts
    })
    defaultCardsRepo = defaultCardsProj.repo
  })

  afterEach( () => {
    proj.destroy()
    defaultCardsProj.destroy()
  })

  describe('init', function () {
    it("should initialize an imdone repo and emit it's lists", async () => {
      return new Promise(async (resolve, reject) => {
        defaultCardsRepo.on('initialized', ({ ok, lists }) => {
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
  })
})
