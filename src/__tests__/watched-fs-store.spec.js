import { describe, it, expect, beforeEach, afterEach  } from 'vitest';
import path from 'path';
import { getFreshRepo } from './helper';
import Repository from '../repository';
import WatchedFsStore from '../mixins/repo-watched-fs-store';
import { load, dump } from 'js-yaml';
import { readFileSync, writeFileSync, existsSync, promises } from 'fs';
import Diff from 'diff';
import eol from 'eol';
import Project from '../project';
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
      path: await getFreshRepo(),
      ...opts
    })
    repo = proj.repo
    defaultCardsProj = createWatchedFileSystemProject({
      path: await getFreshRepo('default-cards-metaSep'),
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
        repo.on('initialized', ({ ok, lists }) => {
          if (ok) {
            expect(lists).to.be.an('object')
            resolve()
          } else {
            reject()
          }
        })
        await proj.init()
      })
    })
  })
  describe('watcher', function () {
    it.skip('should reload config and update metaSep', function (done) {
      defaultCardsRepo.once('config.update', ({ file }) => {
        const expected = readFileSync(
          path.join(process.cwd(), 'test', 'files', 'imdone-readme-metaSep.md')
        )
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
          .join(eol.lf)
        const filePath = defaultCardsRepo.getFullPath(
          defaultCardsRepo.getFile('imdone-readme.md')
        )
        const content = readFileSync(filePath)
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
          .join(eol.lf)
        const diff = Diff.diffChars(expected, content)
        if (content !== expected) {
          diff.forEach((part) => {
            // green for additions, red for deletions
            // grey for common parts
            const color = part.added ? 'green' : part.removed ? 'red' : 'grey'
            process.stderr.write(part.value[color])
          })
        }
        expect(content === expected).to.be(true)
        done()
      })
      defaultCardsProj.init(() => {
        console.log(defaultCardsRepo.initializingWatcher)
        const configPath = defaultCardsRepo.getFullPath(
          defaultCardsRepo.getFile('.imdone/config.yml')
        )
        const config = load(readFileSync(configPath).toString())
        config.settings.cards.metaSep = '::'
        config.keepEmptyPriority = true
        writeFileSync(configPath, dump(config))
      })
    })
    it('should reload config and do nothing if metaSep is incorrect', function (done) {
      let filePath
      defaultCardsRepo.once('config.update', (data) => {
        const expected = readFileSync(
          path.join(
            process.cwd(),
            'test',
            'files',
            'imdone-readme-default-metaSep.md'
          )
        )
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
          .join(eol.lf)
        const filePath = defaultCardsRepo.getFullPath(
          defaultCardsRepo.getFile('imdone-readme.md')
        )
        const content = readFileSync(filePath)
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
          .join(eol.lf)
        const diff = Diff.diffChars(expected, content)
        if (content !== expected) {
          diff.forEach((part) => {
            // green for additions, red for deletions
            // grey for common parts
            const color = part.added ? 'green' : part.removed ? 'red' : 'grey'
            process.stderr.write(part.value[color])
          })
        }
        expect(content === expected).to.be(true)
        done()
      })
      defaultCardsProj.init(() => {
        filePath = defaultCardsRepo.getFullPath(
          defaultCardsRepo.getFile('imdone-readme.md')
        )
        expected = readFileSync(filePath)
          .toString()
          .split(eol.lf)
          .filter((l, i) => i !== 23)
        const configFile = path.join('.imdone', 'config.yml')
        const configPath = defaultCardsRepo.getFullPath(
          defaultCardsRepo.getFile(configFile)
        )
        const config = load(readFileSync(configPath).toString())
        config.settings.cards.metaSep = ':test:'
        config.keepEmptyPriority = true
        promises.writeFile(configPath, dump(config))
      })
    })
  })
})
